// Re-run recomputeBillable for one user using the user's saved settings.
// Mirrors the formula in lib/agency/store.ts recomputeBillable, including
// the cost_usd contribution to time_only mode.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 0) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const USER_ID = process.argv[2];
if (!USER_ID) {
  console.error("usage: node scripts/recompute-billable.mjs <userId>");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const [settings] = await sql`
  SELECT default_bill_mode, billing_style, bill_active_multiplier,
         use_quality_confidence, use_difficulty_weight, use_category_weight
  FROM app_user WHERE id = ${USER_ID}
`;
const mode = settings.default_bill_mode ?? "time_only";
const mult = settings.billing_style === "pure_active" ? 1 : Number(settings.bill_active_multiplier ?? 1);
const useQ = !!settings.use_quality_confidence;
const useD = !!settings.use_difficulty_weight;
const useC = !!settings.use_category_weight;
const pureActive = settings.billing_style === "pure_active";
console.log(`mode=${mode} mult=${mult} flags: Q=${useQ} D=${useD} C=${useC}`);

const CATEGORY_WEIGHTS = {
  bugfix: 1.0, feature: 1.0, performance: 1.1, infra: 1.05,
  refactor: 0.95, test: 0.95, research: 0.9, docs: 0.85,
};

function effortMultiplier({ qualityConfidence, difficultyScore, changeCategory }) {
  if (pureActive) return 1;
  let m = 1;
  if (useQ) {
    const q = qualityConfidence ?? 1;
    m *= Math.max(0.3, Math.min(1, q));
  }
  if (useD && difficultyScore != null) {
    const score = Math.max(0, Math.min(1, difficultyScore));
    m *= Math.min(1.5, 1 + score * 0.5);
  }
  if (useC && changeCategory) {
    m *= CATEGORY_WEIGHTS[changeCategory] ?? 1;
  }
  return Number(m.toFixed(4));
}

const runs = await sql`
  SELECT id, runtime_sec, active_sec, baseline_hours, rate_usd, cost_usd, billable_usd,
         difficulty_score, change_category, quality_confidence
  FROM run
  WHERE user_id = ${USER_ID} AND status = 'shipped' AND kind <> 'break'
  ORDER BY started_at
`;

let before = 0, after = 0;
for (const r of runs) {
  const rate = Number(r.rate_usd);
  const baseline = Number(r.baseline_hours);
  const cost = Number(r.cost_usd);
  const activeHours = (Number(r.active_sec) || Number(r.runtime_sec)) / 3600;
  const runtimeHours = Number(r.runtime_sec) / 3600;
  const effort = effortMultiplier({
    qualityConfidence: r.quality_confidence == null ? 1 : Number(r.quality_confidence),
    difficultyScore: r.difficulty_score == null ? undefined : Number(r.difficulty_score),
    changeCategory: r.change_category ?? undefined,
  });
  let billable = 0;
  if (mode === "baseline") {
    billable = baseline * rate * effort;
  } else if (mode === "time_plus_tokens") {
    billable = runtimeHours * rate * effort + cost;
  } else {
    billable = activeHours * mult * rate * effort;
  }
  const newB = Number(billable.toFixed(2));
  before += Number(r.billable_usd);
  after += newB;
  await sql`UPDATE run SET billable_usd = ${newB}, pricing_mode = ${mode} WHERE id = ${r.id}`;
}

console.log(`\nTotal billable: $${before.toFixed(2)} -> $${after.toFixed(2)}`);
