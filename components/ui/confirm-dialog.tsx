"use client";

import * as React from "react";
import { RiAlertLine } from "@remixicon/react";
import { Modal } from "./modal";
import { Button } from "./button";
import { cn } from "@/lib/cn";

type ConfirmContext = {
  ask: (opts: ConfirmOptions) => Promise<boolean>;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const Ctx = React.createContext<ConfirmContext | null>(null);

type State = ConfirmOptions & {
  open: boolean;
  resolve?: (v: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>({
    open: false,
    title: "",
  });

  const ask = React.useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve });
      }),
    [],
  );

  const close = React.useCallback(
    (result: boolean) => {
      state.resolve?.(result);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state],
  );

  return (
    <Ctx.Provider value={{ ask }}>
      {children}
      <Modal
        open={state.open}
        onOpenChange={(next) => {
          if (!next) close(false);
        }}
        ariaLabel={state.title}
        width={420}
      >
        <div className="flex flex-col gap-[16px] p-[20px]">
          <div className="flex items-start gap-[12px]">
            {state.destructive ? (
              <span
                className={cn(
                  "flex size-[36px] shrink-0 items-center justify-center rounded-full",
                  "bg-[color-mix(in_oklab,#ef4444_18%,transparent)] text-rose-300",
                )}
              >
                <RiAlertLine size={18} />
              </span>
            ) : null}
            <div className="flex min-w-0 flex-col gap-[4px]">
              <h2 className="text-[15px] font-semibold text-[var(--color-text-strong)]">
                {state.title}
              </h2>
              {state.description ? (
                <p className="text-[13px] leading-[1.5] text-[var(--color-text-soft)]">
                  {state.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-end gap-[8px]">
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              {state.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => close(true)}
              className={
                state.destructive ? "bg-rose-500 hover:bg-rose-600" : undefined
              }
              autoFocus
            >
              {state.confirmLabel ?? (state.destructive ? "Delete" : "Confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx.ask;
}
