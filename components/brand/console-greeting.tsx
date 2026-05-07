"use client";

import * as React from "react";

export function ConsoleGreeting() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __fulcru_greeted?: boolean };
    if (w.__fulcru_greeted) return;
    w.__fulcru_greeted = true;

    const title = "%c  Fulcru  %c  Bill the leverage.  ";
    const titleStyle =
      "background:#19bdc8;color:#0b1f21;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;letter-spacing:0.04em;";
    const messageStyle =
      "background:#232323;color:#c6c6c6;padding:4px 10px;border-radius:0 4px 4px 0;font-weight:500;";

    console.log(title, titleStyle, messageStyle);
    console.log(
      "%cMCP descriptor live at /api/mcp · skill at skills/fulcru/SKILL.md",
      "color:#8a8a8a;font-size:12px;",
    );
  }, []);

  return null;
}
