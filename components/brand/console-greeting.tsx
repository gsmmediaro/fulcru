"use client";

import * as React from "react";

export function ConsoleGreeting() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as unknown as { __ipr_greeted?: boolean }).__ipr_greeted) {
      return;
    }
    (window as unknown as { __ipr_greeted?: boolean }).__ipr_greeted = true;

    const title =
      "%c  IPRoyal  %c  Reading the console already? We like that.  ";
    const titleStyle =
      "background:#19bdc8;color:#0b1f21;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;letter-spacing:0.04em;";
    const messageStyle =
      "background:#232323;color:#c6c6c6;padding:4px 10px;border-radius:0 4px 4px 0;font-weight:500;";

    console.log(title, titleStyle, messageStyle);
    console.log(
      "%cBuilding with proxies? Our docs live at https://docs.iproyal.com",
      "color:#8a8a8a;font-size:12px;",
    );
  }, []);

  return null;
}
