"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useCursorGlow } from "@/lib/use-cursor-glow";

interface GlowCTAProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary-orange" | "outline";
  className?: string;
}

export function GlowCTA({
  href,
  children,
  variant = "primary-orange",
  className,
}: GlowCTAProps) {
  const ref = useCursorGlow<HTMLAnchorElement>();
  return (
    <Button
      asChild
      variant={variant}
      size="lg"
      className={cn("glow-cta w-full rounded-[8px]", className)}
    >
      <a ref={ref} href={href}>
        {children}
      </a>
    </Button>
  );
}
