"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    function cleanup() {
      document.removeEventListener("pointerdown", startFilm);
      document.removeEventListener("keydown", startFilm);
    }

    function addInteractionFallback() {
      document.addEventListener("pointerdown", startFilm, { passive: true });
      document.addEventListener("keydown", startFilm);
    }

    function startFilm() {
      cleanup();
      void video?.play().catch(addInteractionFallback);
    }

    startFilm();
    return cleanup;
  }, []);

  function resetFilm() {
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    setStarted(false);
  }

  function handlePlay() {
    const video = videoRef.current;
    if (video && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    setStarted(true);
  }

  return (
    <figure className="hero-film" data-started={started}>
      <video
        ref={videoRef}
        className="hero-film-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/brand/daze-football-hero-poster-v1.jpg"
        tabIndex={-1}
        aria-hidden="true"
        onPlay={handlePlay}
        onEnded={resetFilm}
      >
        <source src="/brand/daze-football-hero-film-v2.webm" type="video/webm" />
        <source src="/brand/daze-football-hero-film-v2.mp4" type="video/mp4" />
      </video>
      <Image
        className="hero-film-poster"
        src="/brand/daze-football-hero-poster-v1.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 1180px) 100vw, 1180px"
      />
    </figure>
  );
}
