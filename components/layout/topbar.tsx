"use client";

import * as React from "react";
import {
  RiAddCircleLine,
  RiArrowDownSLine,
  RiMenuLine,
  RiNotification3Line,
  RiStackLine,
  RiTranslate2,
  RiUser3Line,
  RiWalletLine,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
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

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[56px] items-center gap-[8px] sm:h-[64px]",
        "bg-[var(--color-bg-surface)] px-[12px] sm:px-[20px] lg:px-[24px]",
        "border-b border-[var(--color-stroke-soft)]",
      )}
    >
      {/* Mobile: hamburger + logo */}
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

      {/* Left: Language — desktop only */}
      <div className="hidden flex-1 items-center xl:flex">
        <LanguageSelect />
      </div>

      {/* Mobile/tablet: logo in middle-left, flex-1 to push right cluster */}
      <div className="flex flex-1 items-center xl:hidden">
        <Logo className="scale-[0.85] origin-left" />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-[8px] sm:gap-[12px]">
        <BalancePill />
        <OrganizationsButton />
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

function BalancePill() {
  return (
    <div
      className={cn(
        "flex h-[40px] items-center gap-[8px] rounded-[10px] sm:h-[44px] sm:gap-[12px]",
        "bg-[color-mix(in_oklab,white_3%,transparent)] px-[10px] sm:px-[14px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <RiWalletLine
        size={18}
        className="hidden text-[var(--color-text-soft)] sm:block"
      />
      <span className="text-[14px] font-semibold tabular-nums sm:text-[18px]">
        $0.00
      </span>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "ml-[4px] size-[28px] shrink-0 rounded-full p-0 sm:h-[32px] sm:w-auto sm:rounded-[6px] sm:px-[10px]",
        )}
        aria-label="Add funds"
        asChild
      >
        <a href="/deposit">
          <RiAddCircleLine size={14} className="sm:hidden" />
          <span className="hidden sm:inline-flex items-center gap-[4px]">
            <RiAddCircleLine size={14} />
            Add funds
          </span>
        </a>
      </Button>
    </div>
  );
}

function OrganizationsButton() {
  return (
    <a
      href="/organizations"
      aria-label="Organizations"
      className={cn(
        "inline-flex h-[40px] items-center gap-[10px] rounded-[10px] sm:h-[44px]",
        "px-[10px] md:px-[14px]",
        "bg-[color-mix(in_oklab,white_3%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "text-[13px] font-semibold md:text-[14px]",
        "transition-colors hover:bg-[color-mix(in_oklab,white_6%,transparent)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:outline-none",
      )}
    >
      <RiStackLine
        size={18}
        className="shrink-0 text-[var(--color-brand-400)]"
      />
      <span className="hidden lg:inline">Organizations</span>
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
            "transition-colors hover:bg-[color-mix(in_oklab,white_6%,transparent)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:outline-none",
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
