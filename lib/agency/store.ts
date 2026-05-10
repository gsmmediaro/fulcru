import { sql } from "@/lib/db";
import type {
  AgencySettings,
  Approval,
  ApprovalStatus,
  ChangeCategory,
  Client,
  CwdMapping,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  LeverageSnapshot,
  Project,
  QualitySignal,
  QualitySignalKind,
  Run,
  RunEvent,
  RunEventKind,
  RunKind,
  RunStatus,
  Skill,
  SkillCategory,
} from "./types";
import { classifyChangeCategory, computeDifficulty } from "./scoring";
import { effortMultiplierForRun } from "./pricing";

const DAY = 24 * 60 * 60 * 1000;

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function isoOrUndef(v: unknown): string | undefined {
  if (v == null) return undefined;
  return iso(v);
}

type ClientRow = {
  id: string;
  name: string;
  initials: string;
  accent_color: string;
  hourly_rate: string | number;
  email: string | null;
  address: string | null;
  cc_recipients: string[] | null;
  note: string | null;
  created_at: string;
};
function mapClient(r: ClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials,
    accentColor: r.accent_color,
    hourlyRate: num(r.hourly_rate),
    email: r.email ?? undefined,
    address: r.address ?? undefined,
    ccRecipients: r.cc_recipients ?? undefined,
    note: r.note ?? undefined,
    createdAt: iso(r.created_at),
  };
}

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
};
function mapProject(r: ProjectRow): Project {
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color ?? "#FF7A1A",
    createdAt: iso(r.created_at),
  };
}

type SkillRow = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  baseline_hours: string | number;
  rate_modifier: string | number;
  tags: string[];
};
function mapSkill(r: SkillRow): Skill {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    baselineHours: num(r.baseline_hours),
    rateModifier: num(r.rate_modifier),
    tags: r.tags ?? [],
  };
}

type RunRow = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  skill_id: string;
  agent_name: string;
  status: RunStatus;
  kind: RunKind;
  prompt: string | null;
  cwd: string | null;
  pricing_mode: "baseline" | "time_plus_tokens";
  started_at: string;
  ended_at: string | null;
  runtime_sec: number;
  active_sec: number;
  tokens_in: number;
  tokens_out: number;
  cache_hits: number;
  cost_usd: string | number;
  baseline_hours: string | number;
  rate_usd: string | number;
  billable_usd: string | number;
  deliverable_url: string | null;
  notes: string | null;
  unsorted?: boolean | null;
  difficulty_score?: string | number | null;
  change_category?: string | null;
  quality_confidence?: string | number | null;
  impact_note?: string | null;
};

const KNOWN_CATEGORIES: ChangeCategory[] = [
  "feature",
  "bugfix",
  "refactor",
  "infra",
  "docs",
  "test",
  "performance",
  "research",
];

function asCategory(v: string | null | undefined): ChangeCategory | undefined {
  if (!v) return undefined;
  return (KNOWN_CATEGORIES as readonly string[]).includes(v)
    ? (v as ChangeCategory)
    : undefined;
}

function mapRun(r: RunRow): Run {
  return {
    id: r.id,
    clientId: r.client_id ?? undefined,
    projectId: r.project_id ?? undefined,
    skillId: r.skill_id,
    agentName: r.agent_name,
    status: r.status,
    kind: (r.kind ?? "mcp") as RunKind,
    prompt: r.prompt ?? undefined,
    cwd: r.cwd ?? undefined,
    pricingMode: r.pricing_mode,
    startedAt: iso(r.started_at),
    endedAt: isoOrUndef(r.ended_at),
    runtimeSec: r.runtime_sec,
    activeSec: r.active_sec,
    tokensIn: r.tokens_in,
    tokensOut: r.tokens_out,
    cacheHits: r.cache_hits,
    costUsd: num(r.cost_usd),
    baselineHours: num(r.baseline_hours),
    rateUsd: num(r.rate_usd),
    billableUsd: num(r.billable_usd),
    deliverableUrl: r.deliverable_url ?? undefined,
    notes: r.notes ?? undefined,
    unsorted: Boolean(r.unsorted),
    difficultyScore:
      r.difficulty_score == null ? undefined : num(r.difficulty_score),
    changeCategory: asCategory(r.change_category),
    qualityConfidence:
      r.quality_confidence == null ? 1 : num(r.quality_confidence),
    impactNote: r.impact_note ?? undefined,
  };
}

type QualitySignalRow = {
  id: string;
  run_id: string;
  kind: QualitySignalKind;
  reason: string | null;
  delta: string | number;
  source: "auto" | "manual";
  related_run_id: string | null;
  created_at: string;
};
function mapQualitySignal(r: QualitySignalRow): QualitySignal {
  return {
    id: r.id,
    runId: r.run_id,
    kind: r.kind,
    reason: r.reason ?? undefined,
    delta: num(r.delta),
    source: r.source,
    relatedRunId: r.related_run_id ?? undefined,
    createdAt: iso(r.created_at),
  };
}

type RunEventRow = {
  id: string;
  run_id: string;
  ts: string;
  kind: RunEventKind;
  label: string;
  detail: string | null;
  duration_ms: number | null;
};
function mapRunEvent(r: RunEventRow): RunEvent {
  return {
    id: r.id,
    runId: r.run_id,
    ts: iso(r.ts),
    kind: r.kind,
    label: r.label,
    detail: r.detail ?? undefined,
    durationMs: r.duration_ms ?? undefined,
  };
}

type ApprovalRow = {
  id: string;
  run_id: string;
  question: string;
  context: string | null;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};
function mapApproval(r: ApprovalRow): Approval {
  return {
    id: r.id,
    runId: r.run_id,
    question: r.question,
    context: r.context ?? undefined,
    status: r.status,
    createdAt: iso(r.created_at),
    resolvedAt: isoOrUndef(r.resolved_at),
    resolvedBy: r.resolved_by ?? undefined,
  };
}

type InvoiceRow = {
  id: string;
  client_id: string;
  number: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  line_items: unknown;
  subtotal_usd: string | number;
  tax_usd: string | number;
  total_usd: string | number;
  subject: string | null;
  notes: string | null;
  bill_from_name: string | null;
  bill_from_address: string | null;
  bill_from_email: string | null;
  bill_to_name: string | null;
  bill_to_address: string | null;
  bill_to_email: string | null;
  bill_to_cc_emails: string[] | null;
  discount_amount: string | number;
  tax_pct: string | number;
  recurring_enabled: boolean;
  recurring_recurrence: string | null;
  recurring_next_issue: string | null;
};

function normalizeLineItem(raw: unknown): InvoiceLineItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // Legacy shape: {runId, skillName, description, hours, rateUsd, amountUsd}
  if ("hours" in r || "rateUsd" in r || "amountUsd" in r) {
    const quantity = num(r.hours);
    const unitPrice = num(r.rateUsd);
    return {
      type: "service",
      description: typeof r.description === "string" ? r.description : "",
      quantity,
      unitPrice,
      amount: num(r.amountUsd) || quantity * unitPrice,
      runId: typeof r.runId === "string" ? r.runId : undefined,
      skillName: typeof r.skillName === "string" ? r.skillName : undefined,
    };
  }
  // New shape
  const type = r.type === "product" ? "product" : "service";
  const quantity = num(r.quantity);
  const unitPrice = num(r.unitPrice);
  return {
    type,
    description: typeof r.description === "string" ? r.description : "",
    quantity,
    unitPrice,
    amount: num(r.amount) || quantity * unitPrice,
    runId: typeof r.runId === "string" ? r.runId : undefined,
    skillName: typeof r.skillName === "string" ? r.skillName : undefined,
  };
}

function mapInvoice(r: InvoiceRow): Invoice {
  const items = Array.isArray(r.line_items)
    ? (r.line_items
        .map(normalizeLineItem)
        .filter(Boolean) as InvoiceLineItem[])
    : [];
  const recurrence = r.recurring_recurrence;
  return {
    id: r.id,
    clientId: r.client_id,
    number: r.number,
    status: r.status,
    periodStart: iso(r.period_start),
    periodEnd: iso(r.period_end),
    issuedAt: isoOrUndef(r.issued_at),
    dueAt: isoOrUndef(r.due_at),
    paidAt: isoOrUndef(r.paid_at),
    lineItems: items,
    subtotalUsd: num(r.subtotal_usd),
    taxUsd: num(r.tax_usd),
    totalUsd: num(r.total_usd),
    subject: r.subject ?? undefined,
    notes: r.notes ?? undefined,
    billFromName: r.bill_from_name ?? undefined,
    billFromAddress: r.bill_from_address ?? undefined,
    billFromEmail: r.bill_from_email ?? undefined,
    billToName: r.bill_to_name ?? undefined,
    billToAddress: r.bill_to_address ?? undefined,
    billToEmail: r.bill_to_email ?? undefined,
    billToCcEmails: r.bill_to_cc_emails ?? undefined,
    discountAmount: num(r.discount_amount),
    taxPct: num(r.tax_pct),
    recurringEnabled: !!r.recurring_enabled,
    recurringRecurrence:
      recurrence === "weekly" ||
      recurrence === "monthly" ||
      recurrence === "quarterly" ||
      recurrence === "yearly"
        ? recurrence
        : undefined,
    recurringNextIssue: r.recurring_next_issue ?? undefined,
  };
}

async function ensureAppUser(userId: string) {
  await sql`
    INSERT INTO app_user (id) VALUES (${userId})
    ON CONFLICT (id) DO NOTHING
  `;
}

async function ensureDefaultSkill(userId: string): Promise<string> {
  const existing = (await sql`
    SELECT id FROM skill WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
  `) as Array<{ id: string }>;
  if (existing[0]) return existing[0].id;
  const id = genId("skl");
  await sql`
    INSERT INTO skill (id, user_id, name, description, category, baseline_hours, rate_modifier, tags)
    VALUES (${id}, ${userId}, 'General work', 'Auto-created default for manual time entries', 'engineering', 1, 1, ${[]})
  `;
  return id;
}

type AppUserRow = {
  default_hourly_rate: string | number | null;
  business_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_currency: string;
  ai_cost_mode: string;
  ai_subscription_monthly_usd: string | number;
  default_bill_mode: string;
  bill_active_multiplier: string | number;
  billing_style: string | null;
  use_quality_confidence: boolean | null;
  use_difficulty_weight: boolean | null;
  use_category_weight: boolean | null;
  billing_onboarded_at: string | null;
  theme: string | null;
};

function asCostMode(v: string): "per_token" | "subscription" {
  return v === "per_token" ? "per_token" : "subscription";
}
function asBillMode(
  v: string,
): "time_only" | "time_plus_tokens" | "baseline" {
  if (v === "time_plus_tokens" || v === "baseline") return v;
  return "time_only";
}
function asBillingStyle(
  v: string | null | undefined,
): "pure_active" | "effort_adjusted" {
  return v === "pure_active" ? "pure_active" : "effort_adjusted";
}

function asThemePref(
  v: string | null | undefined,
): "auto" | "light" | "dark" {
  if (v === "auto" || v === "light") return v;
  return "dark";
}

function mapSettings(r: AppUserRow): AgencySettings {
  return {
    defaultHourlyRate:
      r.default_hourly_rate == null ? undefined : num(r.default_hourly_rate),
    businessName: r.business_name ?? undefined,
    businessAddress: r.business_address ?? undefined,
    businessEmail: r.business_email ?? undefined,
    businessCurrency: r.business_currency,
    aiCostMode: asCostMode(r.ai_cost_mode),
    aiSubscriptionMonthlyUsd: num(r.ai_subscription_monthly_usd),
    defaultBillMode: asBillMode(r.default_bill_mode),
    billActiveMultiplier: num(r.bill_active_multiplier) || 1,
    billingStyle: asBillingStyle(r.billing_style),
    useQualityConfidence: r.use_quality_confidence ?? true,
    useDifficultyWeight: r.use_difficulty_weight ?? false,
    useCategoryWeight: r.use_category_weight ?? false,
    billingOnboardedAt: r.billing_onboarded_at ?? undefined,
    theme: asThemePref(r.theme),
  };
}

export type ExpenseRow = {
  id: string;
  user_id: string;
  date: string;
  project_id: string | null;
  client_id: string | null;
  category: ExpenseCategory;
  amount: string | number;
  currency: string;
  note: string | null;
  billable: boolean;
  receipt_url: string | null;
  receipt_pathname: string | null;
  invoice_id: string | null;
  created_at: string;
};

function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    date: typeof r.date === "string" ? r.date.slice(0, 10) : iso(r.date),
    projectId: r.project_id ?? undefined,
    clientId: r.client_id ?? undefined,
    category: r.category,
    amount: num(r.amount),
    currency: r.currency,
    note: r.note ?? undefined,
    billable: !!r.billable,
    receiptUrl: r.receipt_url ?? undefined,
    receiptPathname: r.receipt_pathname ?? undefined,
    invoiceId: r.invoice_id ?? undefined,
    createdAt: iso(r.created_at),
  };
}

export const store = {
  // ─── Clients ───────────────────────────────────────────────
  async listClients(userId: string): Promise<Client[]> {
    const rows = (await sql`
      SELECT id, name, initials, accent_color, hourly_rate, email, address, cc_recipients, note, created_at
      FROM client
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `) as ClientRow[];
    return rows.map(mapClient);
  },

  async getClient(userId: string, id: string): Promise<Client | undefined> {
    const rows = (await sql`
      SELECT id, name, initials, accent_color, hourly_rate, email, address, cc_recipients, note, created_at
      FROM client
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as ClientRow[];
    return rows[0] ? mapClient(rows[0]) : undefined;
  },

  async createClient(
    userId: string,
    input: {
      name: string;
      initials?: string;
      accentColor?: string;
      hourlyRate: number;
      email?: string;
      address?: string;
      ccRecipients?: string[];
      note?: string;
    },
  ): Promise<Client> {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    if (!Number.isFinite(input.hourlyRate) || input.hourlyRate <= 0) {
      throw new Error("hourlyRate must be a positive number");
    }
    await ensureAppUser(userId);
    const id = genId("cli");
    const initials = (input.initials?.trim() || deriveInitials(name))
      .slice(0, 3)
      .toUpperCase();
    const accent = input.accentColor?.trim() || "#FF7A1A";
    const cc = (input.ccRecipients ?? []).slice(0, 3).filter(Boolean);
    const rows = (await sql`
      INSERT INTO client (
        id, user_id, name, initials, accent_color, hourly_rate,
        email, address, cc_recipients, note
      )
      VALUES (
        ${id}, ${userId}, ${name}, ${initials}, ${accent}, ${input.hourlyRate},
        ${input.email ?? null},
        ${input.address ?? null},
        ${cc.length > 0 ? cc : null},
        ${input.note ?? null}
      )
      RETURNING id, name, initials, accent_color, hourly_rate, email, address, cc_recipients, note, created_at
    `) as ClientRow[];
    return mapClient(rows[0]);
  },

  async updateClient(
    userId: string,
    id: string,
    patch: {
      name?: string;
      initials?: string;
      accentColor?: string;
      hourlyRate?: number;
      email?: string | null;
      address?: string | null;
      ccRecipients?: string[] | null;
      note?: string | null;
    },
  ): Promise<Client> {
    const cc =
      patch.ccRecipients === null
        ? null
        : patch.ccRecipients
          ? patch.ccRecipients.slice(0, 3).filter(Boolean)
          : undefined;
    const rows = (await sql`
      UPDATE client SET
        name          = COALESCE(${patch.name ?? null}, name),
        initials      = COALESCE(${patch.initials ?? null}, initials),
        accent_color  = COALESCE(${patch.accentColor ?? null}, accent_color),
        hourly_rate   = COALESCE(${patch.hourlyRate ?? null}, hourly_rate),
        email         = CASE WHEN ${patch.email !== undefined} THEN ${patch.email ?? null}::text ELSE email END,
        address       = CASE WHEN ${patch.address !== undefined} THEN ${patch.address ?? null}::text ELSE address END,
        cc_recipients = CASE WHEN ${cc !== undefined} THEN ${cc ?? null}::text[] ELSE cc_recipients END,
        note          = CASE WHEN ${patch.note !== undefined} THEN ${patch.note ?? null}::text ELSE note END
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, name, initials, accent_color, hourly_rate, email, address, cc_recipients, note, created_at
    `) as ClientRow[];
    if (!rows[0]) throw new Error("Unknown client");
    return mapClient(rows[0]);
  },

  async deleteClient(userId: string, id: string): Promise<void> {
    const existing = await store.getClient(userId, id);
    if (!existing) throw new Error("Unknown client");

    await sql`
      DELETE FROM cwd_mapping
      WHERE user_id = ${userId} AND client_id = ${id}
    `;

    await sql`
      DELETE FROM run
      WHERE user_id = ${userId} AND client_id = ${id}
    `;

    await sql`
      DELETE FROM expense
      WHERE user_id = ${userId} AND client_id = ${id}
    `;

    await sql`
      DELETE FROM invoice
      WHERE user_id = ${userId} AND client_id = ${id}
    `;

    await sql`
      DELETE FROM project
      WHERE user_id = ${userId} AND client_id = ${id}
    `;

    await sql`
      DELETE FROM client
      WHERE user_id = ${userId} AND id = ${id}
    `;
  },

  // ─── Projects ──────────────────────────────────────────────
  async listProjects(userId: string, clientId?: string): Promise<Project[]> {
    const rows = (clientId
      ? await sql`
          SELECT id, client_id, name, description, color, created_at
          FROM project
          WHERE user_id = ${userId} AND client_id = ${clientId}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT id, client_id, name, description, color, created_at
          FROM project
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `) as ProjectRow[];
    return rows.map(mapProject);
  },

  async getProject(userId: string, id: string): Promise<Project | undefined> {
    const rows = (await sql`
      SELECT id, client_id, name, description, color, created_at
      FROM project
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as ProjectRow[];
    return rows[0] ? mapProject(rows[0]) : undefined;
  },

  async createProject(
    userId: string,
    input: {
      clientId: string;
      name: string;
      description?: string;
      color?: string;
    },
  ): Promise<Project> {
    const client = await store.getClient(userId, input.clientId);
    if (!client) throw new Error("Unknown client");
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    const id = genId("prj");
    const description = input.description?.trim() || null;
    const color = input.color?.trim() || client.accentColor;
    const rows = (await sql`
      INSERT INTO project (id, user_id, client_id, name, description, color)
      VALUES (${id}, ${userId}, ${input.clientId}, ${name}, ${description}, ${color})
      RETURNING id, client_id, name, description, color, created_at
    `) as ProjectRow[];
    return mapProject(rows[0]);
  },

  async deleteProject(userId: string, id: string): Promise<void> {
    const existing = await store.getProject(userId, id);
    if (!existing) throw new Error("Unknown project");

    await sql`
      DELETE FROM cwd_mapping
      WHERE user_id = ${userId} AND project_id = ${id}
    `;

    await sql`
      DELETE FROM run
      WHERE user_id = ${userId} AND project_id = ${id}
    `;

    await sql`
      UPDATE expense
      SET project_id = NULL
      WHERE user_id = ${userId} AND project_id = ${id}
    `;

    await sql`
      DELETE FROM project
      WHERE user_id = ${userId} AND id = ${id}
    `;
  },

  async updateProject(
    userId: string,
    id: string,
    patch: {
      clientId?: string;
      name?: string;
      description?: string | null;
      color?: string;
    },
  ): Promise<Project> {
    const existing = await store.getProject(userId, id);
    if (!existing) throw new Error("Unknown project");

    const nextClientId = patch.clientId ?? existing.clientId;
    const client = await store.getClient(userId, nextClientId);
    if (!client) throw new Error("Unknown client");

    const nextName =
      patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!nextName) throw new Error("Name is required");

    const nextDescription =
      patch.description !== undefined
        ? patch.description?.trim() || null
        : existing.description ?? null;
    const nextColor =
      patch.color !== undefined
        ? patch.color.trim() || client.accentColor
        : existing.color;

    const rows = (await sql`
      UPDATE project
      SET client_id = ${nextClientId},
          name = ${nextName},
          description = ${nextDescription},
          color = ${nextColor}
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, client_id, name, description, color, created_at
    `) as ProjectRow[];
    if (!rows[0]) throw new Error("Unknown project");

    if (nextClientId !== existing.clientId) {
      const settings = await store.getSettings(userId);
      const billMode = settings.defaultBillMode;
      const mult =
        settings.billingStyle === "pure_active"
          ? 1
          : settings.billActiveMultiplier || 1;

      await sql`
        UPDATE run
        SET client_id = ${nextClientId},
            rate_usd = (${client.hourlyRate}::numeric * s.rate_modifier),
            billable_usd = CASE
              WHEN run.kind = 'break' OR run.billable_usd = 0
                THEN 0
              WHEN run.pricing_mode = 'baseline'
                THEN run.baseline_hours * ${client.hourlyRate}::numeric * s.rate_modifier
              WHEN ${billMode} = 'time_only'
                THEN (run.active_sec::numeric / 3600)
                     * ${mult}::numeric
                     * ${client.hourlyRate}::numeric
                     * s.rate_modifier
              ELSE (run.active_sec::numeric / 3600)
                   * ${client.hourlyRate}::numeric
                   * s.rate_modifier
                   + run.cost_usd
            END
        FROM skill s
        WHERE run.user_id = ${userId}
          AND run.project_id = ${id}
          AND s.id = run.skill_id
          AND s.user_id = run.user_id
      `;

      await sql`
        UPDATE expense
        SET client_id = ${nextClientId}
        WHERE user_id = ${userId} AND project_id = ${id}
      `;

      await sql`
        UPDATE cwd_mapping
        SET client_id = ${nextClientId}
        WHERE user_id = ${userId} AND project_id = ${id}
      `;
    }

    return mapProject(rows[0]);
  },

  // ─── Skills ────────────────────────────────────────────────
  async listSkills(userId: string): Promise<Skill[]> {
    const rows = (await sql`
      SELECT id, name, description, category, baseline_hours, rate_modifier, tags
      FROM skill
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `) as SkillRow[];
    return rows.map(mapSkill);
  },

  async getSkill(userId: string, id: string): Promise<Skill | undefined> {
    const rows = (await sql`
      SELECT id, name, description, category, baseline_hours, rate_modifier, tags
      FROM skill
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as SkillRow[];
    return rows[0] ? mapSkill(rows[0]) : undefined;
  },

  async createSkill(
    userId: string,
    input: {
      name: string;
      description?: string;
      category: SkillCategory;
      baselineHours: number;
      rateModifier: number;
      tags?: string[];
    },
  ): Promise<Skill> {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    if (!Number.isFinite(input.baselineHours) || input.baselineHours <= 0) {
      throw new Error("baselineHours must be positive");
    }
    if (!Number.isFinite(input.rateModifier) || input.rateModifier <= 0) {
      throw new Error("rateModifier must be positive");
    }
    await ensureAppUser(userId);
    const id = genId("skl");
    const tags = (input.tags ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
    const description = input.description?.trim() || "";
    const rows = (await sql`
      INSERT INTO skill (id, user_id, name, description, category, baseline_hours, rate_modifier, tags)
      VALUES (${id}, ${userId}, ${name}, ${description}, ${input.category}, ${input.baselineHours}, ${input.rateModifier}, ${tags})
      RETURNING id, name, description, category, baseline_hours, rate_modifier, tags
    `) as SkillRow[];
    return mapSkill(rows[0]);
  },

  // ─── Runs ──────────────────────────────────────────────────
  async listRuns(
    userId: string,
    filter?: {
      clientId?: string;
      projectId?: string;
      status?: RunStatus;
      limit?: number;
      sinceDate?: string;
    },
  ): Promise<Run[]> {
    const limit = filter?.limit ?? 1000;
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
      FROM run
      WHERE user_id = ${userId}
        AND (${filter?.clientId ?? null}::text IS NULL OR client_id = ${filter?.clientId ?? null})
        AND (${filter?.projectId ?? null}::text IS NULL OR project_id = ${filter?.projectId ?? null})
        AND (${filter?.status ?? null}::text IS NULL OR status = ${filter?.status ?? null})
        AND (${filter?.sinceDate ?? null}::text IS NULL OR started_at >= ${filter?.sinceDate ?? null}::timestamptz)
      ORDER BY started_at DESC
      LIMIT ${limit}
    `) as RunRow[];
    return rows.map(mapRun);
  },

  async getRun(userId: string, id: string): Promise<Run | undefined> {
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
      FROM run
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as RunRow[];
    return rows[0] ? mapRun(rows[0]) : undefined;
  },

  async listRunEvents(userId: string, runId: string): Promise<RunEvent[]> {
    const rows = (await sql`
      SELECT id, run_id, ts, kind, label, detail, duration_ms
      FROM run_event
      WHERE user_id = ${userId} AND run_id = ${runId}
      ORDER BY ts ASC
    `) as RunEventRow[];
    return rows.map(mapRunEvent);
  },

  async startRun(
    userId: string,
    input: {
      clientId: string;
      projectId: string;
      skillId: string;
      agentName?: string;
      prompt?: string;
      cwd?: string;
      pricingMode?: "baseline" | "time_plus_tokens" | "time_only";
    },
  ): Promise<Run> {
    const [client, project, skill, settings] = await Promise.all([
      store.getClient(userId, input.clientId),
      store.getProject(userId, input.projectId),
      store.getSkill(userId, input.skillId),
      store.getSettings(userId),
    ]);
    if (!client || !project || !skill) {
      throw new Error("Unknown client / project / skill");
    }
    const id = genId("run");
    const agentName = input.agentName ?? "ai-agent";
    const pricingMode = input.pricingMode ?? settings.defaultBillMode;
    const rateUsd = client.hourlyRate * skill.rateModifier;
    const rows = (await sql`
      INSERT INTO run (
        id, user_id, client_id, project_id, skill_id, agent_name, status,
        prompt, cwd, pricing_mode,
        baseline_hours, rate_usd
      )
      VALUES (
        ${id}, ${userId}, ${input.clientId}, ${input.projectId}, ${input.skillId},
        ${agentName}, 'running',
        ${input.prompt ?? null}, ${input.cwd ?? null}, ${pricingMode},
        ${skill.baselineHours}, ${rateUsd}
      )
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    const run = mapRun(rows[0]);
    await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label, detail)
      VALUES (
        ${genId("evt")}, ${userId}, ${run.id},
        'milestone', ${`Run started · ${skill.name}`},
        ${input.prompt ?? null}
      )
    `;
    return run;
  },

  // ─── Timer-specific run methods ────────────────────────────
  /**
   * Start a manual timer run. Requires clientId so we can derive a rate.
   * projectId and skillId are optional - if not provided we use sentinel
   * values '' (empty string sentinel is not valid for FK, so we use the
   * constant below) and store rate_usd from settings default.
   */
  async startManualRun(
    userId: string,
    input: {
      clientId?: string;
      projectId?: string;
      skillId?: string;
      description?: string;
      billable?: boolean;
    },
  ): Promise<Run> {
    await ensureAppUser(userId);
    const id = genId("run");

    // Resolve rate from client if provided, else from settings
    let rateUsd = 0;
    const resolvedClientId = input.clientId || null;
    const resolvedProjectId = input.projectId || null;
    const resolvedSkillId = input.skillId || (await ensureDefaultSkill(userId));

    if (resolvedClientId) {
      const client = await store.getClient(userId, resolvedClientId);
      rateUsd = client?.hourlyRate ?? 0;
    } else {
      const settings = await store.getSettings(userId);
      rateUsd = settings.defaultHourlyRate ?? 0;
    }

    const rows = (await sql`
      INSERT INTO run (
        id, user_id, client_id, project_id, skill_id, agent_name, status, kind,
        prompt, pricing_mode, baseline_hours, rate_usd, billable_usd
      )
      VALUES (
        ${id}, ${userId},
        ${resolvedClientId}, ${resolvedProjectId}, ${resolvedSkillId},
        'manual-timer', 'running', 'manual',
        ${input.description ?? null}, 'time_plus_tokens', 0, ${rateUsd}, 0
      )
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    return mapRun(rows[0]);
  },

  async startBreakRun(
    userId: string,
    input: { projectId?: string },
  ): Promise<Run> {
    await ensureAppUser(userId);
    const id = genId("run");
    const resolvedProjectId = input.projectId || null;
    const resolvedSkillId = await ensureDefaultSkill(userId);
    const rows = (await sql`
      INSERT INTO run (
        id, user_id, client_id, project_id, skill_id, agent_name, status, kind,
        prompt, pricing_mode, baseline_hours, rate_usd, billable_usd
      )
      VALUES (
        ${id}, ${userId},
        ${null}, ${resolvedProjectId}, ${resolvedSkillId}, 'break-timer', 'running', 'break',
        'Break', 'time_plus_tokens', 0, 0, 0
      )
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    return mapRun(rows[0]);
  },

  async appendManualEntry(
    userId: string,
    input: {
      date: string; // YYYY-MM-DD
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      description?: string;
      clientId?: string;
      projectId?: string;
      skillId?: string;
      billable?: boolean;
    },
  ): Promise<Run> {
    await ensureAppUser(userId);
    const id = genId("run");

    // Build timestamps from date + time parts
    const startedAt = new Date(`${input.date}T${input.startTime}:00`);
    const endedAt = new Date(`${input.date}T${input.endTime}:00`);
    // Handle overnight (endTime < startTime)
    if (endedAt <= startedAt) {
      endedAt.setDate(endedAt.getDate() + 1);
    }
    const runtimeSec = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    let rateUsd = 0;
    let billableUsd = 0;
    if (input.clientId) {
      const client = await store.getClient(userId, input.clientId);
      rateUsd = client?.hourlyRate ?? 0;
    } else {
      const settings = await store.getSettings(userId);
      rateUsd = settings.defaultHourlyRate ?? 0;
    }
    if (input.billable && rateUsd > 0) {
      billableUsd = Number(((runtimeSec / 3600) * rateUsd).toFixed(2));
    }

    const resolvedClientId = input.clientId || null;
    const resolvedProjectId = input.projectId || null;
    const resolvedSkillId = input.skillId || (await ensureDefaultSkill(userId));

    const rows = (await sql`
      INSERT INTO run (
        id, user_id, client_id, project_id, skill_id, agent_name, status, kind,
        prompt, pricing_mode, started_at, ended_at, runtime_sec,
        baseline_hours, rate_usd, billable_usd
      )
      VALUES (
        ${id}, ${userId},
        ${resolvedClientId}, ${resolvedProjectId}, ${resolvedSkillId}, 'manual-entry', 'shipped', 'manual',
        ${input.description ?? null}, 'time_plus_tokens',
        ${startedAt.toISOString()}, ${endedAt.toISOString()}, ${runtimeSec},
        ${runtimeSec / 3600}, ${rateUsd}, ${billableUsd}
      )
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    return mapRun(rows[0]);
  },

  async stopRun(userId: string, runId: string): Promise<Run> {
    const run = await store.getRun(userId, runId);
    if (!run) throw new Error("Unknown run");
    const startedAt = new Date(run.startedAt).getTime();
    const runtimeSec = Math.round((Date.now() - startedAt) / 1000);
    let billableUsd = run.billableUsd;
    // For non-break runs that were billable, recalculate
    if (run.kind !== "break" && run.billableUsd > 0 && run.rateUsd > 0) {
      billableUsd = Number(((runtimeSec / 3600) * run.rateUsd).toFixed(2));
    }
    const rows = (await sql`
      UPDATE run
      SET status = 'shipped',
          ended_at = NOW(),
          runtime_sec = ${runtimeSec},
          billable_usd = ${run.kind === "break" ? 0 : billableUsd}
      WHERE user_id = ${userId} AND id = ${runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    if (!rows[0]) throw new Error("Unknown run");
    return mapRun(rows[0]);
  },

  async updateRun(
    userId: string,
    runId: string,
    patch: {
      description?: string;
      startedAt?: string;
      endedAt?: string;
      clientId?: string;
      projectId?: string;
      billable?: boolean;
    },
  ): Promise<Run> {
    const run = await store.getRun(userId, runId);
    if (!run) throw new Error("Unknown run");

    // Recompute runtime and billable if times changed
    const newStartedAt = patch.startedAt ?? run.startedAt;
    const newEndedAt = patch.endedAt ?? run.endedAt;
    let runtimeSec = run.runtimeSec;
    if (newEndedAt) {
      runtimeSec = Math.max(
        0,
        Math.round(
          (new Date(newEndedAt).getTime() - new Date(newStartedAt).getTime()) / 1000,
        ),
      );
    }

    // Billable calculation
    let billableUsd = run.billableUsd;
    const isBillable = patch.billable !== undefined ? patch.billable : run.billableUsd > 0;
    if (run.kind !== "break") {
      billableUsd = isBillable && run.rateUsd > 0
        ? Number(((runtimeSec / 3600) * run.rateUsd).toFixed(2))
        : 0;
    }

    const rows = (await sql`
      UPDATE run SET
        prompt       = CASE WHEN ${patch.description !== undefined} THEN ${patch.description ?? null}::text ELSE prompt END,
        started_at   = CASE WHEN ${patch.startedAt !== undefined} THEN ${patch.startedAt ?? null}::timestamptz ELSE started_at END,
        ended_at     = CASE WHEN ${patch.endedAt !== undefined} THEN ${patch.endedAt ?? null}::timestamptz ELSE ended_at END,
        client_id    = CASE WHEN ${patch.clientId !== undefined} THEN ${patch.clientId ?? ""}::text ELSE client_id END,
        project_id   = CASE WHEN ${patch.projectId !== undefined} THEN ${patch.projectId ?? ""}::text ELSE project_id END,
        runtime_sec  = ${runtimeSec},
        baseline_hours = ${runtimeSec / 3600},
        billable_usd = ${billableUsd}
      WHERE user_id = ${userId} AND id = ${runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    if (!rows[0]) throw new Error("Unknown run");
    return mapRun(rows[0]);
  },

  async deleteRun(userId: string, runId: string): Promise<void> {
    const run = await store.getRun(userId, runId);
    if (!run) throw new Error("Unknown run");
    await sql`DELETE FROM run WHERE user_id = ${userId} AND id = ${runId}`;
  },

  async recordEvent(
    userId: string,
    input: {
      runId: string;
      kind: RunEventKind;
      label: string;
      detail?: string;
      durationMs?: number;
      tokensIn?: number;
      tokensOut?: number;
      activeMs?: number;
    },
  ): Promise<RunEvent> {
    const run = await store.getRun(userId, input.runId);
    if (!run) throw new Error("Unknown run");
    const id = genId("evt");
    const rows = (await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label, detail, duration_ms)
      VALUES (
        ${id}, ${userId}, ${input.runId},
        ${input.kind}, ${input.label},
        ${input.detail ?? null}, ${input.durationMs ?? null}
      )
      RETURNING id, run_id, ts, kind, label, detail, duration_ms
    `) as RunEventRow[];
    const tokensIn = input.tokensIn ?? 0;
    const tokensOut = input.tokensOut ?? 0;
    const activeAdd = Math.round((input.activeMs ?? 0) / 1000);
    if (tokensIn || tokensOut || activeAdd) {
      await sql`
        UPDATE run
        SET tokens_in = tokens_in + ${tokensIn},
            tokens_out = tokens_out + ${tokensOut},
            active_sec = active_sec + ${activeAdd},
            cost_usd = ROUND(((tokens_in + ${tokensIn}) * 3 + (tokens_out + ${tokensOut}) * 15)::numeric / 1000000, 4),
            runtime_sec = GREATEST(EXTRACT(EPOCH FROM (NOW() - started_at))::int, runtime_sec)
        WHERE user_id = ${userId} AND id = ${input.runId}
      `;
    } else {
      await sql`
        UPDATE run
        SET runtime_sec = GREATEST(EXTRACT(EPOCH FROM (NOW() - started_at))::int, runtime_sec)
        WHERE user_id = ${userId} AND id = ${input.runId}
      `;
    }
    return mapRunEvent(rows[0]);
  },

  async requestApproval(
    userId: string,
    input: { runId: string; question: string; context?: string },
  ): Promise<Approval> {
    const run = await store.getRun(userId, input.runId);
    if (!run) throw new Error("Unknown run");
    const id = genId("apr");
    const rows = (await sql`
      INSERT INTO approval (id, user_id, run_id, question, context, status)
      VALUES (${id}, ${userId}, ${input.runId}, ${input.question}, ${input.context ?? null}, 'pending')
      RETURNING id, run_id, question, context, status, created_at, resolved_at, resolved_by
    `) as ApprovalRow[];
    await sql`UPDATE run SET status = 'awaiting_approval' WHERE user_id = ${userId} AND id = ${input.runId}`;
    await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label, detail)
      VALUES (${genId("evt")}, ${userId}, ${input.runId}, 'approval_requested', ${input.question}, ${input.context ?? null})
    `;
    return mapApproval(rows[0]);
  },

  async resolveApproval(
    userId: string,
    input: {
      approvalId: string;
      status: "approved" | "rejected";
      resolvedBy?: string;
    },
  ): Promise<Approval> {
    const rows = (await sql`
      UPDATE approval
      SET status = ${input.status},
          resolved_at = NOW(),
          resolved_by = ${input.resolvedBy ?? null}
      WHERE user_id = ${userId} AND id = ${input.approvalId}
      RETURNING id, run_id, question, context, status, created_at, resolved_at, resolved_by
    `) as ApprovalRow[];
    if (!rows[0]) throw new Error("Unknown approval");
    const apr = mapApproval(rows[0]);
    const nextRunStatus = input.status === "approved" ? "running" : "cancelled";
    await sql`UPDATE run SET status = ${nextRunStatus} WHERE user_id = ${userId} AND id = ${apr.runId}`;
    await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label)
      VALUES (
        ${genId("evt")}, ${userId}, ${apr.runId},
        'approval_resolved',
        ${`${input.status === "approved" ? "Approved" : "Rejected"}: ${apr.question}`}
      )
    `;
    return apr;
  },

  async endRun(
    userId: string,
    input: {
      runId: string;
      status: "shipped" | "failed" | "cancelled";
      deliverableUrl?: string;
      notes?: string;
    },
  ): Promise<Run> {
    const run = await store.getRun(userId, input.runId);
    if (!run) throw new Error("Unknown run");
    const startedAt = new Date(run.startedAt).getTime();
    const runtimeSec = Math.round((Date.now() - startedAt) / 1000);
    let billable = 0;
    if (input.status === "shipped") {
      const runtimeHours = runtimeSec / 3600;
      const activeHours = (run.activeSec || runtimeSec) / 3600;
      if (run.pricingMode === "baseline") {
        billable = Number((run.baselineHours * run.rateUsd).toFixed(2));
      } else if (run.pricingMode === "time_plus_tokens") {
        billable = Number(
          (runtimeHours * run.rateUsd + run.costUsd).toFixed(2),
        );
      } else {
        const settings = await store.getSettings(userId);
        const mult =
          settings.billingStyle === "pure_active"
            ? 1
            : settings.billActiveMultiplier || 1;
        billable = Number((activeHours * mult * run.rateUsd).toFixed(2));
      }
    }
    const eventCount = await store.countRunEvents(userId, input.runId);
    const totalTokens = (run.tokensIn || 0) + (run.tokensOut || 0);
    const history = await store.recentRunSignals(userId, input.runId);
    const { score: difficultyScore } = computeDifficulty(
      {
        totalTokens,
        activeSec: run.activeSec || runtimeSec || 0,
        eventCount,
      },
      history,
    );
    const changeCategory = run.changeCategory ?? classifyChangeCategory(run.prompt);
    const rows = (await sql`
      UPDATE run
      SET status = ${input.status},
          ended_at = NOW(),
          runtime_sec = ${runtimeSec},
          deliverable_url = ${input.deliverableUrl ?? null},
          notes = ${input.notes ?? null},
          billable_usd = ${billable},
          difficulty_score = ${difficultyScore},
          change_category = COALESCE(change_category, ${changeCategory})
      WHERE user_id = ${userId} AND id = ${input.runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label, detail)
      VALUES (
        ${genId("evt")}, ${userId}, ${input.runId},
        'milestone', ${`Run ${input.status}`},
        ${input.deliverableUrl ?? null}
      )
    `;
    const updated = mapRun(rows[0]);
    if (
      input.status === "shipped" &&
      updated.changeCategory === "bugfix" &&
      updated.cwd
    ) {
      // The "follow-up bugfix" rule: if a new shipped bugfix lands in the
      // same cwd within 14 days of an earlier shipped run, that earlier run
      // gets a quality penalty. We only touch the most recent prior shipped
      // run so the penalty is targeted.
      try {
        await store.recordFollowUpBugfix(userId, updated);
      } catch {
        // Non-fatal: scoring should never block run end.
      }
    }
    return updated;
  },

  // ─── Approvals ─────────────────────────────────────────────
  async listApprovals(
    userId: string,
    status?: ApprovalStatus,
  ): Promise<Approval[]> {
    const rows = (status
      ? await sql`
          SELECT id, run_id, question, context, status, created_at, resolved_at, resolved_by
          FROM approval
          WHERE user_id = ${userId} AND status = ${status}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT id, run_id, question, context, status, created_at, resolved_at, resolved_by
          FROM approval
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `) as ApprovalRow[];
    return rows.map(mapApproval);
  },

  // ─── Invoices ──────────────────────────────────────────────
  async listInvoices(userId: string, clientId?: string): Promise<Invoice[]> {
    const rows = (clientId
      ? await sql`
          SELECT id, client_id, number, status, period_start, period_end,
                 issued_at, due_at, paid_at, line_items,
                 subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
          FROM invoice
          WHERE user_id = ${userId} AND client_id = ${clientId}
          ORDER BY period_end DESC
        `
      : await sql`
          SELECT id, client_id, number, status, period_start, period_end,
                 issued_at, due_at, paid_at, line_items,
                 subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
          FROM invoice
          WHERE user_id = ${userId}
          ORDER BY period_end DESC
        `) as InvoiceRow[];
    return rows.map(mapInvoice);
  },

  async getInvoice(
    userId: string,
    id: string,
  ): Promise<Invoice | undefined> {
    const rows = (await sql`
      SELECT id, client_id, number, status, period_start, period_end,
             issued_at, due_at, paid_at, line_items,
             subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
      FROM invoice
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as InvoiceRow[];
    return rows[0] ? mapInvoice(rows[0]) : undefined;
  },

  async createInvoice(
    userId: string,
    input: { clientId: string; windowDays?: number; taxPct?: number },
  ): Promise<Invoice> {
    const client = await store.getClient(userId, input.clientId);
    if (!client) throw new Error("Unknown client");
    const win = input.windowDays ?? 30;
    const cutoff = new Date(Date.now() - win * DAY).toISOString();
    const eligible = (await sql`
      SELECT r.id, r.skill_id, r.baseline_hours, r.rate_usd, r.billable_usd,
             r.active_sec, r.runtime_sec, r.prompt,
             r.difficulty_score, r.change_category, r.quality_confidence,
             s.name AS skill_name
      FROM run r
      JOIN skill s ON s.id = r.skill_id
      WHERE r.user_id = ${userId}
        AND r.client_id = ${input.clientId}
        AND r.status = 'shipped'
        AND r.started_at >= ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM invoice i, jsonb_array_elements(i.line_items) li
          WHERE i.user_id = ${userId}
            AND (li ->> 'runId') = r.id
        )
      ORDER BY r.started_at ASC
    `) as Array<{
      id: string;
      skill_id: string;
      baseline_hours: string;
      rate_usd: string;
      billable_usd: string;
      active_sec: string | number | null;
      runtime_sec: string | number | null;
      prompt: string | null;
      difficulty_score: string | number | null;
      change_category: string | null;
      quality_confidence: string | number | null;
      skill_name: string;
    }>;
    if (eligible.length === 0) {
      throw new Error("No uninvoiced shipped runs for this client in the window");
    }
    const settings = await store.getSettings(userId);
    const lineItems: InvoiceLineItem[] = eligible.map((r) => {
      const activeHours = num(r.active_sec) / 3600;
      const runtimeHours = num(r.runtime_sec) / 3600;
      const baselineHours = num(r.baseline_hours);
      const hours = activeHours > 0 ? activeHours : runtimeHours > 0 ? runtimeHours : baselineHours;
      const quantity = Number(hours.toFixed(2));
      const unitPrice = num(r.rate_usd);
      const baseAmount = quantity * unitPrice;
      const effort = effortMultiplierForRun(settings, {
        changeCategory: asCategory(r.change_category),
        difficultyScore:
          r.difficulty_score == null ? undefined : num(r.difficulty_score),
        qualityConfidence:
          r.quality_confidence == null ? 1 : num(r.quality_confidence),
      });
      const amount = Number((baseAmount * effort).toFixed(2));
      const promptRaw = (r.prompt ?? "").trim().replace(/\s+/g, " ");
      const description = promptRaw
        ? promptRaw.length > 100
          ? promptRaw.slice(0, 97) + "..."
          : promptRaw
        : `${r.skill_name} session`;
      return {
        type: "service",
        description,
        quantity,
        unitPrice,
        amount,
        runId: r.id,
        skillName: r.skill_name,
      };
    });
    const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
    const taxPct = Math.max(0, input.taxPct ?? 0);
    const tax = Number(((subtotal * taxPct) / 100).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    const now = new Date();
    const numCount = (await sql`
      SELECT COUNT(*)::int AS n FROM invoice WHERE user_id = ${userId}
    `) as Array<{ n: number }>;
    const numSeq = (numCount[0]?.n ?? 0) + 1;
    const invoiceNumber = `INV-${now.getUTCFullYear()}-${String(100 + numSeq).padStart(4, "0")}`;
    const id = genId("inv");
    const periodStart = new Date(Date.now() - win * DAY).toISOString();
    const periodEnd = now.toISOString();
    const dueAt = new Date(Date.now() + 14 * DAY).toISOString();
    const rows = (await sql`
      INSERT INTO invoice (
        id, user_id, client_id, number, status,
        period_start, period_end, due_at,
        line_items, subtotal_usd, tax_usd, total_usd,
        tax_pct
      )
      VALUES (
        ${id}, ${userId}, ${input.clientId}, ${invoiceNumber}, 'draft',
        ${periodStart}, ${periodEnd}, ${dueAt},
        ${JSON.stringify(lineItems)}::jsonb,
        ${subtotal.toFixed(2)}, ${tax.toFixed(2)}, ${total.toFixed(2)},
        ${taxPct.toFixed(2)}
      )
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    return mapInvoice(rows[0]);
  },

  async issueInvoice(userId: string, id: string): Promise<Invoice> {
    const inv = await store.getInvoice(userId, id);
    if (!inv) throw new Error("Unknown invoice");
    if (inv.status !== "draft") throw new Error("Only draft invoices can be issued");
    const dueAt = inv.dueAt ?? new Date(Date.now() + 14 * DAY).toISOString();
    const rows = (await sql`
      UPDATE invoice
      SET status = 'sent',
          issued_at = NOW(),
          due_at = ${dueAt}
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    return mapInvoice(rows[0]);
  },

  async payInvoice(userId: string, id: string): Promise<Invoice> {
    const rows = (await sql`
      UPDATE invoice
      SET status = 'paid',
          paid_at = NOW(),
          issued_at = COALESCE(issued_at, NOW())
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    if (!rows[0]) throw new Error("Unknown invoice");
    return mapInvoice(rows[0]);
  },

  async voidInvoice(userId: string, id: string): Promise<Invoice> {
    const rows = (await sql`
      UPDATE invoice
      SET status = 'void'
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    if (!rows[0]) throw new Error("Unknown invoice");
    return mapInvoice(rows[0]);
  },

  async deleteInvoice(userId: string, id: string): Promise<void> {
    await sql`DELETE FROM invoice WHERE user_id = ${userId} AND id = ${id}`;
  },

  async duplicateInvoice(userId: string, sourceId: string): Promise<Invoice> {
    const src = await store.getInvoice(userId, sourceId);
    if (!src) throw new Error("Unknown invoice");
    const newId = genId("inv");
    const numCount = (await sql`
      SELECT COUNT(*)::int AS n FROM invoice WHERE user_id = ${userId}
    `) as Array<{ n: number }>;
    const numSeq = (numCount[0]?.n ?? 0) + 1;
    const now = new Date();
    const newNumber = `INV-${now.getUTCFullYear()}-${String(100 + numSeq).padStart(4, "0")}`;
    const rows = (await sql`
      INSERT INTO invoice (
        id, user_id, client_id, number, status,
        period_start, period_end, due_at,
        line_items, subtotal_usd, tax_usd, total_usd,
        subject, notes,
        bill_from_name, bill_from_address, bill_from_email,
        bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
        discount_amount, tax_pct
      )
      SELECT
        ${newId}, ${userId}, client_id, ${newNumber}, 'draft',
        period_start, period_end, due_at,
        line_items, subtotal_usd, tax_usd, total_usd,
        subject, notes,
        bill_from_name, bill_from_address, bill_from_email,
        bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
        discount_amount, tax_pct
      FROM invoice
      WHERE user_id = ${userId} AND id = ${sourceId}
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    return mapInvoice(rows[0]);
  },

  async updateInvoice(
    userId: string,
    id: string,
    patch: {
      subject?: string | null;
      notes?: string | null;
      issuedAt?: string | null;
      dueAt?: string | null;
      billFromName?: string | null;
      billFromAddress?: string | null;
      billFromEmail?: string | null;
      billToName?: string | null;
      billToAddress?: string | null;
      billToEmail?: string | null;
      billToCcEmails?: string[] | null;
      discountAmount?: number;
      taxPct?: number;
      recurringEnabled?: boolean;
      recurringRecurrence?: string | null;
      recurringNextIssue?: string | null;
      lineItems?: InvoiceLineItem[];
    },
  ): Promise<Invoice> {
    let subtotalCents = 0;
    let taxCents = 0;
    let totalCents = 0;
    let recompute = false;
    if (patch.lineItems || patch.discountAmount != null || patch.taxPct != null) {
      const inv = await store.getInvoice(userId, id);
      if (!inv) throw new Error("Unknown invoice");
      const items = patch.lineItems ?? inv.lineItems;
      const subtotal = items.reduce(
        (s, li) => s + (li.amount || li.quantity * li.unitPrice),
        0,
      );
      const discount = patch.discountAmount ?? inv.discountAmount;
      const taxPct = patch.taxPct ?? inv.taxPct;
      const taxed = Math.max(0, subtotal - discount);
      const tax = (taxed * taxPct) / 100;
      const total = taxed + tax;
      subtotalCents = Math.round(subtotal * 100);
      taxCents = Math.round(tax * 100);
      totalCents = Math.round(total * 100);
      recompute = true;
    }
    const cc =
      patch.billToCcEmails === null
        ? null
        : patch.billToCcEmails
          ? patch.billToCcEmails.slice(0, 3).filter(Boolean)
          : undefined;
    const rows = (await sql`
      UPDATE invoice SET
        subject              = CASE WHEN ${patch.subject !== undefined} THEN ${patch.subject ?? null}::text ELSE subject END,
        notes                = CASE WHEN ${patch.notes !== undefined} THEN ${patch.notes ?? null}::text ELSE notes END,
        issued_at            = CASE WHEN ${patch.issuedAt !== undefined} THEN ${patch.issuedAt ?? null}::timestamptz ELSE issued_at END,
        due_at               = CASE WHEN ${patch.dueAt !== undefined} THEN ${patch.dueAt ?? null}::timestamptz ELSE due_at END,
        bill_from_name       = CASE WHEN ${patch.billFromName !== undefined} THEN ${patch.billFromName ?? null}::text ELSE bill_from_name END,
        bill_from_address    = CASE WHEN ${patch.billFromAddress !== undefined} THEN ${patch.billFromAddress ?? null}::text ELSE bill_from_address END,
        bill_from_email      = CASE WHEN ${patch.billFromEmail !== undefined} THEN ${patch.billFromEmail ?? null}::text ELSE bill_from_email END,
        bill_to_name         = CASE WHEN ${patch.billToName !== undefined} THEN ${patch.billToName ?? null}::text ELSE bill_to_name END,
        bill_to_address      = CASE WHEN ${patch.billToAddress !== undefined} THEN ${patch.billToAddress ?? null}::text ELSE bill_to_address END,
        bill_to_email        = CASE WHEN ${patch.billToEmail !== undefined} THEN ${patch.billToEmail ?? null}::text ELSE bill_to_email END,
        bill_to_cc_emails    = CASE WHEN ${cc !== undefined} THEN ${cc ?? null}::text[] ELSE bill_to_cc_emails END,
        discount_amount      = CASE WHEN ${patch.discountAmount !== undefined} THEN ${patch.discountAmount ?? 0}::numeric ELSE discount_amount END,
        tax_pct              = CASE WHEN ${patch.taxPct !== undefined} THEN ${patch.taxPct ?? 0}::numeric ELSE tax_pct END,
        recurring_enabled    = CASE WHEN ${patch.recurringEnabled !== undefined} THEN ${patch.recurringEnabled ?? false}::boolean ELSE recurring_enabled END,
        recurring_recurrence = CASE WHEN ${patch.recurringRecurrence !== undefined} THEN ${patch.recurringRecurrence ?? null}::text ELSE recurring_recurrence END,
        recurring_next_issue = CASE WHEN ${patch.recurringNextIssue !== undefined} THEN ${patch.recurringNextIssue ?? null}::date ELSE recurring_next_issue END,
        line_items           = CASE WHEN ${patch.lineItems !== undefined} THEN ${JSON.stringify(patch.lineItems ?? [])}::jsonb ELSE line_items END,
        subtotal_usd         = CASE WHEN ${recompute} THEN ${(subtotalCents / 100).toFixed(2)}::numeric ELSE subtotal_usd END,
        tax_usd              = CASE WHEN ${recompute} THEN ${(taxCents / 100).toFixed(2)}::numeric ELSE tax_usd END,
        total_usd            = CASE WHEN ${recompute} THEN ${(totalCents / 100).toFixed(2)}::numeric ELSE total_usd END
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, client_id, number, status, period_start, period_end,
                issued_at, due_at, paid_at, line_items,
                subtotal_usd, tax_usd, total_usd,
             subject, notes,
             bill_from_name, bill_from_address, bill_from_email,
             bill_to_name, bill_to_address, bill_to_email, bill_to_cc_emails,
             discount_amount, tax_pct,
             recurring_enabled, recurring_recurrence, recurring_next_issue
    `) as InvoiceRow[];
    if (!rows[0]) throw new Error("Unknown invoice");
    return mapInvoice(rows[0]);
  },

  // ─── Agency settings ───────────────────────────────────────
  async getSettings(userId: string): Promise<AgencySettings> {
    await ensureAppUser(userId);
    const rows = (await sql`
      SELECT default_hourly_rate, business_name, business_address, business_email,
             business_currency,
             ai_cost_mode, ai_subscription_monthly_usd, default_bill_mode,
             bill_active_multiplier,
             billing_style, use_quality_confidence, use_difficulty_weight,
             use_category_weight, billing_onboarded_at, theme
      FROM app_user
      WHERE id = ${userId}
      LIMIT 1
    `) as AppUserRow[];
    return rows[0]
      ? mapSettings(rows[0])
      : {
          businessCurrency: "USD",
          aiCostMode: "subscription",
          aiSubscriptionMonthlyUsd: 200,
          defaultBillMode: "time_only",
          billActiveMultiplier: 1,
          billingStyle: "effort_adjusted",
          useQualityConfidence: true,
          useDifficultyWeight: false,
          useCategoryWeight: false,
          theme: "dark",
        };
  },

  async updateSettings(
    userId: string,
    patch: {
      defaultHourlyRate?: number | null;
      businessName?: string | null;
      businessAddress?: string | null;
      businessEmail?: string | null;
      businessCurrency?: string;
      aiCostMode?: "per_token" | "subscription";
      aiSubscriptionMonthlyUsd?: number;
      defaultBillMode?: "time_only" | "time_plus_tokens" | "baseline";
      billActiveMultiplier?: number;
      billingStyle?: "pure_active" | "effort_adjusted";
      useQualityConfidence?: boolean;
      useDifficultyWeight?: boolean;
      useCategoryWeight?: boolean;
      markBillingOnboarded?: boolean;
      theme?: "auto" | "light" | "dark";
    },
  ): Promise<AgencySettings> {
    await ensureAppUser(userId);
    const rows = (await sql`
      UPDATE app_user SET
        default_hourly_rate = CASE WHEN ${patch.defaultHourlyRate !== undefined} THEN ${patch.defaultHourlyRate ?? null}::numeric ELSE default_hourly_rate END,
        business_name       = CASE WHEN ${patch.businessName !== undefined} THEN ${patch.businessName ?? null}::text ELSE business_name END,
        business_address    = CASE WHEN ${patch.businessAddress !== undefined} THEN ${patch.businessAddress ?? null}::text ELSE business_address END,
        business_email      = CASE WHEN ${patch.businessEmail !== undefined} THEN ${patch.businessEmail ?? null}::text ELSE business_email END,
        business_currency   = COALESCE(${patch.businessCurrency ?? null}, business_currency),
        ai_cost_mode        = COALESCE(${patch.aiCostMode ?? null}::text, ai_cost_mode),
        ai_subscription_monthly_usd = CASE WHEN ${patch.aiSubscriptionMonthlyUsd !== undefined} THEN ${patch.aiSubscriptionMonthlyUsd ?? 0}::numeric ELSE ai_subscription_monthly_usd END,
        default_bill_mode   = COALESCE(${patch.defaultBillMode ?? null}::text, default_bill_mode),
        bill_active_multiplier = CASE WHEN ${patch.billActiveMultiplier !== undefined} THEN ${patch.billActiveMultiplier ?? 1}::numeric ELSE bill_active_multiplier END,
        billing_style       = COALESCE(${patch.billingStyle ?? null}::text, billing_style),
        use_quality_confidence = CASE WHEN ${patch.useQualityConfidence !== undefined} THEN ${patch.useQualityConfidence ?? true}::boolean ELSE use_quality_confidence END,
        use_difficulty_weight  = CASE WHEN ${patch.useDifficultyWeight !== undefined} THEN ${patch.useDifficultyWeight ?? false}::boolean ELSE use_difficulty_weight END,
        use_category_weight    = CASE WHEN ${patch.useCategoryWeight !== undefined} THEN ${patch.useCategoryWeight ?? false}::boolean ELSE use_category_weight END,
        billing_onboarded_at   = CASE WHEN ${patch.markBillingOnboarded === true} THEN now() ELSE billing_onboarded_at END,
        theme                  = COALESCE(${patch.theme ?? null}::text, theme)
      WHERE id = ${userId}
      RETURNING default_hourly_rate, business_name, business_address, business_email,
                business_currency,
                ai_cost_mode, ai_subscription_monthly_usd, default_bill_mode,
                bill_active_multiplier,
                billing_style, use_quality_confidence, use_difficulty_weight,
                use_category_weight, billing_onboarded_at, theme
    `) as AppUserRow[];
    return mapSettings(rows[0]);
  },

  async recomputeBillable(userId: string): Promise<{ updated: number }> {
    const settings = await store.getSettings(userId);
    const mode = settings.defaultBillMode;
    const rows = (await sql`
      SELECT id, runtime_sec, active_sec, baseline_hours, rate_usd, cost_usd,
             pricing_mode, kind, difficulty_score, change_category, quality_confidence
      FROM run
      WHERE user_id = ${userId} AND status = 'shipped' AND kind <> 'break'
    `) as Array<{
      id: string;
      runtime_sec: number;
      active_sec: number;
      baseline_hours: string | number;
      rate_usd: string | number;
      cost_usd: string | number;
      pricing_mode: string;
      kind: string;
      difficulty_score: string | number | null;
      change_category: string | null;
      quality_confidence: string | number | null;
    }>;
    let updated = 0;
    for (const r of rows) {
      const rate = num(r.rate_usd);
      const baseline = num(r.baseline_hours);
      const cost = num(r.cost_usd);
      const activeHours = (r.active_sec || r.runtime_sec) / 3600;
      const runtimeHours = r.runtime_sec / 3600;
      const effort = effortMultiplierForRun(settings, {
        changeCategory: asCategory(r.change_category),
        difficultyScore:
          r.difficulty_score == null ? undefined : num(r.difficulty_score),
        qualityConfidence:
          r.quality_confidence == null ? 1 : num(r.quality_confidence),
      });
      let billable = 0;
      if (mode === "baseline") {
        billable = baseline * rate * effort;
      } else if (mode === "time_plus_tokens") {
        billable = runtimeHours * rate * effort + cost;
      } else {
        const mult =
          settings.billingStyle === "pure_active"
            ? 1
            : settings.billActiveMultiplier || 1;
        billable = activeHours * mult * rate * effort;
      }
      billable = Number(billable.toFixed(2));
      await sql`
        UPDATE run
        SET billable_usd = ${billable},
            pricing_mode = ${mode}
        WHERE user_id = ${userId} AND id = ${r.id}
      `;
      updated++;
    }
    return { updated };
  },

  async amortizedSubscriptionCost(
    userId: string,
    runStartedAt: string,
    runActiveSec: number,
  ): Promise<number> {
    const settings = await store.getSettings(userId);
    if (settings.aiCostMode !== "subscription") return 0;
    const sub = settings.aiSubscriptionMonthlyUsd;
    if (sub <= 0 || runActiveSec <= 0) return 0;
    const start = new Date(runStartedAt);
    const monthStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    ).toISOString();
    const monthEnd = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    ).toISOString();
    const rows = (await sql`
      SELECT COALESCE(SUM(active_sec), 0)::int AS total_active
      FROM run
      WHERE user_id = ${userId}
        AND started_at >= ${monthStart}::timestamptz
        AND started_at < ${monthEnd}::timestamptz
        AND active_sec > 0
    `) as Array<{ total_active: number }>;
    const totalActive = rows[0]?.total_active ?? 0;
    if (totalActive <= 0) return 0;
    return Number(((sub * runActiveSec) / totalActive).toFixed(4));
  },

  // ─── Expenses ──────────────────────────────────────────────
  async listExpenses(
    userId: string,
    filter?: {
      projectId?: string;
      clientId?: string;
      fromDate?: string;
      toDate?: string;
      billable?: boolean;
      invoiceId?: string | null;
    },
  ): Promise<Expense[]> {
    const projectId = filter?.projectId ?? null;
    const clientId = filter?.clientId ?? null;
    const fromDate = filter?.fromDate ?? null;
    const toDate = filter?.toDate ?? null;
    const billable = filter?.billable ?? null;
    const filterInvoiceId = "invoiceId" in (filter ?? {});
    const invoiceIdIsNull = filter?.invoiceId === null;
    const invoiceIdValue = invoiceIdIsNull ? null : (filter?.invoiceId ?? null);

    let rows: ExpenseRow[];
    if (!filterInvoiceId) {
      rows = (await sql`
        SELECT id, user_id, date, project_id, client_id, category, amount, currency,
               note, billable, receipt_url, receipt_pathname, invoice_id, created_at
        FROM expense
        WHERE user_id = ${userId}
          AND (${projectId}::text IS NULL OR project_id = ${projectId})
          AND (${clientId}::text IS NULL OR client_id = ${clientId})
          AND (${fromDate}::date IS NULL OR date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR date <= ${toDate}::date)
          AND (${billable}::boolean IS NULL OR billable = ${billable})
        ORDER BY date DESC, created_at DESC
      `) as ExpenseRow[];
    } else if (invoiceIdIsNull) {
      rows = (await sql`
        SELECT id, user_id, date, project_id, client_id, category, amount, currency,
               note, billable, receipt_url, receipt_pathname, invoice_id, created_at
        FROM expense
        WHERE user_id = ${userId}
          AND (${projectId}::text IS NULL OR project_id = ${projectId})
          AND (${clientId}::text IS NULL OR client_id = ${clientId})
          AND (${fromDate}::date IS NULL OR date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR date <= ${toDate}::date)
          AND (${billable}::boolean IS NULL OR billable = ${billable})
          AND invoice_id IS NULL
        ORDER BY date DESC, created_at DESC
      `) as ExpenseRow[];
    } else {
      rows = (await sql`
        SELECT id, user_id, date, project_id, client_id, category, amount, currency,
               note, billable, receipt_url, receipt_pathname, invoice_id, created_at
        FROM expense
        WHERE user_id = ${userId}
          AND (${projectId}::text IS NULL OR project_id = ${projectId})
          AND (${clientId}::text IS NULL OR client_id = ${clientId})
          AND (${fromDate}::date IS NULL OR date >= ${fromDate}::date)
          AND (${toDate}::date IS NULL OR date <= ${toDate}::date)
          AND (${billable}::boolean IS NULL OR billable = ${billable})
          AND invoice_id = ${invoiceIdValue}
        ORDER BY date DESC, created_at DESC
      `) as ExpenseRow[];
    }
    return rows.map(mapExpense);
  },

  async getExpense(userId: string, id: string): Promise<Expense | undefined> {
    const rows = (await sql`
      SELECT id, user_id, date, project_id, client_id, category, amount, currency,
             note, billable, receipt_url, receipt_pathname, invoice_id, created_at
      FROM expense
      WHERE user_id = ${userId} AND id = ${id}
      LIMIT 1
    `) as ExpenseRow[];
    return rows[0] ? mapExpense(rows[0]) : undefined;
  },

  async createExpense(
    userId: string,
    input: {
      date: string;
      projectId?: string;
      clientId?: string;
      category: ExpenseCategory;
      amount: number;
      currency?: string;
      note?: string;
      billable?: boolean;
      receiptUrl?: string;
      receiptPathname?: string;
    },
  ): Promise<Expense> {
    await ensureAppUser(userId);
    const id = genId("exp");
    // Derive clientId from project if not supplied
    let clientId = input.clientId ?? null;
    if (!clientId && input.projectId) {
      const proj = await store.getProject(userId, input.projectId);
      if (proj) clientId = proj.clientId;
    }
    const rows = (await sql`
      INSERT INTO expense (
        id, user_id, date, project_id, client_id, category, amount, currency,
        note, billable, receipt_url, receipt_pathname
      )
      VALUES (
        ${id}, ${userId}, ${input.date}::date,
        ${input.projectId ?? null}, ${clientId},
        ${input.category}, ${input.amount}, ${input.currency ?? "USD"},
        ${input.note ?? null}, ${input.billable ?? true},
        ${input.receiptUrl ?? null}, ${input.receiptPathname ?? null}
      )
      RETURNING id, user_id, date, project_id, client_id, category, amount, currency,
                note, billable, receipt_url, receipt_pathname, invoice_id, created_at
    `) as ExpenseRow[];
    return mapExpense(rows[0]);
  },

  async updateExpense(
    userId: string,
    id: string,
    patch: {
      date?: string;
      projectId?: string | null;
      clientId?: string | null;
      category?: ExpenseCategory;
      amount?: number;
      currency?: string;
      note?: string | null;
      billable?: boolean;
      receiptUrl?: string | null;
      receiptPathname?: string | null;
      invoiceId?: string | null;
    },
  ): Promise<Expense> {
    const rows = (await sql`
      UPDATE expense SET
        date             = COALESCE(${patch.date ?? null}::date, date),
        project_id       = CASE WHEN ${patch.projectId !== undefined} THEN ${patch.projectId ?? null}::text ELSE project_id END,
        client_id        = CASE WHEN ${patch.clientId !== undefined} THEN ${patch.clientId ?? null}::text ELSE client_id END,
        category         = COALESCE(${patch.category ?? null}, category),
        amount           = COALESCE(${patch.amount ?? null}::numeric, amount),
        currency         = COALESCE(${patch.currency ?? null}, currency),
        note             = CASE WHEN ${patch.note !== undefined} THEN ${patch.note ?? null}::text ELSE note END,
        billable         = COALESCE(${patch.billable ?? null}::boolean, billable),
        receipt_url      = CASE WHEN ${patch.receiptUrl !== undefined} THEN ${patch.receiptUrl ?? null}::text ELSE receipt_url END,
        receipt_pathname = CASE WHEN ${patch.receiptPathname !== undefined} THEN ${patch.receiptPathname ?? null}::text ELSE receipt_pathname END,
        invoice_id       = CASE WHEN ${patch.invoiceId !== undefined} THEN ${patch.invoiceId ?? null}::text ELSE invoice_id END
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING id, user_id, date, project_id, client_id, category, amount, currency,
                note, billable, receipt_url, receipt_pathname, invoice_id, created_at
    `) as ExpenseRow[];
    if (!rows[0]) throw new Error("Unknown expense");
    return mapExpense(rows[0]);
  },

  async deleteExpense(userId: string, id: string): Promise<void> {
    await sql`DELETE FROM expense WHERE user_id = ${userId} AND id = ${id}`;
  },

  async attachExpensesToInvoice(
    userId: string,
    expenseIds: string[],
    invoiceId: string,
  ): Promise<void> {
    if (expenseIds.length === 0) return;
    await sql`
      UPDATE expense
      SET invoice_id = ${invoiceId}
      WHERE user_id = ${userId} AND id = ANY(${expenseIds}::text[])
    `;
  },

  // ─── Leverage ──────────────────────────────────────────────
  async leverage(
    userId: string,
    windowDays = 30,
  ): Promise<LeverageSnapshot> {
    const cutoff = new Date(Date.now() - windowDays * DAY).toISOString();
    const rows = (await sql`
      SELECT
        COUNT(*)::int AS runs,
        COALESCE(SUM(runtime_sec)::numeric / 3600, 0) AS runtime_hours,
        COALESCE(SUM(active_sec)::numeric / 3600, 0) AS active_hours,
        COALESCE(SUM(baseline_hours), 0) AS effective_hours,
        COALESCE(SUM(billable_usd), 0) AS billable_usd,
        COALESCE(SUM(cost_usd), 0) AS cost_usd
      FROM run
      WHERE user_id = ${userId}
        AND status = 'shipped'
        AND started_at >= ${cutoff}
    `) as Array<{
      runs: number;
      runtime_hours: string;
      active_hours: string;
      effective_hours: string;
      billable_usd: string;
      cost_usd: string;
    }>;
    const r = rows[0];
    const runtimeHours = num(r?.runtime_hours);
    const effectiveHours = num(r?.effective_hours);
    const billableUsd = num(r?.billable_usd);
    const costUsd = num(r?.cost_usd);
    const margin = billableUsd - costUsd;
    return {
      windowDays,
      runs: r?.runs ?? 0,
      runtimeHours: Number(runtimeHours.toFixed(2)),
      activeHours: Number(num(r?.active_hours).toFixed(2)),
      effectiveHours: Number(effectiveHours.toFixed(2)),
      multiplier:
        runtimeHours > 0 ? Number((effectiveHours / runtimeHours).toFixed(2)) : 0,
      billableUsd: Number(billableUsd.toFixed(2)),
      costUsd: Number(costUsd.toFixed(4)),
      marginUsd: Number(margin.toFixed(2)),
      marginPct:
        billableUsd > 0
          ? Number(((margin / billableUsd) * 100).toFixed(2))
          : 0,
    };
  },

  async leverageDailyBuckets(
    userId: string,
    windowDays: number,
  ): Promise<Array<{ date: string; effective: number; runtime: number }>> {
    const cutoff = new Date(Date.now() - windowDays * DAY).toISOString();
    const rows = (await sql`
      SELECT
        to_char(started_at, 'MM-DD') AS date,
        COALESCE(SUM(baseline_hours), 0) AS effective,
        COALESCE(SUM(runtime_sec)::numeric / 3600, 0) AS runtime
      FROM run
      WHERE user_id = ${userId}
        AND status = 'shipped'
        AND started_at >= ${cutoff}::timestamptz
      GROUP BY date
    `) as Array<{ date: string; effective: string; runtime: string }>;

    const byDate = new Map<string, { effective: number; runtime: number }>();
    rows.forEach((r) => {
      byDate.set(r.date, { effective: num(r.effective), runtime: num(r.runtime) });
    });
    const out: Array<{ date: string; effective: number; runtime: number }> = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = d.toISOString().slice(5, 10);
      const v = byDate.get(key) ?? { effective: 0, runtime: 0 };
      out.push({
        date: key,
        effective: Number(v.effective.toFixed(2)),
        runtime: Number(v.runtime.toFixed(2)),
      });
    }
    return out;
  },

  async clientBillingSummary(
    userId: string,
    clientId: string,
  ): Promise<{
    uninvoicedRuns: {
      count: number;
      hours: number;
      activeHours: number;
      billableUsd: number;
      aiCostUsd: number;
      amortizedSubCostUsd: number;
    };
    uninvoicedExpenses: { count: number; amountUsd: number };
    invoices: {
      draft: { count: number; total: number };
      sent: { count: number; total: number };
      paid: { count: number; total: number };
      overdue: { count: number; total: number };
      void: { count: number; total: number };
    };
    outstandingUsd: number;
    lifetimeBilledUsd: number;
    lifetimePaidUsd: number;
    costMode: "per_token" | "subscription";
  }> {
    const settings = await store.getSettings(userId);
    const [runRows, expenseRows, invoiceStatusRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS run_count,
          COALESCE(SUM(billable_usd), 0) AS billable_usd,
          COALESCE(SUM(cost_usd), 0) AS cost_usd,
          COALESCE(SUM(baseline_hours), 0) AS hours,
          COALESCE(SUM(active_sec)::numeric / 3600, 0) AS active_hours,
          COALESCE(SUM(active_sec), 0)::int AS active_sec_total
        FROM run r
        WHERE r.user_id = ${userId}
          AND r.client_id = ${clientId}
          AND r.status = 'shipped'
          AND NOT EXISTS (
            SELECT 1 FROM invoice i, jsonb_array_elements(i.line_items) li
            WHERE i.user_id = ${userId} AND (li ->> 'runId') = r.id
          )
      `,
      sql`
        SELECT
          COUNT(*)::int AS expense_count,
          COALESCE(SUM(amount), 0) AS amount
        FROM expense
        WHERE user_id = ${userId}
          AND client_id = ${clientId}
          AND billable = true
          AND invoice_id IS NULL
      `,
      sql`
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_usd), 0) AS total
        FROM invoice
        WHERE user_id = ${userId} AND client_id = ${clientId}
        GROUP BY status
      `,
    ]);

    const runs = runRows as Array<{
      run_count: number;
      billable_usd: string;
      cost_usd: string;
      hours: string;
      active_hours: string;
      active_sec_total: number;
    }>;
    const expenses = expenseRows as Array<{
      expense_count: number;
      amount: string;
    }>;
    const invoiceRows = invoiceStatusRows as Array<{
      status: InvoiceStatus;
      count: number;
      total: string;
    }>;

    const r = runs[0];
    const e = expenses[0];

    const invoices: Record<
      InvoiceStatus,
      { count: number; total: number }
    > = {
      draft: { count: 0, total: 0 },
      sent: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      overdue: { count: 0, total: 0 },
      void: { count: 0, total: 0 },
    };
    invoiceRows.forEach((row) => {
      invoices[row.status] = { count: row.count, total: num(row.total) };
    });

    let amortizedSubCostUsd = 0;
    if (
      settings.aiCostMode === "subscription" &&
      settings.aiSubscriptionMonthlyUsd > 0
    ) {
      const monthRows = (await sql`
        SELECT
          to_char(date_trunc('month', started_at), 'YYYY-MM') AS month,
          COALESCE(SUM(active_sec), 0)::int AS active_sec_run,
          (
            SELECT COALESCE(SUM(active_sec), 0)::int
            FROM run r2
            WHERE r2.user_id = ${userId}
              AND date_trunc('month', r2.started_at) = date_trunc('month', r.started_at)
              AND r2.active_sec > 0
          ) AS month_total_active_sec
        FROM run r
        WHERE r.user_id = ${userId}
          AND r.client_id = ${clientId}
          AND r.status = 'shipped'
          AND r.active_sec > 0
          AND NOT EXISTS (
            SELECT 1 FROM invoice i, jsonb_array_elements(i.line_items) li
            WHERE i.user_id = ${userId} AND (li ->> 'runId') = r.id
          )
        GROUP BY date_trunc('month', started_at), r.started_at
      `) as Array<{
        month: string;
        active_sec_run: number;
        month_total_active_sec: number;
      }>;
      const sub = settings.aiSubscriptionMonthlyUsd;
      // Show at most one month of subscription cost: take the worst (max)
      // monthly share for this client. Spreading uninvoiced work across many
      // months should not multiply the displayed AI cost - the user pays the
      // sub once per month and we want the dashboard to reflect the
      // current-period commitment, not summed historical commitments.
      const byMonth = new Map<string, number>();
      monthRows.forEach((row) => {
        if (row.month_total_active_sec > 0) {
          const contribution =
            (sub * row.active_sec_run) / row.month_total_active_sec;
          byMonth.set(
            row.month,
            (byMonth.get(row.month) ?? 0) + contribution,
          );
        }
      });
      const maxMonthly = Math.max(0, ...byMonth.values());
      amortizedSubCostUsd = Number(maxMonthly.toFixed(2));
    }

    return {
      uninvoicedRuns: {
        count: r?.run_count ?? 0,
        hours: Number(num(r?.hours).toFixed(2)),
        activeHours: Number(num(r?.active_hours).toFixed(2)),
        billableUsd: Number(num(r?.billable_usd).toFixed(2)),
        aiCostUsd: Number(num(r?.cost_usd).toFixed(4)),
        amortizedSubCostUsd,
      },
      uninvoicedExpenses: {
        count: e?.expense_count ?? 0,
        amountUsd: Number(num(e?.amount).toFixed(2)),
      },
      invoices,
      outstandingUsd: Number(
        (invoices.sent.total + invoices.overdue.total).toFixed(2),
      ),
      lifetimeBilledUsd: Number(
        (
          invoices.sent.total +
          invoices.overdue.total +
          invoices.paid.total
        ).toFixed(2),
      ),
      lifetimePaidUsd: Number(invoices.paid.total.toFixed(2)),
      costMode: settings.aiCostMode,
    };
  },

  async listUninvoicedRunsForClient(
    userId: string,
    clientId: string,
    limit = 20,
  ): Promise<Run[]> {
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
      FROM run r
      WHERE r.user_id = ${userId}
        AND r.client_id = ${clientId}
        AND r.status = 'shipped'
        AND NOT EXISTS (
          SELECT 1 FROM invoice i, jsonb_array_elements(i.line_items) li
          WHERE i.user_id = ${userId} AND (li ->> 'runId') = r.id
        )
      ORDER BY started_at DESC
      LIMIT ${limit}
    `) as RunRow[];
    return rows.map(mapRun);
  },

  async dashboardSummary(userId: string): Promise<{
    activeRuns: number;
    totalRuns: number;
    clients: number;
    projects: number;
    skills: number;
    pendingApprovals: number;
    outstandingUsd: number;
  }> {
    const rows = (await sql`
      SELECT
        (SELECT COUNT(*)::int FROM run WHERE user_id = ${userId} AND status = 'running') AS active_runs,
        (SELECT COUNT(*)::int FROM run WHERE user_id = ${userId}) AS total_runs,
        (SELECT COUNT(*)::int FROM client WHERE user_id = ${userId}) AS clients,
        (SELECT COUNT(*)::int FROM project WHERE user_id = ${userId}) AS projects,
        (SELECT COUNT(*)::int FROM skill WHERE user_id = ${userId}) AS skills,
        (SELECT COUNT(*)::int FROM approval WHERE user_id = ${userId} AND status = 'pending') AS pending_approvals,
        (SELECT COALESCE(SUM(total_usd), 0) FROM invoice WHERE user_id = ${userId} AND status IN ('sent', 'overdue')) AS outstanding_usd
    `) as Array<{
      active_runs: number;
      total_runs: number;
      clients: number;
      projects: number;
      skills: number;
      pending_approvals: number;
      outstanding_usd: string | number;
    }>;
    const r = rows[0];
    return {
      activeRuns: r?.active_runs ?? 0,
      totalRuns: r?.total_runs ?? 0,
      clients: r?.clients ?? 0,
      projects: r?.projects ?? 0,
      skills: r?.skills ?? 0,
      pendingApprovals: r?.pending_approvals ?? 0,
      outstandingUsd: num(r?.outstanding_usd),
    };
  },

  async leverageTopSkills(
    userId: string,
    windowDays: number,
    limit = 5,
  ): Promise<Array<{ skillId: string; skillName: string; runs: number; hours: number }>> {
    const cutoff = new Date(Date.now() - windowDays * DAY).toISOString();
    const rows = (await sql`
      SELECT
        r.skill_id AS skill_id,
        s.name AS skill_name,
        COUNT(*)::int AS runs,
        COALESCE(SUM(r.baseline_hours), 0) AS hours
      FROM run r
      JOIN skill s ON s.id = r.skill_id AND s.user_id = r.user_id
      WHERE r.user_id = ${userId}
        AND r.status = 'shipped'
        AND r.started_at >= ${cutoff}::timestamptz
      GROUP BY r.skill_id, s.name
      ORDER BY hours DESC
      LIMIT ${limit}
    `) as Array<{ skill_id: string; skill_name: string; runs: number; hours: string }>;
    return rows.map((r) => ({
      skillId: r.skill_id,
      skillName: r.skill_name,
      runs: r.runs,
      hours: Number(num(r.hours).toFixed(2)),
    }));
  },

  // ─── cwd_mapping ──────────────────────────────────────────────────────────
  // Maps a working directory to a (client, project). Used by the Stop hook so
  // future sessions from the same cwd land directly on the right project
  // instead of in the unsorted Inbox.

  async findCwdMapping(
    userId: string,
    cwd: string,
  ): Promise<{ clientId: string; projectId: string } | undefined> {
    const rows = (await sql`
      SELECT client_id, project_id
      FROM cwd_mapping
      WHERE user_id = ${userId} AND cwd = ${cwd}
      LIMIT 1
    `) as Array<{ client_id: string; project_id: string }>;
    return rows[0]
      ? { clientId: rows[0].client_id, projectId: rows[0].project_id }
      : undefined;
  },

  async listCwdMappings(userId: string): Promise<CwdMapping[]> {
    const rows = (await sql`
      SELECT id, cwd, client_id, project_id, created_at
      FROM cwd_mapping
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `) as Array<{
      id: string;
      cwd: string;
      client_id: string;
      project_id: string;
      created_at: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      cwd: r.cwd,
      clientId: r.client_id,
      projectId: r.project_id,
      createdAt: iso(r.created_at),
    }));
  },

  async upsertCwdMapping(
    userId: string,
    input: { cwd: string; clientId: string; projectId: string },
  ): Promise<CwdMapping> {
    const id = genId("cwm");
    const rows = (await sql`
      INSERT INTO cwd_mapping (id, user_id, cwd, client_id, project_id)
      VALUES (${id}, ${userId}, ${input.cwd}, ${input.clientId}, ${input.projectId})
      ON CONFLICT (user_id, cwd) DO UPDATE
        SET client_id = EXCLUDED.client_id,
            project_id = EXCLUDED.project_id
      RETURNING id, cwd, client_id, project_id, created_at
    `) as Array<{
      id: string;
      cwd: string;
      client_id: string;
      project_id: string;
      created_at: string;
    }>;
    const r = rows[0];
    return {
      id: r.id,
      cwd: r.cwd,
      clientId: r.client_id,
      projectId: r.project_id,
      createdAt: iso(r.created_at),
    };
  },

  async deleteCwdMapping(userId: string, id: string): Promise<void> {
    await sql`DELETE FROM cwd_mapping WHERE user_id = ${userId} AND id = ${id}`;
  },

  // ─── Unsorted Inbox ───────────────────────────────────────────────────────
  // Runs created by the Stop hook for a cwd that has no mapping yet land
  // here with client_id / project_id null. The user triages them via
  // assignUnsortedRun, optionally also creating a permanent cwd_mapping.

  async listUnsortedRuns(userId: string): Promise<Run[]> {
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
      FROM run
      WHERE user_id = ${userId} AND unsorted = true
      ORDER BY started_at DESC
    `) as RunRow[];
    return rows.map(mapRun);
  },

  async bulkAssignRuns(
    userId: string,
    runIds: string[],
    input: { clientId: string; projectId: string; alsoMapCwd?: boolean },
  ): Promise<{ updated: number; mappedCwds: string[] }> {
    if (runIds.length === 0) return { updated: 0, mappedCwds: [] };

    const [client, project] = await Promise.all([
      store.getClient(userId, input.clientId),
      store.getProject(userId, input.projectId),
    ]);
    if (!client || !project) throw new Error("Unknown client or project");
    if (project.clientId !== input.clientId) {
      throw new Error("Project does not belong to client");
    }

    const settings = await store.getSettings(userId);
    const billMode = settings.defaultBillMode;
    const mult =
      settings.billingStyle === "pure_active"
        ? 1
        : settings.billActiveMultiplier || 1;

    // Recompute rate_usd as client.hourlyRate × skill.rateModifier and
    // billable_usd according to the user's bill mode. Single SQL pass.
    const updateRows = (await sql`
      UPDATE run
      SET client_id    = ${input.clientId},
          project_id   = ${input.projectId},
          rate_usd     = (${client.hourlyRate}::numeric * s.rate_modifier),
          billable_usd = CASE
            WHEN run.pricing_mode = 'baseline'
              THEN run.baseline_hours * ${client.hourlyRate}::numeric * s.rate_modifier
            WHEN ${billMode} = 'time_only'
              THEN (run.active_sec::numeric / 3600)
                   * ${mult}::numeric
                   * ${client.hourlyRate}::numeric
                   * s.rate_modifier
            ELSE (run.active_sec::numeric / 3600)
                 * ${client.hourlyRate}::numeric
                 * s.rate_modifier
                 + run.cost_usd
          END,
          unsorted = false
      FROM skill s
      WHERE run.user_id = ${userId}
        AND run.id = ANY(${runIds}::text[])
        AND s.id = run.skill_id
        AND s.user_id = run.user_id
      RETURNING run.id, run.cwd
    `) as Array<{ id: string; cwd: string | null }>;

    const mappedCwds: string[] = [];
    if (input.alsoMapCwd) {
      const cwds = Array.from(
        new Set(updateRows.map((r) => r.cwd).filter((c): c is string => !!c)),
      );
      for (const cwd of cwds) {
        await store.upsertCwdMapping(userId, {
          cwd,
          clientId: input.clientId,
          projectId: input.projectId,
        });
        mappedCwds.push(cwd);
      }
    }

    return { updated: updateRows.length, mappedCwds };
  },

  async assignUnsortedRun(
    userId: string,
    runId: string,
    input: {
      clientId: string;
      projectId: string;
      alsoMapCwd?: boolean;
    },
  ): Promise<Run> {
    const existing = await store.getRun(userId, runId);
    if (!existing) throw new Error("Unknown run");
    if (!existing.unsorted) throw new Error("Run is not unsorted");

    const [client, project] = await Promise.all([
      store.getClient(userId, input.clientId),
      store.getProject(userId, input.projectId),
    ]);
    if (!client || !project) {
      throw new Error("Unknown client or project");
    }
    if (project.clientId !== input.clientId) {
      throw new Error("Project does not belong to client");
    }

    // Recompute pricing now that we know the client's rate.
    const skill = await store.getSkill(userId, existing.skillId);
    if (!skill) throw new Error("Unknown skill");
    const rateUsd = client.hourlyRate * skill.rateModifier;
    const activeHours = existing.activeSec / 3600;
    const runtimeHours = existing.runtimeSec / 3600;
    const settings = await store.getSettings(userId);
    let billable: number;
    if (existing.pricingMode === "baseline") {
      billable = Number((existing.baselineHours * rateUsd).toFixed(2));
    } else if (settings.defaultBillMode === "time_only") {
      const mult =
        settings.billingStyle === "pure_active"
          ? 1
          : settings.billActiveMultiplier || 1;
      billable = Number((activeHours * mult * rateUsd).toFixed(2));
    } else {
      billable = Number((activeHours * rateUsd + existing.costUsd).toFixed(2));
    }

    await sql`
      UPDATE run
      SET client_id = ${input.clientId},
          project_id = ${input.projectId},
          rate_usd = ${rateUsd},
          billable_usd = ${billable},
          unsorted = false
      WHERE user_id = ${userId} AND id = ${runId}
    `;

    if (input.alsoMapCwd && existing.cwd) {
      await store.upsertCwdMapping(userId, {
        cwd: existing.cwd,
        clientId: input.clientId,
        projectId: input.projectId,
      });
      // Also retro-assign every other unsorted run from the same cwd.
      await sql`
        UPDATE run
        SET client_id = ${input.clientId},
            project_id = ${input.projectId},
            rate_usd = ${rateUsd},
            unsorted = false
        WHERE user_id = ${userId}
          AND unsorted = true
          AND cwd = ${existing.cwd}
      `;
    }

    const updated = await store.getRun(userId, runId);
    if (!updated) throw new Error("Failed to reload run");
    return updated;
  },

  // ─── Run scoring helpers ───────────────────────────────────
  async countRunEvents(userId: string, runId: string): Promise<number> {
    const rows = (await sql`
      SELECT COUNT(*)::int AS n
      FROM run_event
      WHERE user_id = ${userId} AND run_id = ${runId}
    `) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  },

  async recentRunSignals(
    userId: string,
    excludeRunId?: string,
  ): Promise<{
    totalTokens: number[];
    activeSec: number[];
    eventCount: number[];
  }> {
    // Last 100 ended runs for this user, excluding the current one if given.
    // We compute event_count per run via a subquery so we get one row each.
    const rows = (await sql`
      SELECT
        r.id,
        COALESCE(r.tokens_in, 0) + COALESCE(r.tokens_out, 0) AS total_tokens,
        COALESCE(r.active_sec, 0) AS active_sec,
        COALESCE((SELECT COUNT(*) FROM run_event e WHERE e.run_id = r.id), 0) AS event_count
      FROM run r
      WHERE r.user_id = ${userId}
        AND r.ended_at IS NOT NULL
        AND (${excludeRunId ?? null}::text IS NULL OR r.id <> ${excludeRunId ?? null})
      ORDER BY r.ended_at DESC
      LIMIT 100
    `) as Array<{
      total_tokens: string | number;
      active_sec: string | number;
      event_count: string | number;
    }>;
    return {
      totalTokens: rows.map((r) => num(r.total_tokens)),
      activeSec: rows.map((r) => num(r.active_sec)),
      eventCount: rows.map((r) => num(r.event_count)),
    };
  },

  async recordFollowUpBugfix(
    userId: string,
    bugfixRun: Run,
  ): Promise<void> {
    if (!bugfixRun.cwd) return;
    // Find the most recent prior shipped run in the same cwd within 14 days.
    const cutoff = new Date(
      new Date(bugfixRun.startedAt).getTime() - 14 * DAY,
    ).toISOString();
    const rows = (await sql`
      SELECT id, quality_confidence
      FROM run
      WHERE user_id = ${userId}
        AND id <> ${bugfixRun.id}
        AND cwd = ${bugfixRun.cwd}
        AND status = 'shipped'
        AND ended_at IS NOT NULL
        AND ended_at >= ${cutoff}
        AND ended_at <= ${bugfixRun.startedAt}
      ORDER BY ended_at DESC
      LIMIT 1
    `) as Array<{ id: string; quality_confidence: string | number }>;
    const target = rows[0];
    if (!target) return;
    await store.applyQualitySignal(userId, target.id, {
      kind: "follow_up_bugfix",
      delta: -0.15,
      reason: `Follow-up bugfix in same cwd (run ${bugfixRun.id})`,
      source: "auto",
      relatedRunId: bugfixRun.id,
    });
  },

  async listQualitySignals(
    userId: string,
    runId: string,
  ): Promise<QualitySignal[]> {
    const rows = (await sql`
      SELECT id, run_id, kind, reason, delta, source, related_run_id, created_at
      FROM quality_signal
      WHERE user_id = ${userId} AND run_id = ${runId}
      ORDER BY created_at DESC
    `) as QualitySignalRow[];
    return rows.map(mapQualitySignal);
  },

  async applyQualitySignal(
    userId: string,
    runId: string,
    input: {
      kind: QualitySignalKind;
      delta: number;
      reason?: string;
      source: "auto" | "manual";
      relatedRunId?: string;
    },
  ): Promise<{ run: Run; signal: QualitySignal }> {
    const run = await store.getRun(userId, runId);
    if (!run) throw new Error("Unknown run");
    const id = genId("qs");
    const sigRows = (await sql`
      INSERT INTO quality_signal (id, user_id, run_id, kind, reason, delta, source, related_run_id)
      VALUES (
        ${id}, ${userId}, ${runId}, ${input.kind}, ${input.reason ?? null},
        ${input.delta}, ${input.source}, ${input.relatedRunId ?? null}
      )
      RETURNING id, run_id, kind, reason, delta, source, related_run_id, created_at
    `) as QualitySignalRow[];
    // Recompute confidence from all signals: clamp(1 + sum(deltas), 0.3, 1.0).
    const sumRows = (await sql`
      SELECT COALESCE(SUM(delta), 0) AS total
      FROM quality_signal
      WHERE user_id = ${userId} AND run_id = ${runId}
    `) as Array<{ total: string | number }>;
    const total = num(sumRows[0]?.total ?? 0);
    const next = Math.max(0.3, Math.min(1, 1 + total));
    const updated = (await sql`
      UPDATE run
      SET quality_confidence = ${next}
      WHERE user_id = ${userId} AND id = ${runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    return {
      run: mapRun(updated[0]),
      signal: mapQualitySignal(sigRows[0]),
    };
  },

  async setManualQualityConfidence(
    userId: string,
    runId: string,
    input: { confidence: number; reason?: string },
  ): Promise<{ run: Run; signal: QualitySignal }> {
    if (
      !Number.isFinite(input.confidence) ||
      input.confidence < 0.3 ||
      input.confidence > 1
    ) {
      throw new Error("confidence must be between 0.3 and 1.0");
    }
    const run = await store.getRun(userId, runId);
    if (!run) throw new Error("Unknown run");
    // Manual override replaces any prior manual signal so the slider behaves
    // as a single source of truth from the user's perspective. Auto signals
    // remain part of history but the manual delta is always recomputed
    // against current auto sum, keeping the math consistent.
    await sql`
      DELETE FROM quality_signal
      WHERE user_id = ${userId} AND run_id = ${runId} AND source = 'manual'
    `;
    const autoRows = (await sql`
      SELECT COALESCE(SUM(delta), 0) AS total
      FROM quality_signal
      WHERE user_id = ${userId} AND run_id = ${runId}
    `) as Array<{ total: string | number }>;
    const autoTotal = num(autoRows[0]?.total ?? 0);
    const delta = Number((input.confidence - 1 - autoTotal).toFixed(3));
    return store.applyQualitySignal(userId, runId, {
      kind: "manual_adjust",
      delta,
      reason: input.reason ?? "Manual review",
      source: "manual",
    });
  },

  async setImpactNote(
    userId: string,
    runId: string,
    note: string | null,
  ): Promise<Run> {
    const trimmed = note?.trim();
    const rows = (await sql`
      UPDATE run
      SET impact_note = ${trimmed && trimmed.length > 0 ? trimmed : null}
      WHERE user_id = ${userId} AND id = ${runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    if (!rows[0]) throw new Error("Unknown run");
    return mapRun(rows[0]);
  },

  async setChangeCategory(
    userId: string,
    runId: string,
    category: ChangeCategory,
  ): Promise<Run> {
    if (!(KNOWN_CATEGORIES as readonly string[]).includes(category)) {
      throw new Error("Unknown category");
    }
    const rows = (await sql`
      UPDATE run
      SET change_category = ${category}
      WHERE user_id = ${userId} AND id = ${runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, kind, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes, unsorted,
                difficulty_score, change_category, quality_confidence, impact_note
    `) as RunRow[];
    if (!rows[0]) throw new Error("Unknown run");
    return mapRun(rows[0]);
  },
};

export type Store = typeof store;
