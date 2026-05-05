"use client";

import * as React from "react";
import { RiFileCopyLine, RiCheckLine, RiDownload2Line } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SESSIONS = [
  "7gBmgPRg",
  "1zVKenYy",
  "zgtAch3X",
  "ZNgWLbqW",
  "qmzy2Q6I",
  "aXs7gQbh",
  "RVwbyxRh",
  "NeNwXHwa",
  "io0cdPAB",
  "I4cJ28kT",
];

const FORMATS: { id: string; label: string; render: (s: string) => string }[] = [
  {
    id: "host",
    label: "HOST:PORT:USER:PASS",
    render: (s) =>
      `geo.iproyal.com:12321:8eS89cE1EzCE70dy:mstoin2005_country-us_session-${s}_lifetime-30m`,
  },
  {
    id: "user",
    label: "USER:PASS@HOST:PORT",
    render: (s) =>
      `8eS89cE1EzCE70dy:mstoin2005_country-us_session-${s}_lifetime-30m@geo.iproyal.com:12321`,
  },
  {
    id: "url",
    label: "http://USER:PASS@HOST:PORT",
    render: (s) =>
      `http://8eS89cE1EzCE70dy:mstoin2005_country-us_session-${s}_lifetime-30m@geo.iproyal.com:12321`,
  },
];

export function ProxyListCard() {
  const [format, setFormat] = React.useState("host");
  const [quantity, setQuantity] = React.useState("10");
  const [copied, setCopied] = React.useState(false);

  const renderer = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const qty = Math.max(1, Math.min(SESSIONS.length, Number(quantity) || 1));
  const lines = SESSIONS.slice(0, qty).map((s) => renderer.render(s));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[16px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          Formatted proxy list
        </h2>
      </header>

      <div
        className={cn(
          "scrollbar-thin h-[200px] overflow-auto rounded-[10px] p-[14px]",
          "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
          "ring-1 ring-[var(--color-stroke-soft)]",
          "text-[13px] leading-[24px] text-[var(--color-text-strong)] tabular-nums",
        )}
      >
        {lines.map((line) => (
          <div key={line} className="whitespace-nowrap">
            {line}
          </div>
        ))}
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
        <Button
          variant="primary"
          size="md"
          className="rounded-[8px]"
          leadingIcon={
            copied ? <RiCheckLine size={14} /> : <RiFileCopyLine size={14} />
          }
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy list"}
        </Button>
        <Button
          variant="outline"
          size="md"
          className="rounded-[8px]"
          leadingIcon={<RiDownload2Line size={14} />}
        >
          Download list
        </Button>
      </div>

      <div className="mt-[16px] grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)]">
        <Field label="Format">
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            max={SESSIONS.length}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={cn(
              "h-[44px] w-full rounded-[8px] bg-[var(--color-bg-surface)] px-[14px]",
              "ring-1 ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
              "text-[14px] tabular-nums text-[var(--color-text-strong)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
            )}
          />
        </Field>
      </div>
    </section>
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
