import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "tp-headline-m",
        "tp-headline-s",
        "tp-headline-xs",
        "tp-body-m",
        "tp-body-s",
        "tp-body-xs",
        "tp-label-m",
        "tp-label-s",
        "tp-overline",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
