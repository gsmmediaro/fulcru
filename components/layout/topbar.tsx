"use client";

import * as React from "react";
import Link from "next/link";
import {
  RiArrowDownSLine,
  RiBuilding2Line,
  RiMenuLine,
  RiNotification3Line,
  RiPulseLine,
  RiTranslate2,
  RiUser3Line,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { CompactButton } from "@/components/ui/compact-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Logo } from "@/components/brand/logo";

type Pulse = {
  active: number;
  awaiting: number;
  todayBillable: number;
  todayMarginPct: number;
};

const POLL_MS = 12_000;

async function fetchPulse(): Promise<Pulse> {
  const [runsRes, levRes] = await Promise.all([
    fetch("/api/agency/runs?limit=200", { cache: "no-store" }),
    fetch("/api/agency/leverage?windowDays=1", { cache: "no-store" }),
  ]);
  const runs = (await runsRes.json()) as Array<{
    status: string;
    startedAt: string;
    billableUsd: number;
  }>;
  const lev = (await levRes.json()) as {
    billableUsd: number;
    marginPct: number;
  };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startISO = todayStart.toISOString();
  const todayBillable = runs
    .filter((r) => r.startedAt >= startISO)
    .reduce((s, r) => s + (r.billableUsd ?? 0), 0);
  return {
    active: runs.filter((r) => r.status === "running").length,
    awaiting: runs.filter((r) => r.status === "awaiting_approval").length,
    todayBillable: todayBillable || lev.billableUsd || 0,
    todayMarginPct: lev.marginPct ?? 0,
  };
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [pulse, setPulse] = React.useState<Pulse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetchPulse()
        .then((p) => {
          if (!cancelled) setPulse(p);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[56px] items-center gap-[8px] sm:h-[64px]",
        "bg-[var(--color-bg-surface)]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--color-bg-surface)]/72",
        "px-[12px] sm:px-[20px] lg:px-[24px]",
        "border-b border-[var(--color-stroke-soft)]",
      )}
    >
      <div className="flex items-center gap-[8px] xl:hidden">
        <CompactButton
          aria-label="Open navigation menu"
          variant="neutral"
          size="md"
          onClick={onMenuClick}
          className="size-[40px]"
        >
          <RiMenuLine size={20} />
        </CompactButton>
      </div>

      <div className="hidden flex-1 items-center xl:flex">
        <LanguageSelect />
      </div>

      <div className="flex flex-1 items-center xl:hidden">
        <Logo className="scale-[0.9] origin-left" />
      </div>

      <div className="flex items-center gap-[8px] sm:gap-[10px]">
        <LivePulsePill pulse={pulse} />
        <TodayPill pulse={pulse} />
        <WorkspaceButton />
        <UserMenu />
        <CompactButton
          aria-label="Notifications"
          variant="neutral"
          size="sm"
          className="group/bell hidden sm:inline-flex"
        >
          <RiNotification3Line
            size={18}
            className={cn(
              "origin-top transition-transform duration-[500ms] ease-[var(--ease-soft-spring)]",
              "group-hover/bell:[animation:bell-ring_0.6s_var(--ease-soft-spring)]",
            )}
          />
        </CompactButton>
      </div>
    </header>
  );
}

function LanguageSelect() {
  return (
    <Select defaultValue="en">
      <SelectTrigger
        leadingIcon={<RiTranslate2 size={16} />}
        className="h-[36px] w-[140px] border-none bg-transparent px-[10px] text-[13px] ring-0 hover:bg-white/5"
      >
        <SelectValue placeholder="English" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
        <SelectItem value="de">Deutsch</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="ro">Română</SelectItem>
      </SelectContent>
    </Select>
  );
}

function LivePulsePill({ pulse }: { pulse: Pulse | null }) {
  const active = pulse?.active ?? 0;
  const awaiting = pulse?.awaiting ?? 0;
  const isLive = active > 0;
  return (
    <Link
      href={
        isLive
          ? "/agency/runs?status=running"
          : awaiting > 0
            ? "/agency/approvals"
            : "/agency/runs"
      }
      aria-label={`${active} runs active`}
      title={`${active} running · ${awaiting} awaiting approval`}
      className={cn(
        "group inline-flex h-[40px] items-center gap-[10px] rounded-[10px] sm:h-[44px]",
        "px-[10px] sm:px-[14px]",
        "bg-[color-mix(in_oklab,white_3%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-[background,box-shadow,transform] duration-200",
        "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
      )}
    >
      <span className="relative flex size-[10px] items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            isLive
              ? "bg-[var(--color-accent-green)] animate-ping opacity-75"
              : "opacity-0",
          )}
        />
        <span
          className={cn(
            "relative size-[8px] rounded-full",
            isLive
              ? "bg-[var(--color-accent-green)] shadow-[0_0_10px_var(--color-accent-green)]"
              : "bg-[var(--color-text-soft)]",
          )}
        />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-soft)]">
          Live
        </span>
        <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)] sm:text-[15px]">
          {active}
          <span className="ml-[4px] text-[12px] font-normal text-[var(--color-text-sub)]">
            running
          </span>
        </span>
      </span>
      {awaiting > 0 ? (
        <span
          className={cn(
            "ml-[2px] hidden h-[22px] items-center gap-[4px] rounded-full px-[8px] sm:inline-flex",
            "bg-[color-mix(in_oklab,#f59e0b_18%,transparent)] text-amber-300",
            "text-[11px] font-semibold tabular-nums",
          )}
        >
          {awaiting}
          <span className="font-medium opacity-80">awaiting</span>
        </span>
      ) : null}
    </Link>
  );
}

function TodayPill({ pulse }: { pulse: Pulse | null }) {
  const billable = pulse?.todayBillable ?? 0;
  const marginPct = pulse?.todayMarginPct ?? 0;
  return (
    <Link
      href="/agency/leverage?windowDays=1"
      title="Today's billable & margin"
      className={cn(
        "hidden h-[44px] items-center gap-[10px] rounded-[10px] md:inline-flex",
        "px-[12px]",
        "bg-[color-mix(in_oklab,white_3%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-[background,transform] duration-200",
        "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
      )}
    >
      <RiPulseLine size={16} className="text-[var(--color-brand-400)]" />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-soft)]">
          Today
        </span>
        <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]">
          {billable === 0
            ? "—"
            : billable >= 1000
              ? `$${(billable / 1000).toFixed(1)}k`
              : `$${billable.toFixed(0)}`}
        </span>
      </span>
      {marginPct > 0 ? (
        <span
          className={cn(
            "rounded-[6px] px-[6px] py-[1px]",
            "bg-[color-mix(in_oklab,var(--color-accent-green)_16%,transparent)]",
            "text-[11px] font-semibold tabular-nums text-[var(--color-accent-green)]",
          )}
        >
          {marginPct.toFixed(0)}%
        </span>
      ) : null}
    </Link>
  );
}

function WorkspaceButton() {
  return (
    <a
      href="/agency/clients"
      aria-label="Workspace"
      className={cn(
        "inline-flex h-[40px] items-center gap-[10px] rounded-[10px] sm:h-[44px]",
        "px-[10px] md:px-[14px]",
        "bg-[color-mix(in_oklab,white_3%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "text-[13px] font-semibold md:text-[14px]",
        "transition-[background,transform] duration-200",
        "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
      )}
    >
      <RiBuilding2Line
        size={18}
        className="shrink-0 text-[var(--color-brand-400)]"
      />
      <span className="hidden lg:inline">Dictando Agency</span>
      <RiArrowDownSLine
        size={16}
        className="hidden text-[var(--color-text-soft)] lg:inline"
      />
    </a>
  );
}

function UserMenu() {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "inline-flex h-[40px] items-center gap-[10px] rounded-[10px] sm:h-[44px]",
            "px-[6px] md:px-[10px]",
            "bg-[color-mix(in_oklab,white_3%,transparent)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "text-[13px] font-medium",
            "transition-[background,transform] duration-200",
            "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:-translate-y-px",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
          )}
        >
          <span
            className={cn(
              "flex size-[28px] shrink-0 items-center justify-center rounded-full",
              "bg-[color-mix(in_oklab,var(--color-accent-orange)_26%,transparent)]",
              "text-[var(--color-accent-orange)]",
            )}
          >
            <RiUser3Line size={16} />
          </span>
          <span className="hidden md:inline">contact@dictando.ro</span>
          <RiArrowDownSLine
            size={16}
            className="hidden text-[var(--color-text-soft)] md:inline"
          />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[220px]">
        <DropdownItem>Account settings</DropdownItem>
        <DropdownItem>Billing</DropdownItem>
        <DropdownItem>API keys</DropdownItem>
        <DropdownSeparator />
        <DropdownItem className="text-rose-400 data-[highlighted]:bg-rose-500/10">
          Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
