"use client";

import * as React from "react";

export function useCursorGlow<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return ref;
}
