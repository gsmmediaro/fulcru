"use client";

import * as React from "react";
import {
  RiCheckLine,
  RiClipboardLine,
  RiExternalLinkLine,
  RiPlugLine,
  RiKey2Line,
  RiRefreshLine,
} from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

const SERVER_NAME = "agency-runs";

function buildCommand(url: string, key: string | null) {
  const base = `claude mcp add --transport http ${SERVER_NAME} ${url}`;
  if (!key) return `${base} --header "Authorization: Bearer YOUR_KEY"`;
  return `${base} --header "Authorization: Bearer ${key}"`;
}

export function ConnectMcpButton({
  className,
  variant = "outline",
  size = "sm",
  children,
}: {
  className?: string;
  variant?: "outline" | "primary-orange" | "ghost";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? t("sidebar.connectMcp")}
      </Button>
      <ConnectMcpModal open={open} onOpenChange={setOpen} />
    </>
  );
}

type StoredKey = {
  id: string;
  prefix: string;
  createdAt: string;
};

type FreshKey = StoredKey & { key: string };

function ConnectMcpModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t } = useLocale();
  const [serverUrl, setServerUrl] = React.useState<string>("");
  const [reachable, setReachable] = React.useState<boolean | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [keyState, setKeyState] = React.useState<
    | { phase: "loading" }
    | { phase: "none" }
    | { phase: "stored"; key: StoredKey }
    | { phase: "fresh"; key: FreshKey }
    | { phase: "error"; reason: string }
  >({ phase: "loading" });
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setServerUrl(`${window.location.origin}/api/mcp`);
    }
  }, []);

  React.useEffect(() => {
    if (!open || !serverUrl) return;
    let cancelled = false;
    setReachable(null);
    fetch(serverUrl, { cache: "no-store" })
      .then((r) => {
        if (!cancelled) setReachable(r.ok);
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, serverUrl]);

  // On open: load existing keys (don't auto-generate; user explicitly clicks)
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setKeyState({ phase: "loading" });
    fetch("/api/mcp-keys", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { keys: StoredKey[] };
        if (cancelled) return;
        if (data.keys.length > 0) {
          setKeyState({ phase: "stored", key: data.keys[0] });
        } else {
          setKeyState({ phase: "none" });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setKeyState({ phase: "error", reason: (e as Error).message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function generateKey() {
    setGenerating(true);
    try {
      const res = await fetch("/api/mcp-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "default" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = (await res.json()) as FreshKey;
      setKeyState({ phase: "fresh", key: fresh });
    } catch (e) {
      setKeyState({ phase: "error", reason: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  }

  const plainKey = keyState.phase === "fresh" ? keyState.key.key : null;
  const command = serverUrl ? buildCommand(serverUrl, plainKey) : "";

  async function copyCommand() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  const serverHostPath = serverUrl
    ? serverUrl.replace(/^https?:\/\//, "")
    : "…";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={t("mcpModal.title")}
      width={520}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <div className="flex flex-col">
        <header className="flex items-start gap-[12px] px-[24px] pb-[16px] pt-[24px]">
          <span
            className={cn(
              "flex size-[36px] shrink-0 items-center justify-center rounded-full",
              "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
            )}
          >
            <RiPlugLine size={18} />
          </span>
          <div className="flex flex-col gap-[4px] pt-[2px]">
            <h2 className="text-[18px] font-semibold leading-[24px] tracking-tight text-[var(--color-text-strong)]">
              {t("mcpModal.title")}
            </h2>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("mcpModal.subtitle")}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[20px]">
          {/* Key state — never show a stored key plain */}
          {keyState.phase === "loading" ? (
            <KeyRow
              tone="muted"
              icon={<RiKey2Line size={14} />}
              label={t("mcpModal.keyLoading")}
            />
          ) : keyState.phase === "none" ? (
            <div className="flex items-center justify-between gap-[8px] rounded-[6px] bg-[color-mix(in_oklab,var(--color-accent-orange)_10%,transparent)] px-[12px] py-[10px] ring-1 ring-[color-mix(in_oklab,var(--color-accent-orange)_28%,transparent)]">
              <div className="flex items-center gap-[8px] text-[12px] text-[var(--color-text-strong)]">
                <RiKey2Line
                  size={14}
                  className="text-[var(--color-accent-orange)]"
                />
                <span>{t("mcpModal.keyNone")}</span>
              </div>
              <Button
                type="button"
                variant="primary-orange"
                size="sm"
                onClick={generateKey}
                disabled={generating}
              >
                {generating ? t("mcpModal.keyGenerating") : t("mcpModal.keyGenerate")}
              </Button>
            </div>
          ) : keyState.phase === "stored" ? (
            <div className="flex items-center justify-between gap-[8px] rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)] px-[12px] py-[10px] ring-1 ring-[var(--color-stroke-soft)]">
              <div className="flex items-center gap-[8px] text-[12px] text-[var(--color-text-sub)]">
                <RiKey2Line size={14} className="text-[var(--color-text-soft)]" />
                <span className="font-mono">{keyState.key.prefix}…</span>
                <span className="text-[var(--color-text-soft)]">
                  {t("mcpModal.keyStored")}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leadingIcon={<RiRefreshLine size={12} />}
                onClick={generateKey}
                disabled={generating}
              >
                {generating ? t("mcpModal.keyGenerating") : t("mcpModal.keyNew")}
              </Button>
            </div>
          ) : keyState.phase === "fresh" ? (
            <div className="flex flex-col gap-[6px] rounded-[6px] bg-[color-mix(in_oklab,var(--color-accent-green)_10%,transparent)] px-[12px] py-[10px] ring-1 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]">
              <div className="flex items-center gap-[8px] text-[12px] font-semibold text-[var(--color-accent-green)]">
                <RiKey2Line size={14} />
                <span>{t("mcpModal.keyFresh")}</span>
              </div>
              <p className="text-[11px] leading-[16px] text-[var(--color-text-soft)]">
                {t("mcpModal.keyOnceWarning")}
              </p>
            </div>
          ) : (
            <div className="rounded-[6px] bg-[color-mix(in_oklab,#f87171_10%,transparent)] px-[12px] py-[10px] text-[12px] text-rose-300 ring-1 ring-rose-400/40">
              {t("mcpModal.keyError", { reason: keyState.reason })}
            </div>
          )}

          {/* Command card */}
          <div
            className={cn(
              "relative rounded-[6px]",
              "bg-[color-mix(in_oklab,white_3%,transparent)]",
              "ring-1 ring-[var(--color-stroke-soft)]",
            )}
          >
            <code
              className={cn(
                "block whitespace-pre-wrap break-all px-[14px] py-[14px] pr-[44px]",
                "font-mono text-[12.5px] leading-[18px] text-[var(--color-text-strong)]",
              )}
            >
              {command || "…"}
            </code>
            <button
              type="button"
              onClick={copyCommand}
              disabled={!command}
              aria-label={copied ? t("mcpModal.copied") : t("mcpModal.copy")}
              className={cn(
                "absolute right-[8px] top-[8px] flex size-[28px] items-center justify-center rounded-[4px]",
                "text-[var(--color-text-soft)] transition-colors duration-150",
                "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
                copied && "text-[var(--color-accent-green)]",
                !command && "opacity-40",
              )}
              title={copied ? t("mcpModal.copied") : t("mcpModal.copy")}
            >
              {copied ? <RiCheckLine size={16} /> : <RiClipboardLine size={16} />}
            </button>
          </div>

          {/* Inline server meta */}
          <div className="flex items-center gap-[8px] text-[12px] text-[var(--color-text-soft)]">
            <span
              aria-hidden
              className={cn(
                "size-[6px] shrink-0 rounded-full",
                reachable === true && "bg-[var(--color-accent-green)]",
                reachable === false && "bg-rose-400",
                reachable === null && "bg-[var(--color-text-soft)]",
              )}
            />
            <span className="text-[var(--color-text-soft)]">
              {t("mcpModal.serverLabel")}
            </span>
            <span className="truncate font-mono text-[var(--color-text-strong)]">
              {serverHostPath}
            </span>
            <span className="ml-auto shrink-0 tabular-nums">
              {reachable === true
                ? t("mcpModal.statusOk")
                : reachable === false
                  ? t("mcpModal.statusFail")
                  : t("mcpModal.statusChecking")}
            </span>
          </div>

          <ol className="flex flex-col gap-[8px] text-[12.5px] leading-[18px] text-[var(--color-text-sub)]">
            <Step n={1}>{t("mcpModal.step1")}</Step>
            <Step n={2}>{t("mcpModal.step2")}</Step>
            <Step n={3}>{t("mcpModal.step3")}</Step>
          </ol>
        </div>

        <footer className="flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[20px] py-[12px]">
          <Button
            asChild
            variant="ghost"
            size="sm"
            leadingIcon={<RiExternalLinkLine size={14} />}
          >
            <a href={serverUrl || "/api/mcp"} target="_blank" rel="noreferrer">
              {t("mcpModal.openEndpoint")}
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("mcpModal.close")}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

function KeyRow({
  tone,
  icon,
  label,
}: {
  tone: "muted";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[8px] rounded-[6px] px-[12px] py-[10px] text-[12px]",
        tone === "muted" &&
          "bg-[color-mix(in_oklab,white_3%,transparent)] text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-[10px]">
      <span
        aria-hidden
        className={cn(
          "mt-[1px] flex size-[18px] shrink-0 items-center justify-center rounded-full",
          "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
          "text-[10px] font-semibold tabular-nums text-[var(--color-brand-400)]",
        )}
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
