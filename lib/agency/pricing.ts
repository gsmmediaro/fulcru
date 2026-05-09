import type { AgencySettings, ChangeCategory, Run } from "./types";
import { CATEGORY_WEIGHTS } from "./types";

export type ModelPricing = {
  inputPerM: number;
  outputPerM: number;
  cacheWritePerM: number;
  cacheReadPerM: number;
};

const OPUS_4_X: ModelPricing = {
  inputPerM: 15,
  outputPerM: 75,
  cacheWritePerM: 18.75,
  cacheReadPerM: 1.5,
};

const OPUS_4_X_1M: ModelPricing = {
  inputPerM: 22.5,
  outputPerM: 112.5,
  cacheWritePerM: 28.125,
  cacheReadPerM: 2.25,
};

const SONNET_4_X: ModelPricing = {
  inputPerM: 3,
  outputPerM: 15,
  cacheWritePerM: 3.75,
  cacheReadPerM: 0.3,
};

const SONNET_4_X_1M: ModelPricing = {
  inputPerM: 6,
  outputPerM: 22.5,
  cacheWritePerM: 7.5,
  cacheReadPerM: 0.6,
};

const HAIKU_4_X: ModelPricing = {
  inputPerM: 1,
  outputPerM: 5,
  cacheWritePerM: 1.25,
  cacheReadPerM: 0.1,
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": OPUS_4_X,
  "claude-opus-4-7[1m]": OPUS_4_X_1M,
  "claude-opus-4-6": OPUS_4_X,
  "claude-opus-4-5": OPUS_4_X,
  "claude-sonnet-4-6": SONNET_4_X,
  "claude-sonnet-4-5": SONNET_4_X,
  "claude-sonnet-4-6[1m]": SONNET_4_X_1M,
  "claude-haiku-4-5": HAIKU_4_X,
  "claude-haiku-4-5-20251001": HAIKU_4_X,
};

export const DEFAULT_PRICING: ModelPricing = OPUS_4_X;

export function priceFor(model: string | undefined): ModelPricing {
  if (!model) return DEFAULT_PRICING;
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  const base = model.replace(/\[.*\]$/, "").replace(/-\d{8}$/, "");
  if (MODEL_PRICING[base]) return MODEL_PRICING[base];
  if (model.includes("opus")) return model.includes("[1m]") ? OPUS_4_X_1M : OPUS_4_X;
  if (model.includes("sonnet")) return model.includes("[1m]") ? SONNET_4_X_1M : SONNET_4_X;
  if (model.includes("haiku")) return HAIKU_4_X;
  return DEFAULT_PRICING;
}

export function tokenCostUsd(
  model: string | undefined,
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  },
): number {
  const p = priceFor(model);
  return (
    ((usage.input_tokens ?? 0) * p.inputPerM +
      (usage.output_tokens ?? 0) * p.outputPerM +
      (usage.cache_creation_input_tokens ?? 0) * p.cacheWritePerM +
      (usage.cache_read_input_tokens ?? 0) * p.cacheReadPerM) /
    1_000_000
  );
}

export type EffortInputs = {
  category?: ChangeCategory;
  difficultyScore?: number;
  qualityConfidence?: number;
};

/**
 * Compute the effort multiplier the user agreed to in settings.
 *
 * pure_active mode short-circuits to 1.0 - the user wants raw active hours
 * billed and nothing more. effort_adjusted layers in each opt-in flag:
 *   - quality_confidence: shrinks billable when post-hoc signals fire
 *   - difficulty_weight: 1 + score * 0.5, capped at 1.5x
 *   - category_weight: per-category fixed weights from CATEGORY_WEIGHTS
 *
 * The function never multiplies all five "frosting" factors at once on its
 * own - each layer is opt-in so total fanout stays bounded and predictable
 * (max ~1.65x with everything on).
 */
export function effortMultiplier(
  settings: Pick<
    AgencySettings,
    | "billingStyle"
    | "useQualityConfidence"
    | "useDifficultyWeight"
    | "useCategoryWeight"
  >,
  inputs: EffortInputs,
): number {
  if (settings.billingStyle === "pure_active") return 1;
  let m = 1;
  if (settings.useQualityConfidence) {
    const q = inputs.qualityConfidence ?? 1;
    m *= Math.max(0.3, Math.min(1, q));
  }
  if (settings.useDifficultyWeight && inputs.difficultyScore != null) {
    const score = Math.max(0, Math.min(1, inputs.difficultyScore));
    m *= Math.min(1.5, 1 + score * 0.5);
  }
  if (settings.useCategoryWeight && inputs.category) {
    m *= CATEGORY_WEIGHTS[inputs.category] ?? 1;
  }
  return Number(m.toFixed(4));
}

export function effortMultiplierForRun(
  settings: Pick<
    AgencySettings,
    | "billingStyle"
    | "useQualityConfidence"
    | "useDifficultyWeight"
    | "useCategoryWeight"
  >,
  run: Pick<Run, "changeCategory" | "difficultyScore" | "qualityConfidence">,
): number {
  return effortMultiplier(settings, {
    category: run.changeCategory,
    difficultyScore: run.difficultyScore,
    qualityConfidence: run.qualityConfidence,
  });
}
