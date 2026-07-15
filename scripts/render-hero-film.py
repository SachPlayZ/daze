#!/usr/bin/env python3
"""Render subtle localized movement from the generated Daze hero frame."""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np


WIDTH = 1600
HEIGHT = 900
FPS = 30
DURATION_SECONDS = 7


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("mp4", type=Path)
    parser.add_argument("webm", type=Path)
    return parser.parse_args()


def crop_and_resize(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    target_ratio = WIDTH / HEIGHT
    ratio = width / height

    if ratio > target_ratio:
        cropped_width = round(height * target_ratio)
        offset = (width - cropped_width) // 2
        image = image[:, offset : offset + cropped_width]
    else:
        cropped_height = round(width / target_ratio)
        offset = (height - cropped_height) // 2
        image = image[offset : offset + cropped_height, :]

    return cv2.resize(image, (WIDTH, HEIGHT), interpolation=cv2.INTER_LANCZOS4)


def gaussian_mask(
    grid_x: np.ndarray,
    grid_y: np.ndarray,
    center_x: float,
    center_y: float,
    sigma_x: float,
    sigma_y: float,
) -> np.ndarray:
    return np.exp(
        -(
            ((grid_x - center_x) ** 2) / (2 * sigma_x**2)
            + ((grid_y - center_y) ** 2) / (2 * sigma_y**2)
        )
    ).astype(np.float32)


def open_mp4_encoder(output: Path) -> subprocess.Popen[bytes]:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "27",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output),
    ]
    return subprocess.Popen(command, stdin=subprocess.PIPE)


def render(source: np.ndarray, mp4: Path) -> None:
    grid_y, grid_x = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)

    # Soft regions isolate the two hands, lifted boot, and a tiny torso breath.
    left_hand = gaussian_mask(grid_x, grid_y, 1000, 155, 64, 92)
    right_hand = gaussian_mask(grid_x, grid_y, 1510, 90, 72, 108)
    lifted_foot = gaussian_mask(grid_x, grid_y, 1300, 555, 88, 118)
    torso = gaussian_mask(grid_x, grid_y, 1260, 190, 180, 210)

    encoder = open_mp4_encoder(mp4)
    assert encoder.stdin is not None
    frame_count = FPS * DURATION_SECONDS

    try:
        for frame_index in range(frame_count):
            phase = 2 * math.pi * frame_index / (frame_count - 1)
            slow = math.sin(phase)
            secondary = math.sin(phase * 2)

            displacement_x = (
                left_hand * (-3.0 * secondary)
                + right_hand * (3.5 * secondary)
                + lifted_foot * (5.5 * secondary)
            )
            displacement_y = (
                left_hand * (8.0 * slow)
                + right_hand * (-10.0 * slow)
                + lifted_foot * (-12.0 * slow)
                + torso * (-2.0 * slow)
            )

            frame = cv2.remap(
                source,
                grid_x - displacement_x,
                grid_y - displacement_y,
                interpolation=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REFLECT_101,
            )
            encoder.stdin.write(frame.tobytes())
    finally:
        encoder.stdin.close()

    if encoder.wait() != 0:
        raise RuntimeError("MP4 encoding failed")


def encode_webm(mp4: Path, webm: Path) -> None:
    webm.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(mp4),
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-crf",
            "35",
            "-b:v",
            "0",
            "-deadline",
            "good",
            "-cpu-used",
            "3",
            "-row-mt",
            "1",
            str(webm),
        ],
        check=True,
    )


def main() -> None:
    args = parse_args()
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required")

    image = cv2.imread(str(args.input), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Could not read {args.input}")

    source = crop_and_resize(image)
    render(source, args.mp4)
    encode_webm(args.mp4, args.webm)


if __name__ == "__main__":
    main()
