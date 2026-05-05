import {
  RiInformationLine,
  RiSearchLine,
  RiBookOpenLine,
  RiKey2Line,
  RiMoneyDollarCircleLine,
  RiCustomerServiceLine,
  RiArrowRightUpLine,
  RiQuestionLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const CATEGORIES: {
  title: string;
  count: number;
  icon: RemixiconComponentType;
}[] = [
  { title: "Getting started", count: 14, icon: RiBookOpenLine },
  { title: "Authentication & access", count: 9, icon: RiKey2Line },
  { title: "Billing & invoices", count: 11, icon: RiMoneyDollarCircleLine },
  { title: "Troubleshooting", count: 18, icon: RiCustomerServiceLine },
];

const POPULAR = [
  "How do I rotate residential proxies?",
  "Why is my IP whitelist not working?",
  "How are gigabytes counted in my plan?",
  "Configuring sticky sessions and TTL",
  "Switching between HTTP and SOCKS5",
];

export default function HelpCenterPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiInformationLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Help Center
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Search the knowledge base or browse by category.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-[24px] flex h-[56px] items-center gap-[12px] rounded-[12px] px-[18px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
          "transition-[box-shadow]",
        )}
      >
        <RiSearchLine size={18} className="text-[var(--color-text-soft)]" />
        <input
          type="text"
          placeholder="Search articles, guides, and FAQs…"
          className={cn(
            "flex-1 bg-transparent text-[15px] outline-none",
            "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
          )}
        />
        <Button variant="primary" size="md" className="rounded-[8px]">
          Search
        </Button>
      </div>

      <div className="enter-stagger mt-[24px] grid gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <a
            key={c.title}
            href="#"
            className={cn(
              "group flex flex-col gap-[12px] rounded-[12px] p-[20px]",
              "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
              "transition-[transform,box-shadow] duration-200 ease-[var(--ease-spring)]",
              "hover:-translate-y-[2px] hover:ring-[var(--color-stroke-sub)] hover:shadow-[var(--shadow-regular-md)]",
            )}
          >
            <span
              className={cn(
                "flex size-[36px] items-center justify-center rounded-full",
                "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
                "transition-transform duration-300 group-hover:scale-[1.08]",
              )}
            >
              <c.icon size={18} />
            </span>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[15px] font-semibold text-[var(--color-text-strong)]">
                {c.title}
              </p>
              <p className="text-[12px] text-[var(--color-text-soft)]">
                {c.count} articles
              </p>
            </div>
          </a>
        ))}
      </div>

      <section
        className={cn(
          "mt-[24px] rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
          "ring-1 ring-[var(--color-stroke-soft)]",
        )}
      >
        <header className="mb-[16px] flex items-center justify-between gap-[12px]">
          <h2 className="tp-overline text-[var(--color-brand-400)]">
            Popular questions
          </h2>
          <a
            href="https://help.iproyal.com/en/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
          >
            Visit full help center
            <RiArrowRightUpLine size={14} />
          </a>
        </header>

        <ul className="flex flex-col">
          {POPULAR.map((q) => (
            <li
              key={q}
              className="border-b border-[var(--color-stroke-soft)] last:border-b-0"
            >
              <a
                href="#"
                className={cn(
                  "group flex items-center justify-between gap-[12px] py-[14px]",
                  "text-[14px] text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]",
                  "transition-colors",
                )}
              >
                <span className="inline-flex items-center gap-[10px]">
                  <RiQuestionLine
                    size={16}
                    className="text-[var(--color-text-soft)] group-hover:text-[var(--color-brand-400)]"
                  />
                  {q}
                </span>
                <RiArrowRightUpLine
                  size={14}
                  className="text-[var(--color-text-soft)] group-hover:text-[var(--color-brand-400)]"
                />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
