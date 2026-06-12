"use client";

import { useEffect, useState } from "react";

export function Typewriter({
  text,
  speed = 28,
  startDelay = 200,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown("");
    setDone(false);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const start = setTimeout(function tick() {
      i++;
      setShown(text.slice(0, i));
      if (i < text.length) {
        timer = setTimeout(tick, speed);
      } else {
        setDone(true);
        onDone?.();
      }
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span className={className}>
      {shown}
      <span className={`ml-0.5 inline-block w-[2px] -translate-y-0.5 bg-current align-middle ${done ? "animate-pulse" : ""}`} style={{ height: "1em" }} />
    </span>
  );
}
