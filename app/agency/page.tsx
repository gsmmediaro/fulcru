import Link from "next/link";
import {
  RiPulseLine,
  RiBarChartBoxLine,
  RiShieldCheckLine,
  RiBriefcase4Line,
  RiFolder3Line,
  RiSparkling2Line,
  RiBillLine,
  RiCheckLine,
  RiPlugLine,
  RiArrowRightUpLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ConnectMcpButton } from "@/components/agency/connect-mcp-modal";
import { getApi } from "@/lib/agency/server-api";
import { formatCurrency } from "@/lib/agency/format";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export default async function AgencyHomePage() {
  const { t } = await getT();
  const api = await getApi();
  const [summary, leverage30] = await Promise.all([
    api.dashboardSummary(),
    api.leverage(30),
  ]);

  const cards: HeroCardProps[] = [
    {
      icon: RiPulseLine,
      title: t("nav.runs"),
      eyebrow: t("home.runs.eyebrow", {
        active: summary.activeRuns,
        total: summary.totalRuns,
      }),
      bullets: [t("home.runs.b1"), t("home.runs.b2"), t("home.runs.b3")],
      href: "/agency/runs",
      cta: t("home.runs.cta"),
    },
    {
      icon: RiBarChartBoxLine,
      title: t("nav.leverage"),
      eyebrow: t("home.leverage.eyebrow", { x: leverage30.multiplier }),
      bullets: [
        t("home.leverage.b1", { h: leverage30.effectiveHours.toFixed(0) }),
        t("home.leverage.b2", {
          amount: formatCurrency(leverage30.billableUsd, 0),
        }),
        t("home.leverage.b3", { pct: leverage30.marginPct.toFixed(0) }),
      ],
      href: "/agency/leverage",
      cta: t("home.leverage.cta"),
    },
    {
      icon: RiShieldCheckLine,
      title: t("nav.approvals"),
      eyebrow:
        summary.pendingApprovals > 0
          ? t("home.approvals.pending", { n: summary.pendingApprovals })
          : t("home.approvals.clear"),
      bullets: [
        t("home.approvals.b1"),
        t("home.approvals.b2"),
        t("home.approvals.b3"),
      ],
      href: "/agency/approvals",
      cta: t("home.approvals.cta"),
      tone: summary.pendingApprovals > 0 ? "warn" : "default",
    },
    {
      icon: RiBriefcase4Line,
      title: t("nav.clients"),
      eyebrow: t("home.clients.eyebrow", { n: summary.clients }),
      bullets: [
        t("home.clients.b1"),
        t("home.clients.b2"),
        t("home.clients.b3"),
      ],
      href: "/agency/clients",
      cta: t("home.clients.cta"),
    },
    {
      icon: RiFolder3Line,
      title: t("nav.projects"),
      eyebrow: t("home.projects.eyebrow", { n: summary.projects }),
      bullets: [
        t("home.projects.b1"),
        t("home.projects.b2"),
        t("home.projects.b3"),
      ],
      href: "/agency/projects",
      cta: t("home.projects.cta"),
    },
    {
      icon: RiSparkling2Line,
      title: t("nav.skills"),
      eyebrow: t("home.skills.eyebrow", { n: summary.skills }),
      bullets: [
        t("home.skills.b1"),
        t("home.skills.b2"),
        t("home.skills.b3"),
      ],
      href: "/agency/skills",
      cta: t("home.skills.cta"),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-tight sm:text-[32px] sm:leading-[40px] md:text-[36px] md:leading-[44px]">
          {t("home.title")}
        </h1>
        <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[8px] text-[13px]">
          <Link
            href="/agency/invoices"
            className="inline-flex items-center gap-[6px] font-semibold text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]"
          >
            {t("home.invoices")}
            <RiArrowRightUpLine size={14} />
            <span className="ml-[6px] text-[var(--color-text-soft)] tabular-nums">
              {t("home.outstanding", {
                amount: formatCurrency(summary.outstandingUsd, 0),
              })}
            </span>
          </Link>
          <a
            href="/api/mcp"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[6px] font-semibold text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]"
          >
            {t("home.mcpStatus")}
            <RiArrowRightUpLine size={14} />
          </a>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <HeroCard key={c.title} {...c} />
        ))}
        <ConnectMcpCard
          title={t("home.connect.title")}
          eyebrow={t("home.connect.eyebrow")}
          body={t("home.connect.body")}
          cta={t("sidebar.connectMcp")}
        />
      </div>
    </AppShell>
  );
}

type HeroCardProps = {
  icon: RemixiconComponentType;
  title: string;
  eyebrow: string;
  bullets: string[];
  href: string;
  cta: string;
  tone?: "default" | "warn";
};

function HeroCard({
  icon: Icon,
  title,
  eyebrow,
  bullets,
  href,
  cta,
  tone = "default",
}: HeroCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-[16px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
        "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
        "hover:ring-[var(--color-stroke-sub)]",
      )}
    >
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-[28px] tracking-tight text-[var(--color-text-strong)]">
            {title}
          </h2>
          <p
            className={cn(
              "mt-[2px] text-[13px] font-medium tabular-nums",
              tone === "warn"
                ? "text-[var(--color-accent-orange)]"
                : "text-[var(--color-brand-400)]",
            )}
          >
            {eyebrow}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-[8px]">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-[10px] text-[13px] leading-[20px] text-[var(--color-text-sub)]"
          >
            <RiCheckLine
              size={16}
              className="mt-[2px] shrink-0 text-[var(--color-accent-green)]"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant="primary-orange"
        size="lg"
        className="mt-auto w-full rounded-[8px]"
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </article>
  );
}

function ConnectMcpCard({
  title,
  eyebrow,
  body,
  cta,
}: {
  title: string;
  eyebrow: string;
  body: string;
  cta: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-[16px] rounded-[8px] p-[20px]",
        "bg-[color-mix(in_oklab,var(--color-brand-100)_85%,transparent)]",
        "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
      )}
    >
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
            "text-[var(--color-brand-400)]",
          )}
        >
          <RiPlugLine size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-[28px] tracking-tight text-[var(--color-text-strong)]">
            {title}
          </h2>
          <p className="mt-[2px] text-[13px] font-medium text-[var(--color-brand-400)]">
            {eyebrow}
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-[20px] text-[var(--color-text-sub)]">
        {body}
      </p>

      <ConnectMcpButton
        variant="outline"
        size="lg"
        className="mt-auto w-full rounded-[8px]"
      >
        {cta}
      </ConnectMcpButton>
    </article>
  );
}
