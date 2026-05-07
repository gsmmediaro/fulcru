import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type LogoVariant = "horizontal" | "icon" | "icon-transparent";

export function Logo({
  className,
  showWordmark = true,
  variant,
  size,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  showWordmark?: boolean;
  variant?: LogoVariant;
  size?: number;
  /** @deprecated kept for prop-compat with old call-sites; ignored. */
  wordmarkClassName?: string;
}) {
  const resolved: LogoVariant = variant ?? (showWordmark ? "horizontal" : "icon");
  const isHorizontal = resolved === "horizontal";
  const px = size ?? (isHorizontal ? 32 : 32);

  if (isHorizontal) {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        aria-label="Fulcru"
        {...props}
      >
        <Image
          src="/brand/fulcru-header.png"
          alt="Fulcru"
          width={300}
          height={100}
          priority
          style={{ height: px, width: "auto" }}
          className="select-none"
        />
      </div>
    );
  }

  const src =
    resolved === "icon-transparent"
      ? "/brand/fulcru-icon-transparent.png"
      : "/brand/fulcru-icon.png";

  return (
    <div
      className={cn("inline-flex", className)}
      aria-label="Fulcru"
      {...props}
    >
      <Image
        src={src}
        alt="Fulcru"
        width={px}
        height={px}
        priority
        className={cn(
          "select-none",
          resolved === "icon" && "rounded-[8px]",
        )}
      />
    </div>
  );
}
