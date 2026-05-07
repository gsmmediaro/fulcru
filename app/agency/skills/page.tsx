import { RiSparkling2Line } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { CategoryPill } from "@/components/agency/category-pill";
import { NewSkillButton } from "@/components/agency/new-skill-modal";
import { EmptyState } from "@/components/agency/empty-state";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export default async function SkillsPage() {
  const { t } = await getT();
  const api = await getApi();
  const skills = await api.listSkills();
  const totalSkills = skills.length;
  const avgBaseline =
    skills.reduce((s, sk) => s + sk.baselineHours, 0) / Math.max(totalSkills, 1);
  const avgRate =
    skills.reduce((s, sk) => s + sk.rateModifier, 0) / Math.max(totalSkills, 1);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiSparkling2Line size={20} />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {t("skills.title")}
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("skills.subtitle")}
            </p>
          </div>
        </div>
        <NewSkillButton />
      </div>

      {totalSkills === 0 ? (
        <div className="enter-stagger mt-[24px]">
          <EmptyState
            icon={<RiSparkling2Line size={22} />}
            title={t("skills.empty.title")}
            description={t("skills.empty.body")}
            action={<NewSkillButton />}
          />
        </div>
      ) : (
        <>
      <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        <Stat label={t("skills.totalSkills")} value={`${totalSkills}`} />
        <Stat
          label={t("skills.avgBaseline")}
          value={`${avgBaseline.toFixed(1)}h`}
        />
        <Stat
          label={t("skills.avgRate")}
          value={`${avgRate.toFixed(2)}×`}
        />
      </div>

      <div className="enter-stagger mt-[20px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((sk) => (
          <article
            key={sk.id}
            className={cn(
              "flex flex-col gap-[12px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
              "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
              "hover:ring-[var(--color-stroke-sub)]",
            )}
          >
            <div className="flex items-center justify-between">
              <CategoryPill category={sk.category} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-strong)]">
                {sk.name}
              </h3>
              <p className="mt-[4px] line-clamp-2 text-[13px] text-[var(--color-text-soft)]">
                {sk.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {sk.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex rounded-[4px] bg-[color-mix(in_oklab,white_4%,transparent)] px-[8px] py-[2px] text-[11px] text-[var(--color-text-sub)] ring-1 ring-[var(--color-stroke-soft)]"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-auto flex items-end justify-between border-t border-[var(--color-stroke-soft)] pt-[14px]">
              <div>
                <div className="text-[22px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                  {sk.baselineHours}h
                </div>
                <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                  {t("skills.baseline")}
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-semibold ring-1",
                  "bg-[var(--color-brand-100)] text-[var(--color-brand-400)] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
                  "tabular-nums",
                )}
              >
                {t("skills.rate", { x: sk.rateModifier.toFixed(2) })}
              </span>
            </div>
          </article>
        ))}
      </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[var(--color-bg-surface)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {label}
      </div>
      <div className="mt-[6px] text-[24px] font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
    </div>
  );
}
