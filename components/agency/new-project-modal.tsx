"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiAddLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, Input, Textarea } from "@/components/agency/new-client-modal";
import { useLocale } from "@/lib/i18n/provider";
import type { Client } from "@/lib/agency/types";

export function NewProjectButton({
  clients,
  defaultClientId,
}: {
  clients: Client[];
  defaultClientId?: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("projects.new")}
      </Button>
      <NewProjectModal
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        defaultClientId={defaultClientId}
      />
    </>
  );
}

function NewProjectModal({
  open,
  onOpenChange,
  clients,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  clients: Client[];
  defaultClientId?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [clientId, setClientId] = React.useState(
    defaultClientId ?? clients[0]?.id ?? "",
  );
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#FF7A1A");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? "");
      setName("");
      setDescription("");
      setColor("#FF7A1A");
      setError(null);
      setSubmitting(false);
    }
  }, [open, clients, defaultClientId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          description: description || undefined,
          color,
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
      ariaLabel="Create a new project"
      width={520}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("newProject.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("newProject.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
          <Field label={t("newProject.client")}>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger
                aria-label={t("newProject.client")}
                className="text-[14px] font-normal normal-case tracking-normal"
              >
                <SelectValue placeholder={t("newProject.clientPh")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("newProject.name")} htmlFor="pj-name">
            <Input
              id="pj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newProject.namePh")}
              required
              autoFocus
            />
          </Field>

          <Field label={t("newProject.desc")} htmlFor="pj-desc">
            <Textarea
              id="pj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("newProject.descPh")}
              rows={3}
            />
          </Field>

          <Field label={t("newProject.color")}>
            <ColorPicker
              value={color}
              onChange={setColor}
              ariaLabel={t("newProject.color")}
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
            disabled={submitting || !name.trim() || !clientId}
          >
            {submitting ? t("modal.creating") : t("newProject.submit")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
