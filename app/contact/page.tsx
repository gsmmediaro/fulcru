"use client";

import * as React from "react";
import {
  RiMailLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiCheckLine,
  RiCustomerService2Line,
  RiCalendarEventLine,
  RiArrowRightUpLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

const PERKS = [
  "Volume pricing for 250GB+ residential or 100+ static proxies",
  "Dedicated account manager and Slack channel",
  "Custom invoicing, NET-30 terms, and tax documentation",
  "Priority engineering support with 4-hour response SLA",
];

const CHANNELS: {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: RemixiconComponentType;
}[] = [
  {
    title: "Live chat",
    description: "Average response under 90 seconds, 24/7.",
    cta: "Start chat",
    href: "#",
    icon: RiCustomerService2Line,
  },
  {
    title: "Book a demo",
    description: "30-minute walkthrough with a solutions engineer.",
    cta: "Pick a time",
    href: "#",
    icon: RiCalendarEventLine,
  },
  {
    title: "Email sales",
    description: "Reply within one business day, Mon–Fri.",
    cta: "sales@iproyal.com",
    href: "mailto:sales@iproyal.com",
    icon: RiMailLine,
  },
];

const VOLUMES = [
  "Just exploring",
  "$1k – $5k / month",
  "$5k – $20k / month",
  "$20k – $100k / month",
  "$100k+ / month",
];

const PRODUCTS = [
  "Residential",
  "ISP",
  "Datacenter",
  "Mobile",
  "Web Unblocker",
  "Multiple / not sure yet",
];

export default function ContactSalesPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("contact@dictando.ro");
  const [company, setCompany] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [volume, setVolume] = React.useState(VOLUMES[1]);
  const [product, setProduct] = React.useState(PRODUCTS[0]);
  const [message, setMessage] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiBuilding2Line size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Contact sales
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            For high-volume usage, custom infrastructure, or enterprise contracts.
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] grid gap-[20px] lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <form
          onSubmit={submit}
          className={cn(
            "flex flex-col gap-[18px] rounded-[12px] p-[20px] sm:p-[24px] lg:p-[28px]",
            "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          )}
        >
          <div className="grid gap-[14px] sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={name}
                onChange={setName}
                placeholder="Jane Doe"
                required
              />
            </Field>
            <Field label="Work email">
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                required
              />
            </Field>
            <Field label="Company">
              <Input
                value={company}
                onChange={setCompany}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Website">
              <Input
                value={website}
                onChange={setWebsite}
                placeholder="acme.com"
                leadingIcon={<RiGlobalLine size={14} />}
              />
            </Field>
          </div>

          <div className="grid gap-[14px] sm:grid-cols-2">
            <Field label="Estimated monthly volume">
              <Select value={volume} onValueChange={setVolume}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOLUMES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Primary product">
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="What are you trying to solve?">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Use cases, target sites, scaling timeline, anything we should know up front…"
              className={cn(
                "scrollbar-thin resize-y rounded-[10px] p-[14px]",
                "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
                "text-[14px] leading-[22px] text-[var(--color-text-strong)]",
                "placeholder:text-[var(--color-text-soft)]",
                "hover:ring-[var(--color-stroke-sub)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
                "transition-[box-shadow]",
              )}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-[12px] border-t border-[var(--color-stroke-soft)] pt-[16px]">
            <p className="text-[12px] text-[var(--color-text-soft)]">
              By submitting, you agree to be contacted about IPRoyal services.
            </p>
            <Button
              type="submit"
              variant="primary-orange"
              size="lg"
              className="rounded-[8px] px-[20px]"
              leadingIcon={submitted ? <RiCheckLine size={14} /> : null}
              disabled={submitted}
            >
              {submitted ? "Request sent" : "Talk to sales"}
            </Button>
          </div>
        </form>

        <aside className="flex flex-col gap-[16px]">
          <section
            className={cn(
              "rounded-[12px] p-[20px]",
              "bg-[color-mix(in_oklab,var(--color-brand-400)_10%,var(--color-bg-surface))]",
              "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
            )}
          >
            <h2 className="text-[15px] font-semibold leading-[20px]">
              What enterprise customers get
            </h2>
            <ul className="mt-[12px] flex flex-col gap-[10px]">
              {PERKS.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-[10px] text-[13px] leading-[20px] text-[var(--color-text-strong)]"
                >
                  <span
                    className={cn(
                      "mt-[2px] flex size-[18px] shrink-0 items-center justify-center rounded-full",
                      "bg-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
                      "text-[var(--color-brand-400)]",
                    )}
                  >
                    <RiCheckLine size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section
            className={cn(
              "rounded-[12px] bg-[var(--color-bg-surface)] p-[8px]",
              "ring-1 ring-[var(--color-stroke-soft)]",
            )}
          >
            {CHANNELS.map((c, i) => (
              <a
                key={c.title}
                href={c.href}
                className={cn(
                  "group flex items-start gap-[12px] rounded-[10px] p-[12px] transition-colors",
                  "hover:bg-[color-mix(in_oklab,white_4%,transparent)]",
                  i !== CHANNELS.length - 1 &&
                    "border-b border-[var(--color-stroke-soft)] rounded-b-none",
                )}
              >
                <span
                  className={cn(
                    "flex size-[36px] shrink-0 items-center justify-center rounded-full",
                    "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
                    "transition-transform duration-300 group-hover:scale-[1.06]",
                  )}
                >
                  <c.icon size={16} />
                </span>
                <div className="flex flex-1 flex-col gap-[2px]">
                  <p className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                    {c.title}
                  </p>
                  <p className="text-[12px] leading-[18px] text-[var(--color-text-soft)]">
                    {c.description}
                  </p>
                  <span className="mt-[4px] inline-flex items-center gap-[4px] text-[12px] font-semibold text-[var(--color-brand-400)]">
                    {c.cta}
                    <RiArrowRightUpLine size={12} />
                  </span>
                </div>
              </a>
            ))}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  leadingIcon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-[44px] items-center gap-[8px] rounded-[8px] px-[14px]",
        "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
        "hover:ring-[var(--color-stroke-sub)]",
        "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
        "transition-[box-shadow]",
      )}
    >
      {leadingIcon ? (
        <span className="text-[var(--color-text-soft)]">{leadingIcon}</span>
      ) : null}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[14px] text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-soft)]"
      />
    </div>
  );
}
