"use client";

import * as React from "react";

export function useCountUp(target: number, durationMs = 520) {
  const [value, setValue] = React.useState(target);
  const prev = React.useRef(target);
  const raf = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setValue(target);
      prev.current = target;
      return;
    }

    const from = prev.current;
    const to = target;
    const start = performance.now();

    if (raf.current != null) cancelAnimationFrame(raf.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out-expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(from + (to - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}
