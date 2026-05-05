"use client";

import * as React from "react";
import {
  RiInformationLine,
  RiFileCopyLine,
  RiCheckLine,
  RiCloseLine,
  RiEdit2Line,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Canada",
  "Australia",
  "Japan",
  "Brazil",
  "India",
  "Random",
];

export function ProxyAccessCard() {
  const [highEnd, setHighEnd] = React.useState(false);
  const [country, setCountry] = React.useState("United States");
  const [city, setCity] = React.useState("Random");
  const [rotation, setRotation] = React.useState("Sticky IP");
  const [ttl, setTtl] = React.useState("30");
  const [unit, setUnit] = React.useState("Min");

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[16px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          Proxy access
        </h2>
      </header>

      <Tabs defaultValue="auth">
        <TabsList className="mb-[20px] -mx-[16px] overflow-x-auto px-[16px] sm:mx-0 sm:px-0">
          <TabsTrigger value="auth">Authenticated</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-[16px]">
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <Toggle
              label="High-end Pool"
              checked={highEnd}
              onChange={setHighEnd}
            />
            <button
              type="button"
              className="text-[13px] font-semibold text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
            >
              Reset options
            </button>
          </div>

          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
            <Field label="Country/Region">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <span className="inline-flex items-center gap-[6px]">
                    <Pill>{country}</Pill>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City/State">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Random">Random</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                  <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                  <SelectItem value="Chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rotation" hint>
              <Select value={rotation} onValueChange={setRotation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sticky IP">Sticky IP</SelectItem>
                  <SelectItem value="Rotating">Rotating</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field label="TTL" hint>
              <NumberInput value={ttl} onChange={setTtl} />
            </Field>
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-semibold opacity-0">.</span>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sec">Sec</SelectItem>
                  <SelectItem value="Min">Min</SelectItem>
                  <SelectItem value="Hr">Hr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="primary" size="lg" className="rounded-[8px]">
                Clear sessions
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            <CopyField label="Proxy hostname" value="geo.iproyal.com" />
            <Field label="Proxy port">
              <Select value="12321" onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12321">12321</SelectItem>
                  <SelectItem value="32325">32325</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_auto]">
            <CopyField label="Proxy username" value="8eS89cE1EzCE70dy" />
            <div className="flex items-end">
              <Button
                variant="outline"
                size="lg"
                className="rounded-[8px]"
                leadingIcon={<RiEdit2Line size={14} />}
              >
                Change username ($0.20)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_auto]">
            <CopyField
              label="Proxy password"
              value="mstoin2005_country-us_session-7gBmgPRg_lifetime-30m"
              mask
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                size="lg"
                className="rounded-[8px]"
                leadingIcon={<RiEdit2Line size={14} />}
              >
                Change password
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <div className="rounded-[10px] border border-dashed border-[var(--color-stroke-sub)] p-[24px] text-center">
            <p className="text-[14px] text-[var(--color-text-soft)]">
              Add IPs to your whitelist to authenticate without credentials.
            </p>
            <Button
              variant="outline"
              size="md"
              className="mt-[12px] rounded-[8px]"
            >
              Add IP
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: boolean;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
        {hint ? (
          <RiInformationLine
            size={13}
            className="text-[var(--color-text-soft)]"
          />
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[4px] rounded-[4px] px-[6px] py-[2px]",
        "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
        "text-[12px] font-semibold text-[var(--color-brand-400)]",
      )}
    >
      {children}
      <RiCloseLine size={12} />
    </span>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex items-center gap-[10px] outline-none",
        "rounded-[6px] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-[22px] w-[40px] items-center rounded-full transition-colors duration-200",
          checked
            ? "bg-[var(--color-brand-400)]"
            : "bg-[var(--color-stroke-strong)]",
        )}
      >
        <span
          className={cn(
            "absolute size-[18px] rounded-full bg-white shadow-[var(--shadow-regular-xs)] transition-transform duration-200 ease-[var(--ease-spring)]",
            checked ? "translate-x-[20px]" : "translate-x-[2px]",
          )}
        />
      </span>
      <span className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
        <RiInformationLine size={13} className="text-[var(--color-text-soft)]" />
      </span>
    </button>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-[44px] w-full rounded-[8px] bg-[var(--color-bg-surface)] px-[14px]",
        "ring-1 ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
        "text-[14px] tabular-nums text-[var(--color-text-strong)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
      )}
    />
  );
}

function CopyField({
  label,
  value,
  mask,
}: {
  label: string;
  value: string;
  mask?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const display = mask ? "•".repeat(Math.min(28, value.length)) : value;

  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      <div
        className={cn(
          "group flex h-[44px] items-center gap-[8px] rounded-[8px] px-[14px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          "hover:ring-[var(--color-stroke-sub)]",
        )}
      >
        <span className="flex-1 truncate text-[14px] text-[var(--color-text-strong)]">
          {display}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : `Copy ${label}`}
          className={cn(
            "flex size-[28px] shrink-0 items-center justify-center rounded-[6px]",
            "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
            "transition-colors",
          )}
        >
          {copied ? (
            <RiCheckLine
              size={14}
              className="text-[var(--color-brand-400)]"
            />
          ) : (
            <RiFileCopyLine size={14} />
          )}
        </button>
      </div>
    </label>
  );
}
