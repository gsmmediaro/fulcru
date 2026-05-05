"use client";

import * as React from "react";
import {
  RiLightbulbLine,
  RiBug2Line,
  RiAddCircleLine,
  RiHeartLine,
  RiCheckLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Topic = {
  id: string;
  title: string;
  description: string;
  icon: RemixiconComponentType;
};

const TOPICS: Topic[] = [
  {
    id: "feature",
    title: "Feature idea",
    description: "Something you wish the dashboard could do.",
    icon: RiAddCircleLine,
  },
  {
    id: "bug",
    title: "Bug report",
    description: "Something looks broken or behaves unexpectedly.",
    icon: RiBug2Line,
  },
  {
    id: "love",
    title: "What you love",
    description: "Tell us what is working well — we celebrate wins too.",
    icon: RiHeartLine,
  },
];

export default function FeedbackPage() {
  const [topic, setTopic] = React.useState<Topic["id"]>("feature");
  const [submitted, setSubmitted] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setMessage("");
    window.setTimeout(() => setSubmitted(false), 2400);
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
          <RiLightbulbLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Got a Suggestion?
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Every note reaches the product team — share what would make this better.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className={cn(
          "enter-stagger mt-[24px] flex flex-col gap-[20px] rounded-[12px]",
          "bg-[var(--color-bg-surface)] p-[20px] sm:p-[24px] lg:p-[28px]",
          "ring-1 ring-[var(--color-stroke-soft)]",
        )}
      >
        <fieldset className="flex flex-col gap-[10px]">
          <legend className="text-[13px] font-semibold text-[var(--color-text-strong)]">
            What kind of feedback?
          </legend>
          <div className="grid gap-[12px] sm:grid-cols-3">
            {TOPICS.map((t) => {
              const active = topic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopic(t.id)}
                  aria-pressed={active}
                  className={cn(
                    "group flex flex-col items-start gap-[8px] rounded-[10px] p-[14px] text-left",
                    "ring-1 transition-[box-shadow,background-color,transform] duration-150",
                    active
                      ? "bg-[color-mix(in_oklab,var(--color-brand-400)_12%,var(--color-bg-surface))] ring-[var(--color-brand-400)]"
                      : "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[32px] items-center justify-center rounded-full",
                      "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
                    )}
                  >
                    <t.icon size={16} />
                  </span>
                  <p className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                    {t.title}
                  </p>
                  <p className="text-[12px] leading-[18px] text-[var(--color-text-soft)]">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-[8px]">
          <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
            Your message
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us as much detail as you can — steps, context, what you expected…"
            rows={6}
            className={cn(
              "scrollbar-thin resize-y rounded-[10px] p-[14px]",
              "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
              "text-[14px] leading-[22px] text-[var(--color-text-strong)]",
              "placeholder:text-[var(--color-text-soft)]",
              "hover:ring-[var(--color-stroke-sub)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
              "transition-[box-shadow,background-color]",
            )}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="text-[12px] text-[var(--color-text-soft)]">
            We read every reply — typical turnaround under 48 hours.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="rounded-[8px]"
            leadingIcon={
              submitted ? <RiCheckLine size={14} /> : null
            }
          >
            {submitted ? "Sent — thank you" : "Send feedback"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
