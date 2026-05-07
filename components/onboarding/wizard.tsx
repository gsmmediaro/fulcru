"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/provider";
import { Stepper } from "./stepper";
import { StepAgencySize } from "./step-agency-size";
import { StepService } from "./step-service";
import { StepUseCases } from "./step-use-cases";
import { StepAttribution } from "./step-attribution";
import type {
  AgencySize,
  Attribution,
  ConcurrentClients,
  OnboardingPayload,
  ServiceCategory,
  UseCase,
} from "@/lib/onboarding/types";

const TOTAL_STEPS = 4;

type State = {
  step: 1 | 2 | 3 | 4;
  agencySize?: AgencySize;
  concurrentClients?: ConcurrentClients;
  serviceCategory?: ServiceCategory;
  serviceCategoryOther?: string;
  useCases: UseCase[];
  attribution?: Attribution;
  attributionOther?: string;
  submitting: boolean;
  error?: string;
};

type Action =
  | { type: "back" }
  | { type: "next" }
  | { type: "jump"; step: 1 | 2 | 3 | 4 }
  | { type: "set"; patch: Partial<State> }
  | { type: "submit" }
  | { type: "submitDone" }
  | { type: "submitError"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "back":
      return state.step > 1 ? { ...state, step: (state.step - 1) as 1 | 2 | 3 | 4 } : state;
    case "next":
      return state.step < TOTAL_STEPS
        ? { ...state, step: (state.step + 1) as 1 | 2 | 3 | 4 }
        : state;
    case "jump":
      return action.step <= state.step ? { ...state, step: action.step } : state;
    case "set":
      return { ...state, ...action.patch };
    case "submit":
      return { ...state, submitting: true, error: undefined };
    case "submitDone":
      return { ...state, submitting: false };
    case "submitError":
      return { ...state, submitting: false, error: action.error };
    default:
      return state;
  }
}

export function Wizard() {
  const router = useRouter();
  const { t } = useLocale();
  const [state, dispatch] = React.useReducer(reducer, {
    step: 1,
    useCases: [],
    submitting: false,
  } as State);

  const isStepValid = React.useMemo(() => {
    switch (state.step) {
      case 1:
        return !!state.agencySize && !!state.concurrentClients;
      case 2:
        return (
          !!state.serviceCategory &&
          (state.serviceCategory !== "other" ||
            (state.serviceCategoryOther?.trim().length ?? 0) > 0)
        );
      case 3:
        return state.useCases.length > 0;
      case 4:
        return (
          !!state.attribution &&
          (state.attribution !== "other" ||
            (state.attributionOther?.trim().length ?? 0) > 0)
        );
      default:
        return false;
    }
  }, [state]);

  const onPrimary = React.useCallback(async () => {
    if (!isStepValid || state.submitting) return;
    if (state.step < TOTAL_STEPS) {
      dispatch({ type: "next" });
      return;
    }
    dispatch({ type: "submit" });
    const payload: OnboardingPayload = {
      agencySize: state.agencySize!,
      concurrentClients: state.concurrentClients!,
      serviceCategory: state.serviceCategory!,
      serviceCategoryOther: state.serviceCategoryOther,
      useCases: state.useCases,
      attribution: state.attribution!,
      attributionOther: state.attributionOther,
    };
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        dispatch({ type: "submitError", error: text || "submit failed" });
        return;
      }
      dispatch({ type: "submitDone" });
      router.push("/agency");
      router.refresh();
    } catch (err) {
      dispatch({
        type: "submitError",
        error: err instanceof Error ? err.message : "network error",
      });
    }
  }, [isStepValid, state, router]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && isStepValid && !state.submitting) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        onPrimary();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStepValid, state.submitting, onPrimary]);

  return (
    <article
      className="modal-rise w-[480px] max-w-[calc(100vw-32px)] rounded-[12px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)] shadow-[var(--shadow-regular-lg)]"
      aria-label="Onboarding"
    >
      <header className="flex flex-col gap-[20px] px-[28px] pb-[20px] pt-[28px]">
        <Stepper
          total={TOTAL_STEPS}
          current={state.step}
          onJumpBack={(s) => dispatch({ type: "jump", step: s as 1 | 2 | 3 | 4 })}
        />
      </header>

      <div key={state.step} className="modal-rise px-[28px] pb-[16px]">
        {state.step === 1 ? (
          <StepAgencySize
            agencySize={state.agencySize}
            concurrentClients={state.concurrentClients}
            onAgencySize={(v) => dispatch({ type: "set", patch: { agencySize: v } })}
            onConcurrent={(v) =>
              dispatch({ type: "set", patch: { concurrentClients: v } })
            }
          />
        ) : null}
        {state.step === 2 ? (
          <StepService
            value={state.serviceCategory}
            other={state.serviceCategoryOther}
            onChange={(v, other) =>
              dispatch({
                type: "set",
                patch: { serviceCategory: v, serviceCategoryOther: other },
              })
            }
          />
        ) : null}
        {state.step === 3 ? (
          <StepUseCases
            value={state.useCases}
            onChange={(v) => dispatch({ type: "set", patch: { useCases: v } })}
          />
        ) : null}
        {state.step === 4 ? (
          <StepAttribution
            value={state.attribution}
            other={state.attributionOther}
            onChange={(v, other) =>
              dispatch({
                type: "set",
                patch: { attribution: v, attributionOther: other },
              })
            }
          />
        ) : null}
      </div>

      {state.error ? (
        <p className="px-[28px] pb-[8px] text-[12px] text-[var(--color-accent-red)]">
          {state.error}
        </p>
      ) : null}

      <footer className="flex items-center justify-between gap-[8px] border-t border-[var(--color-stroke-soft)] px-[20px] py-[12px]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "back" })}
          className={state.step === 1 ? "invisible" : ""}
          leadingIcon={<RiArrowLeftSLine size={14} />}
        >
          {t("onb.back")}
        </Button>
        <Button
          variant="primary-orange"
          size="lg"
          onClick={onPrimary}
          disabled={!isStepValid || state.submitting}
          trailingIcon={
            state.step === TOTAL_STEPS ? (
              <RiCheckLine size={14} />
            ) : (
              <RiArrowRightSLine size={14} />
            )
          }
        >
          {state.step === TOTAL_STEPS ? t("onb.finish") : t("onb.next")}
        </Button>
      </footer>
    </article>
  );
}
