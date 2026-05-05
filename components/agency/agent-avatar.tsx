import { cn } from "@/lib/cn";

const PALETTE = [
  { bg: "#FF7A1A", fg: "#1c1c1c" },
  { bg: "#3B82F6", fg: "#0b1f21" },
  { bg: "#10B981", fg: "#0b1f21" },
  { bg: "#8B5CF6", fg: "#f5f3ff" },
  { bg: "#F43F5E", fg: "#1c1c1c" },
  { bg: "#22D3EE", fg: "#0b1f21" },
  { bg: "#FBBF24", fg: "#1c1c1c" },
  { bg: "#A855F7", fg: "#f5f3ff" },
];

function hash(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsFor(name: string) {
  const cleaned = name.replace(/[-_]/g, " ").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AgentAvatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const palette = PALETTE[hash(name) % PALETTE.length];
  const initials = initialsFor(name);
  const fontSize = Math.round(size * 0.42);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: palette.bg,
        color: palette.fg,
        fontSize,
        lineHeight: 1,
        letterSpacing: "0.02em",
      }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
