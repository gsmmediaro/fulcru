import {
  RiArrowRightUpLine,
  RiAddLine,
  RiUserLine,
  RiFileListLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function PageActions({
  changeHref,
  docsHref,
  guideHref,
  subUsersHref,
  logsHref,
}: {
  changeHref: string;
  docsHref: string;
  guideHref: string;
  subUsersHref: string;
  logsHref: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[12px]",
        "md:flex-row md:flex-wrap md:items-center md:justify-between",
      )}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <Button
          variant="primary-orange"
          size="lg"
          className="rounded-[8px] px-[18px]"
          asChild
        >
          <a href={changeHref}>Change Subscription</a>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-[8px]"
          leadingIcon={<RiAddLine size={16} />}
        >
          Quick top-up
        </Button>
      </div>

      <nav
        className={cn(
          "scrollbar-thin -mx-[16px] flex items-center gap-x-[18px] overflow-x-auto px-[16px]",
          "pb-[2px] text-[13px] font-semibold",
          "md:mx-0 md:flex-wrap md:gap-x-[20px] md:overflow-visible md:px-0 md:pb-0",
        )}
      >
        <ExternalLink href={docsHref}>Documentation</ExternalLink>
        <ExternalLink href={guideHref}>Quick-start guide</ExternalLink>
        <SimpleLink href={subUsersHref} icon={<RiUserLine size={14} />}>
          Sub-Users
        </SimpleLink>
        <SimpleLink href={logsHref} icon={<RiFileListLine size={14} />}>
          Logs
        </SimpleLink>
      </nav>
    </div>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-[6px] text-[var(--color-text-strong)] transition-colors hover:text-[var(--color-brand-400)]"
    >
      {children}
      <RiArrowRightUpLine
        size={14}
        className="translate-y-[0.5px] text-[var(--color-text-soft)] transition-colors group-hover:text-[var(--color-brand-400)]"
      />
    </a>
  );
}

function SimpleLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-[6px] text-[var(--color-text-strong)] transition-colors hover:text-[var(--color-brand-400)]"
    >
      {children}
      {icon ? (
        <span className="text-[var(--color-text-soft)]">{icon}</span>
      ) : null}
    </a>
  );
}
