import Image from "next/image";

export function DazeWordmark() {
  return (
    <span className="wordmark" role="img" aria-label="Daze">
      <Image src="/brand/daze-wordmark-ink.png" alt="" fill sizes="110px" className="wordmark-light" />
      <Image src="/brand/daze-wordmark-cream.png" alt="" fill sizes="110px" className="wordmark-dark" />
    </span>
  );
}
