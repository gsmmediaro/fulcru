"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowDownSLine,
  RiBuilding2Line,
  RiMenuLine,
  RiNotification3Line,
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
import { useLocale } from "@/lib/i18n/provider";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/dict";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t } = useLocale();
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
          aria-label={t("topbar.openMenu")}
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
        <WorkspaceButton />
        <UserMenu />
        <CompactButton
          aria-label={t("topbar.notifications")}
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
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  return (
    <Select
      value={locale}
      onValueChange={(v) => {
        setLocale(v as Locale);
        router.refresh();
      }}
    >
      <SelectTrigger
        leadingIcon={<RiTranslate2 size={16} />}
        className="h-[36px] w-[140px] border-none bg-transparent px-[10px] text-[13px] ring-0 hover:bg-[var(--color-bg-tint-5)]"
      >
        <SelectValue placeholder={LOCALE_LABELS.en} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{LOCALE_LABELS.en}</SelectItem>
        <SelectItem value="ro">{LOCALE_LABELS.ro}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function WorkspaceButton() {
  const { t } = useLocale();
  return (
    <a
      href="/agency/clients"
      aria-label={t("topbar.workspace")}
      className={cn(
        "inline-flex h-[40px] items-center gap-[10px] rounded-[6px] sm:h-[44px]",
        "px-[10px] md:px-[14px]",
        "bg-[var(--color-bg-tint-3)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "text-[13px] font-semibold md:text-[14px]",
        "transition-[background,transform] duration-200",
        "hover:bg-[var(--color-bg-tint-6)] hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
      )}
    >
      <RiBuilding2Line
        size={18}
        className="shrink-0 text-[var(--color-brand-400)]"
      />
      <span className="hidden lg:inline">{t("topbar.workspace")}</span>
      <RiArrowDownSLine
        size={16}
        className="hidden text-[var(--color-text-soft)] lg:inline"
      />
    </a>
  );
}

function UserMenu() {
  const { t } = useLocale();
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "inline-flex h-[40px] items-center gap-[10px] rounded-[6px] sm:h-[44px]",
            "px-[6px] md:px-[10px]",
            "bg-[var(--color-bg-tint-3)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "text-[13px] font-medium",
            "transition-[background,transform] duration-200",
            "hover:bg-[var(--color-bg-tint-6)] hover:-translate-y-px",
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
          <span className="hidden md:inline">contact@fulcru.app</span>
          <RiArrowDownSLine
            size={16}
            className="hidden text-[var(--color-text-soft)] md:inline"
          />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[220px]">
        <DropdownItem>{t("topbar.menu.account")}</DropdownItem>
        <DropdownItem>{t("topbar.menu.billing")}</DropdownItem>
        <DropdownItem>{t("topbar.menu.api")}</DropdownItem>
        <DropdownSeparator />
        <DropdownItem className="text-rose-400 data-[highlighted]:bg-rose-500/10">
          {t("topbar.menu.signout")}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
