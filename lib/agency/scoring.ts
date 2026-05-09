import type { ChangeCategory, DifficultyBucket } from "./types";

const CATEGORY_PATTERNS: Array<{ category: ChangeCategory; tokens: RegExp }> = [
  {
    category: "bugfix",
    tokens:
      /\b(bug|fix|fixes|fixing|broken|crash|crashes|regress|regression|issue|hotfix|patch|repair|defect|error|errored|throws|throwing|fail|failing|failure|stack trace|exception|undefined|null pointer|nullref|race|deadlock|stale|leak|memory leak|off[- ]by[- ]one)\b/i,
  },
  {
    category: "performance",
    tokens:
      /\b(perf|performance|slow|slower|fast|faster|speed up|optimi[sz]e|optimi[sz]ation|latency|throughput|cache|caching|throttle|debounce|memo|memoize|n\+1|index(ing)?( strategy)?|hot path|profiling|benchmark)\b/i,
  },
  {
    category: "test",
    tokens:
      /\b(test|tests|testing|e2e|unit test|integration test|spec|specs|jest|vitest|mocha|playwright|cypress|coverage|snapshot|mock|stub|fixture)\b/i,
  },
  {
    category: "docs",
    tokens:
      /\b(doc|docs|documentation|readme|changelog|release notes|comments?|jsdoc|tsdoc|guide|tutorial)\b/i,
  },
  {
    category: "infra",
    tokens:
      /\b(deploy|deployment|ci|cd|ci\/cd|github actions|workflow|docker|dockerfile|kubernetes|k8s|terraform|infra|infrastructure|migration|migrations?|env|environment variable|secret|nginx|cloudflare|vercel|fly\.io|railway|aws|gcp|azure|monitoring|alerting|telemetry|datadog|sentry)\b/i,
  },
  {
    category: "refactor",
    tokens:
      /\b(refactor|refactoring|restructure|restructuring|rename|renaming|cleanup|clean up|tidy|simplify|simplification|extract|inline|consolidat|deduplicat|reorgani[sz]e|reorgani[sz]ation|split (file|function|component)|merge (file|function|component)|reduce duplication|dry up)\b/i,
  },
  {
    category: "research",
    tokens:
      /\b(research|investigate|investigation|explore|exploration|spike|prototype|prototyping|evaluate|comparison|compare options|trade[- ]offs?|feasibility|architecture (diagram|review)|design doc|adr)\b/i,
  },
];

const FEATURE_HINTS =
  /\b(add|adding|implement|implementing|create|creating|build|building|introduce|introducing|new (feature|page|route|endpoint|component|widget|screen|flow|integration)|support for|enable|wire up|hook up|integrate)\b/i;

export function classifyChangeCategory(
  prompt: string | null | undefined,
): ChangeCategory {
  const t = (prompt ?? "").trim();
  if (!t) return "feature";
  // First pattern that matches wins, ordered by specificity.
  for (const { category, tokens } of CATEGORY_PATTERNS) {
    if (tokens.test(t)) return category;
  }
  if (FEATURE_HINTS.test(t)) return "feature";
  return "feature";
}

const CATEGORY_LABEL: Record<ChangeCategory, string> = {
  feature: "Feature",
  bugfix: "Bugfix",
  refactor: "Refactor",
  infra: "Infra",
  docs: "Docs",
  test: "Tests",
  performance: "Perf",
  research: "Research",
};

const CATEGORY_COLOR: Record<ChangeCategory, string> = {
  feature: "#FF7A1A",
  bugfix: "#EF4444",
  refactor: "#A78BFA",
  infra: "#0EA5E9",
  docs: "#94A3B8",
  test: "#10B981",
  performance: "#F59E0B",
  research: "#22D3EE",
};

export function categoryLabel(c: ChangeCategory | null | undefined): string {
  if (!c) return "Uncategorized";
  return CATEGORY_LABEL[c];
}

export function categoryColor(c: ChangeCategory | null | undefined): string {
  if (!c) return "#94A3B8";
  return CATEGORY_COLOR[c];
}

export type DifficultyInputs = {
  totalTokens: number;
  activeSec: number;
  eventCount: number;
};

export type DifficultyHistory = {
  totalTokens: number[];
  activeSec: number[];
  eventCount: number[];
};

function percentileRank(sorted: number[], value: number): number {
  // sorted ascending. Returns the share of values strictly below `value`,
  // plus half the share of equal values, in [0,1]. Returns 0.5 if the
  // history is empty (no data is not low or high).
  const n = sorted.length;
  if (n === 0) return 0.5;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const below = lo;
  let equal = 0;
  while (below + equal < n && sorted[below + equal] === value) equal++;
  return (below + equal / 2) / n;
}

function asc(arr: number[]): number[] {
  return [...arr].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
}

export function computeDifficulty(
  inputs: DifficultyInputs,
  history: DifficultyHistory,
): { score: number; bucket: DifficultyBucket } {
  const tokensSorted = asc(history.totalTokens);
  const activeSorted = asc(history.activeSec);
  const eventsSorted = asc(history.eventCount);

  const tokensP = percentileRank(tokensSorted, inputs.totalTokens);
  const activeP = percentileRank(activeSorted, inputs.activeSec);
  const eventsP = percentileRank(eventsSorted, inputs.eventCount);

  // Tokens and active time carry more signal than event count.
  const score = Math.max(
    0,
    Math.min(1, 0.4 * tokensP + 0.4 * activeP + 0.2 * eventsP),
  );

  const bucket: DifficultyBucket =
    score < 0.2
      ? "trivial"
      : score < 0.5
        ? "normal"
        : score < 0.75
          ? "moderate"
          : score < 0.9
            ? "hard"
            : "very_hard";
  return { score: Number(score.toFixed(3)), bucket };
}

export function difficultyBucket(
  score: number | null | undefined,
): DifficultyBucket | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score < 0.2) return "trivial";
  if (score < 0.5) return "normal";
  if (score < 0.75) return "moderate";
  if (score < 0.9) return "hard";
  return "very_hard";
}

const BUCKET_LABEL: Record<DifficultyBucket, string> = {
  trivial: "Trivial",
  normal: "Normal",
  moderate: "Moderate",
  hard: "Hard",
  very_hard: "Very hard",
};

export function bucketLabel(b: DifficultyBucket | null | undefined): string {
  if (!b) return "Unscored";
  return BUCKET_LABEL[b];
}
