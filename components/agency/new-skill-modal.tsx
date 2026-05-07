"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiAddLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, Input, Textarea } from "@/components/agency/new-client-modal";
import { useLocale } from "@/lib/i18n/provider";

const CATEGORIES: Array<"engineering" | "design" | "content" | "ops" | "research"> = [
  "engineering",
  "design",
  "content",
  "ops",
  "research",
];

export function NewSkillButton() {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("skills.new")}
      </Button>
      <NewSkillModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewSkillModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<typeof CATEGORIES[number]>(
    "engineering",
  );
  const [baselineHours, setBaselineHours] = React.useState("4");
  const [rateModifier, setRateModifier] = React.useState("1");
  const [tags, setTags] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setCategory("engineering");
      setBaselineHours("4");
      setRateModifier("1");
      setTags("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/agency/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          baselineHours: Number(baselineHours),
          rateModifier: Number(rateModifier),
          tags: tagList,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Create a new skill"
      width={560}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("newSkill.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("newSkill.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
          <Field label={t("newSkill.name")} htmlFor="sk-name">
            <Input
              id="sk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newSkill.namePh")}
              required
              autoFocus
            />
          </Field>

          <Field label={t("newSkill.desc")} htmlFor="sk-desc">
            <Textarea
              id="sk-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("newSkill.descPh")}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-3 gap-[12px]">
            <Field label={t("newSkill.category")}>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as typeof CATEGORIES[number])
                }
              >
                <SelectTrigger
                  aria-label={t("newSkill.category")}
                  className="text-[14px] font-normal normal-case tracking-normal capitalize"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="capitalize"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("newSkill.baseline")} htmlFor="sk-hours">
              <Input
                id="sk-hours"
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={baselineHours}
                onChange={(e) => setBaselineHours(e.target.value)}
                required
              />
            </Field>
            <Field label={t("newSkill.modifier")} htmlFor="sk-mod">
              <Input
                id="sk-mod"
                type="number"
                inputMode="decimal"
                min={0.1}
                step={0.05}
                value={rateModifier}
                onChange={(e) => setRateModifier(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label={t("newSkill.tags")} htmlFor="sk-tags">
            <Input
              id="sk-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="frontend, marketing"
            />
          </Field>
        </div>

        {error ? (
          <p className="px-[24px] pt-[12px] text-[12px] text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary-orange"
            disabled={submitting || !name.trim()}
          >
            {submitting ? t("modal.creating") : t("newSkill.submit")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
