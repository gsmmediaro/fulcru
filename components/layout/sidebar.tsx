"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiPlugLine,
  RiCheckLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";
import { sidebarNav, type NavGroup } from "./sidebar-nav-data";

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function childrenActive(pathname: string, group: NavGroup) {
  return (group.children ?? []).some((c) => isActive(pathname, c.href));
}

function NavIcon({
  Icon,
  active,
}: {
  Icon: RemixiconComponentType;
  active: boolean;
}) {
  return (
    <Icon
      size={20}
      className={cn(
        "shrink-0 transition-colors duration-150",
        active
          ? "text-[var(--color-brand-400)]"
          : "text-[var(--color-text-strong)]",
      )}
    />
  );
}

function NavRow({
  icon,
  label,
  href,
  external,
  active,
  softActive,
  indent,
  onClick,
  trailing,
  role = "link",
}: {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
  active?: boolean;
  softActive?: boolean;
  indent?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  role?: "link" | "button";
}) {
  const className = cn(
    "group flex h-[36px] w-full items-center gap-[12px] rounded-[8px]",
    "px-[12px] text-[14px] leading-[20px]",
    "transition-colors duration-150 cursor-pointer",
    "outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)] focus-visible:outline-offset-[-2px]",
    indent && "pl-[42px]",
    active
      ? "bg-[var(--color-brand-100)] text-[var(--color-brand-400)] font-semibold"
      : softActive
        ? "text-[var(--color-brand-400)] font-semibold hover:bg-[color-mix(in_oklab,white_5%,transparent)]"
        : "text-[var(--color-text-strong)] hover:bg-[color-mix(in_oklab,white_5%,transparent)]",
  );

  if (href && role === "link") {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {icon}
          <span className="flex-1 truncate">{label}</span>
          <RiArrowRightUpLine
            size={14}
            className="text-[var(--color-text-soft)] opacity-0 transition-opacity group-hover:opacity-100"
          />
          {trailing}
        </a>
      );
    }
    return (
      <Link href={href} className={className}>
        {icon}
        <span className="flex-1 truncate">{label}</span>
        {trailing}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing}
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const initialExpanded = React.useMemo(() => {
    const out: Record<string, boolean> = { catalog: true };
    for (const g of sidebarNav) {
      if (g.children?.length && childrenActive(pathname, g)) out[g.id] = true;
    }
    return out;
  }, [pathname]);

  const [expanded, setExpanded] =
    React.useState<Record<string, boolean>>(initialExpanded);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "flex h-screen w-[248px] shrink-0 flex-col",
        "bg-[var(--color-bg-surface)]",
        "border-r border-[var(--color-stroke-soft)]",
        "px-[10px] pb-[24px] pt-[16px]",
      )}
    >
      <Link
        href="/"
        className="group/logo flex h-[48px] items-center rounded-[10px] px-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]"
      >
        <Logo />
      </Link>

      {/* Nav */}
      <nav className="scrollbar-thin mt-[20px] flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-[4px]">
          {sidebarNav.map((g) => {
            const hasChildren = !!g.children?.length;
            const active = hasChildren ? false : isActive(pathname, g.href);
            const groupHasActiveChild =
              hasChildren && childrenActive(pathname, g);
            const open = expanded[g.id] ?? false;

            return (
              <li key={g.id}>
                <NavRow
                  icon={
                    <NavIcon
                      Icon={g.icon}
                      active={active || groupHasActiveChild}
                    />
                  }
                  label={g.label}
                  href={hasChildren ? undefined : g.href}
                  external={g.external}
                  active={active}
                  softActive={groupHasActiveChild}
                  role={hasChildren ? "button" : "link"}
                  onClick={hasChildren ? () => toggle(g.id) : undefined}
                  trailing={
                    hasChildren ? (
                      <RiArrowDownSLine
                        size={16}
                        className={cn(
                          "text-[var(--color-text-soft)] transition-transform duration-200",
                          open ? "rotate-180" : "rotate-0",
                        )}
                      />
                    ) : null
                  }
                />

                {hasChildren ? (
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <ul className="min-h-0 overflow-hidden pt-[2px]">
                      {g.children!.map((c) => (
                        <li key={c.href}>
                          <NavRow
                            label={c.label}
                            href={c.href}
                            indent
                            active={isActive(pathname, c.href)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <McpStatusCard />
    </aside>
  );
}

function McpStatusCard() {
  return (
    <div
      className={cn(
        "mt-[12px] rounded-[12px] p-[14px]",
        "bg-[color-mix(in_oklab,var(--color-bg-surface-elevated)_85%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-[background,box-shadow] duration-200",
        "hover:ring-[var(--color-stroke-strong)]",
      )}
    >
      <div className="flex items-center gap-[10px]">
        <span
          className={cn(
            "relative flex size-[28px] items-center justify-center rounded-[8px]",
            "bg-[color-mix(in_oklab,var(--color-accent-green)_16%,transparent)]",
            "text-[var(--color-accent-green)]",
          )}
        >
          <RiPlugLine size={14} />
          <span className="absolute -right-[1px] -top-[1px] flex size-[8px] items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent-green)] opacity-60" />
            <span className="relative size-[6px] rounded-full bg-[var(--color-accent-green)]" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-[16px] text-[var(--color-text-strong)]">
            MCP connected
          </p>
          <p className="truncate text-[11px] leading-[14px] text-[var(--color-text-soft)]">
            agency-runs · 8 tools
          </p>
        </div>
      </div>
      <p className="mt-[10px] text-[11px] leading-[16px] text-[var(--color-text-sub)]">
        Every Claude Code session can call{" "}
        <code className="rounded-[4px] bg-[color-mix(in_oklab,white_5%,transparent)] px-[4px] py-[1px] font-mono text-[10px] text-[var(--color-brand-400)]">
          run_start
        </code>{" "}
        to bill its work here.
      </p>
      <a
        href="/api/mcp"
        target="_blank"
        rel="noreferrer"
        className={cn(
          "mt-[10px] inline-flex items-center gap-[6px] text-[11px] font-semibold",
          "text-[var(--color-brand-400)] transition-opacity hover:opacity-80",
        )}
      >
        <RiCheckLine size={12} />
        View descriptor
      </a>
    </div>
  );
}
