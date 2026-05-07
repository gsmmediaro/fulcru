import { sql } from "@/lib/db";
import type {
  AgencySettings,
  Approval,
  ApprovalStatus,
  Client,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  LeverageSnapshot,
  Project,
  Run,
  RunEvent,
  RunEventKind,
  RunStatus,
  Skill,
  SkillCategory,
} from "./types";

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
  client_id: string;
  project_id: string;
  skill_id: string;
  agent_name: string;
  status: RunStatus;
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
};
function mapRun(r: RunRow): Run {
  return {
    id: r.id,
    clientId: r.client_id,
    projectId: r.project_id,
    skillId: r.skill_id,
    agentName: r.agent_name,
    status: r.status,
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

type AppUserRow = {
  default_hourly_rate: string | number | null;
  business_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_currency: string;
};
function mapSettings(r: AppUserRow): AgencySettings {
  return {
    defaultHourlyRate:
      r.default_hourly_rate == null ? undefined : num(r.default_hourly_rate),
    businessName: r.business_name ?? undefined,
    businessAddress: r.business_address ?? undefined,
    businessEmail: r.business_email ?? undefined,
    businessCurrency: r.business_currency,
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
    },
  ): Promise<Run[]> {
    const limit = filter?.limit ?? 1000;
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes
      FROM run
      WHERE user_id = ${userId}
        AND (${filter?.clientId ?? null}::text IS NULL OR client_id = ${filter?.clientId ?? null})
        AND (${filter?.projectId ?? null}::text IS NULL OR project_id = ${filter?.projectId ?? null})
        AND (${filter?.status ?? null}::text IS NULL OR status = ${filter?.status ?? null})
      ORDER BY started_at DESC
      LIMIT ${limit}
    `) as RunRow[];
    return rows.map(mapRun);
  },

  async getRun(userId: string, id: string): Promise<Run | undefined> {
    const rows = (await sql`
      SELECT id, client_id, project_id, skill_id, agent_name, status, prompt, cwd,
             pricing_mode, started_at, ended_at, runtime_sec, active_sec,
             tokens_in, tokens_out, cache_hits, cost_usd,
             baseline_hours, rate_usd, billable_usd, deliverable_url, notes
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
      pricingMode?: "baseline" | "time_plus_tokens";
    },
  ): Promise<Run> {
    const [client, project, skill] = await Promise.all([
      store.getClient(userId, input.clientId),
      store.getProject(userId, input.projectId),
      store.getSkill(userId, input.skillId),
    ]);
    if (!client || !project || !skill) {
      throw new Error("Unknown client / project / skill");
    }
    const id = genId("run");
    const agentName = input.agentName ?? "claude-opus-4-7";
    const pricingMode = input.pricingMode ?? "time_plus_tokens";
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
      RETURNING id, client_id, project_id, skill_id, agent_name, status, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes
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
      billable =
        run.pricingMode === "baseline"
          ? Number((run.baselineHours * run.rateUsd).toFixed(2))
          : Number((runtimeHours * run.rateUsd + run.costUsd).toFixed(2));
    }
    const rows = (await sql`
      UPDATE run
      SET status = ${input.status},
          ended_at = NOW(),
          runtime_sec = ${runtimeSec},
          deliverable_url = ${input.deliverableUrl ?? null},
          notes = ${input.notes ?? null},
          billable_usd = ${billable}
      WHERE user_id = ${userId} AND id = ${input.runId}
      RETURNING id, client_id, project_id, skill_id, agent_name, status, prompt, cwd,
                pricing_mode, started_at, ended_at, runtime_sec, active_sec,
                tokens_in, tokens_out, cache_hits, cost_usd,
                baseline_hours, rate_usd, billable_usd, deliverable_url, notes
    `) as RunRow[];
    await sql`
      INSERT INTO run_event (id, user_id, run_id, kind, label, detail)
      VALUES (
        ${genId("evt")}, ${userId}, ${input.runId},
        'milestone', ${`Run ${input.status}`},
        ${input.deliverableUrl ?? null}
      )
    `;
    return mapRun(rows[0]);
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
      skill_name: string;
    }>;
    if (eligible.length === 0) {
      throw new Error("No uninvoiced shipped runs for this client in the window");
    }
    const lineItems: InvoiceLineItem[] = eligible.map((r) => {
      const quantity = num(r.baseline_hours);
      const unitPrice = num(r.rate_usd);
      return {
        type: "service",
        description: `${r.skill_name} - run ${r.id}`,
        quantity,
        unitPrice,
        amount: num(r.billable_usd) || quantity * unitPrice,
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
      SELECT default_hourly_rate, business_name, business_address, business_email, business_currency
      FROM app_user
      WHERE id = ${userId}
      LIMIT 1
    `) as AppUserRow[];
    return rows[0]
      ? mapSettings(rows[0])
      : { businessCurrency: "USD" };
  },

  async updateSettings(
    userId: string,
    patch: {
      defaultHourlyRate?: number | null;
      businessName?: string | null;
      businessAddress?: string | null;
      businessEmail?: string | null;
      businessCurrency?: string;
    },
  ): Promise<AgencySettings> {
    await ensureAppUser(userId);
    const rows = (await sql`
      UPDATE app_user SET
        default_hourly_rate = CASE WHEN ${patch.defaultHourlyRate !== undefined} THEN ${patch.defaultHourlyRate ?? null}::numeric ELSE default_hourly_rate END,
        business_name       = CASE WHEN ${patch.businessName !== undefined} THEN ${patch.businessName ?? null}::text ELSE business_name END,
        business_address    = CASE WHEN ${patch.businessAddress !== undefined} THEN ${patch.businessAddress ?? null}::text ELSE business_address END,
        business_email      = CASE WHEN ${patch.businessEmail !== undefined} THEN ${patch.businessEmail ?? null}::text ELSE business_email END,
        business_currency   = COALESCE(${patch.businessCurrency ?? null}, business_currency)
      WHERE id = ${userId}
      RETURNING default_hourly_rate, business_name, business_address, business_email, business_currency
    `) as AppUserRow[];
    return mapSettings(rows[0]);
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
};

export type Store = typeof store;
