import { cn } from "@/lib/cn";
import type { SkillCategory } from "@/lib/agency/types";

const LABELS: Record<SkillCategory, string> = {
  engineering: "Engineering",
  design: "Design",
  content: "Content",
  ops: "Ops",
  research: "Research",
};

const CLASSES: Record<SkillCategory, string> = {
  engineering:
    "bg-[color-mix(in_oklab,#3B82F6_18%,transparent)] text-[#7a9bff] ring-[color-mix(in_oklab,#3B82F6_28%,transparent)]",
  design:
    "bg-[color-mix(in_oklab,#8B5CF6_18%,transparent)] text-[#b497ff] ring-[color-mix(in_oklab,#8B5CF6_28%,transparent)]",
  content:
    "bg-[color-mix(in_oklab,#F59E0B_18%,transparent)] text-amber-300 ring-[color-mix(in_oklab,#F59E0B_28%,transparent)]",
  ops: "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]",
  research:
    "bg-[color-mix(in_oklab,#f43f5e_18%,transparent)] text-rose-300 ring-[color-mix(in_oklab,#f43f5e_28%,transparent)]",
};

export function CategoryPill({
  category,
  className,
}: {
  category: SkillCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ring-1",
        CLASSES[category],
        className,
      )}
    >
      {LABELS[category]}
    </span>
  );
}
