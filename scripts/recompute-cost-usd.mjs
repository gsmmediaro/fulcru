// Recompute cost_usd on every shipped run from tokens + model parsed
// from the notes column. Existing runs were imported with cost_usd=0.

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
  console.error("usage: node scripts/recompute-cost-usd.mjs <userId>");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const PRICING = {
  "claude-opus-4-7": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-opus-4-7[1m]": { in: 22.5, out: 112.5, cw: 28.125, cr: 2.25 },
  "claude-opus-4-6": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-opus-4-5": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-sonnet-4-6": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
  "claude-sonnet-4-5": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
  "claude-sonnet-4-6[1m]": { in: 6, out: 22.5, cw: 7.5, cr: 0.6 },
  "claude-haiku-4-5": { in: 1, out: 5, cw: 1.25, cr: 0.1 },
  "gpt-5.5": { in: 5, out: 30, cw: 0, cr: 0.5 },
  "gpt-5.4": { in: 2.5, out: 15, cw: 0, cr: 0.25 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5, cw: 0, cr: 0.075 },
  "gpt-5.3-codex": { in: 2.5, out: 15, cw: 0, cr: 0.25 },
  "gpt-5.2": { in: 1.25, out: 10, cw: 0, cr: 0.125 },
  "gpt-5": { in: 1.25, out: 10, cw: 0, cr: 0.125 },
};

function priceFor(model) {
  if (!model) return PRICING["claude-opus-4-7"];
  if (PRICING[model]) return PRICING[model];
  const base = model.replace(/\[.*\]$/, "").replace(/-\d{8}$/, "");
  if (PRICING[base]) return PRICING[base];
  if (model.includes("opus")) return model.includes("[1m]") ? PRICING["claude-opus-4-7[1m]"] : PRICING["claude-opus-4-7"];
  if (model.includes("sonnet")) return model.includes("[1m]") ? PRICING["claude-sonnet-4-6[1m]"] : PRICING["claude-sonnet-4-6"];
  if (model.includes("haiku")) return PRICING["claude-haiku-4-5"];
  if (model.includes("gpt-5.5")) return PRICING["gpt-5.5"];
  if (model.includes("gpt-5.4-mini")) return PRICING["gpt-5.4-mini"];
  if (model.includes("gpt-5.4") || model.includes("gpt-5.3-codex")) return PRICING["gpt-5.4"];
  if (model.includes("gpt-5.2") || model.includes("gpt-5")) return PRICING["gpt-5.2"];
  return PRICING["claude-opus-4-7"];
}

function modelFromNotes(notes) {
  if (!notes) return undefined;
  const m = notes.match(/model:([^\s,]+)/);
  return m?.[1];
}

const runs = await sql`
  SELECT id, prompt, agent_name, notes,
         tokens_in, tokens_out, cache_hits,
         cost_usd, billable_usd,
         active_sec, runtime_sec, rate_usd, baseline_hours,
         pricing_mode
  FROM run
  WHERE user_id = ${USER_ID} AND status = 'shipped'
  ORDER BY started_at
`;

console.log(`Recomputing cost_usd for ${runs.length} runs...`);
let totalCostBefore = 0, totalCostAfter = 0;

for (const r of runs) {
  const model = modelFromNotes(r.notes);
  const p = priceFor(model);
  // tokens_in in DB = input + cache_write (per importSessionAsRun).
  // We have no separation, so price the whole tokens_in column at the input
  // rate. cache_hits column = cache_read tokens.
  const cost =
    (Number(r.tokens_in) * p.in +
      Number(r.tokens_out) * p.out +
      Number(r.cache_hits) * p.cr) /
    1_000_000;
  const newCost = Number(cost.toFixed(4));
  totalCostBefore += Number(r.cost_usd);
  totalCostAfter += newCost;

  await sql`
    UPDATE run
    SET cost_usd = ${newCost}
    WHERE id = ${r.id}
  `;
  console.log(
    `  ${r.id}  ${(model ?? "?").padEnd(20)}  cost ${Number(r.cost_usd).toFixed(2).padStart(7)} -> ${newCost.toFixed(2).padStart(7)}  ${(r.prompt ?? "").slice(0, 50)}`,
  );
}

console.log(`\nTotal cost: $${totalCostBefore.toFixed(2)} -> $${totalCostAfter.toFixed(2)}`);
