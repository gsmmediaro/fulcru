import { cn } from "@/lib/cn";

export function ClientAvatar({
  initials,
  accentColor,
  size = 56,
  className,
}: {
  initials: string;
  accentColor: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[12px] font-semibold tracking-tight ring-1",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in oklab, ${accentColor} 22%, #1a1a1a)`,
        color: accentColor,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accentColor} 35%, transparent)`,
        fontSize: Math.round(size * 0.34),
      }}
    >
      {initials}
    </span>
  );
}
