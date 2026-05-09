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

const SERVER_NAME = "fulcru";

type ClientId = "claude" | "codex" | "opencode" | "others";

const CLIENT_TABS: Array<{ id: ClientId; labelKey: string }> = [
  { id: "claude", labelKey: "mcpModal.tab.claude" },
  { id: "codex", labelKey: "mcpModal.tab.codex" },
  { id: "opencode", labelKey: "mcpModal.tab.opencode" },
  { id: "others", labelKey: "mcpModal.tab.others" },
];

function buildSnippet(
  client: ClientId,
  url: string,
  key: string | null,
  shell: "powershell" | "posix",
) {
  const bearer = key ?? "YOUR_KEY";
  if (client === "claude") {
    return `claude mcp add --transport http ${SERVER_NAME} ${url} --header "Authorization: Bearer ${bearer}"`;
  }
  if (client === "codex") {
    // Codex stores only the env var name in ~/.codex/config.toml, so make the
    // env var persistent instead of relying on a temporary shell export.
    if (shell === "powershell") {
      return [
        `$FulcruToken = "${bearer}"`,
        `[Environment]::SetEnvironmentVariable("FULCRU_TOKEN", $FulcruToken, "User")`,
        `$env:FULCRU_TOKEN = $FulcruToken`,
        `codex mcp add ${SERVER_NAME} --url ${url} --bearer-token-env-var FULCRU_TOKEN`,
      ].join("\n");
    }
    return [
      `export FULCRU_TOKEN="${bearer}"`,
      `printf '\\nexport FULCRU_TOKEN="${bearer}"\\n' >> ~/.zshrc`,
      `codex mcp add ${SERVER_NAME} --url ${url} --bearer-token-env-var FULCRU_TOKEN`,
    ].join("\n");
  }
  if (client === "opencode") {
    // opencode uses `mcp` (not `mcpServers`) and requires `type: "remote"`.
    return JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          [SERVER_NAME]: {
            type: "remote",
            url,
            headers: { Authorization: `Bearer ${bearer}` },
          },
        },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      mcpServers: {
        [SERVER_NAME]: {
          url,
          headers: { Authorization: `Bearer ${bearer}` },
        },
      },
    },
    null,
    2,
  );
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
        leadingIcon={
          <span
            className={cn(
              "flex size-[24px] items-center justify-center rounded-[6px]",
              "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
              "text-[var(--color-brand-400)]",
            )}
          >
            <RiPlugLine size={14} />
          </span>
        }
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
  const [client, setClient] = React.useState<ClientId>("claude");
  const [keyState, setKeyState] = React.useState<
    | { phase: "loading" }
    | { phase: "none" }
    | { phase: "stored"; key: StoredKey }
    | { phase: "fresh"; key: FreshKey }
    | { phase: "error"; reason: string }
  >({ phase: "loading" });
  const [generating, setGenerating] = React.useState(false);
  const [shell, setShell] = React.useState<"powershell" | "posix">("posix");

  React.useEffect(() => {
    if (typeof window !== "undefined" && /Win/i.test(window.navigator.platform)) {
      setShell("powershell");
    }
  }, []);

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
  const command = serverUrl
    ? buildSnippet(client, serverUrl, plainKey, shell)
    : "";

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
              "flex size-[36px] shrink-0 items-center justify-center rounded-[8px]",
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
          {/* Key state - never show a stored key plain */}
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
            <div className="flex items-center justify-between gap-[8px] rounded-[6px] bg-[var(--color-bg-tint-3)] px-[12px] py-[10px] ring-1 ring-[var(--color-stroke-soft)]">
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

          {/* Client tabs */}
          <div
            role="tablist"
            aria-label={t("mcpModal.title")}
            className="flex items-center gap-[2px] rounded-[6px] bg-[var(--color-bg-tint-3)] p-[3px] ring-1 ring-[var(--color-stroke-soft)]"
          >
            {CLIENT_TABS.map((tab) => {
              const active = tab.id === client;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setClient(tab.id)}
                  className={cn(
                    "flex-1 rounded-[4px] px-[10px] py-[6px] text-[12.5px] font-medium leading-[18px] transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
                    active
                      ? "bg-[var(--color-bg-surface)] text-[var(--color-text-strong)] shadow-[0_1px_0_var(--color-bg-tint-8)] ring-1 ring-[var(--color-stroke-soft)]"
                      : "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
                  )}
                >
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          {(() => {
            const hintKey =
              client === "codex"
                ? "mcpModal.codex.hint"
                : client === "opencode"
                  ? "mcpModal.opencode.hint"
                  : client === "others"
                    ? "mcpModal.others.hint"
                    : null;
            if (!hintKey) return null;
            return (
              <p className="-mt-[8px] text-[11.5px] leading-[16px] text-[var(--color-text-soft)]">
                {t(hintKey)}
              </p>
            );
          })()}

          {/* Command card */}
          <div
            className={cn(
              "relative rounded-[6px]",
              "bg-[var(--color-bg-tint-3)]",
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
                "hover:bg-[var(--color-bg-tint-6)] hover:text-[var(--color-text-strong)]",
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
          "bg-[var(--color-bg-tint-3)] text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)]",
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
