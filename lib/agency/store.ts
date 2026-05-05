import type {
  Approval,
  Client,
  Invoice,
  Project,
  Run,
  RunEvent,
  RunEventKind,
  RunStatus,
  Skill,
} from "./types";

type Store = {
  clients: Client[];
  projects: Project[];
  skills: Skill[];
  runs: Run[];
  events: RunEvent[];
  approvals: Approval[];
  invoices: Invoice[];
};

declare global {
  // eslint-disable-next-line no-var
  var __agencyStore: Store | undefined;
}

const NOW = new Date("2026-05-05T12:00:00Z").getTime();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const ts = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const SEED_CLIENTS: Client[] = [
  {
    id: "cli_dictando",
    name: "Dictando",
    initials: "DC",
    accentColor: "#FF7A1A",
    hourlyRate: 140,
    createdAt: ts(-90 * DAY),
  },
  {
    id: "cli_acme",
    name: "Acme Robotics",
    initials: "AR",
    accentColor: "#3B82F6",
    hourlyRate: 165,
    createdAt: ts(-180 * DAY),
  },
  {
    id: "cli_northstar",
    name: "NorthStar Health",
    initials: "NS",
    accentColor: "#10B981",
    hourlyRate: 200,
    createdAt: ts(-60 * DAY),
  },
  {
    id: "cli_pixelforge",
    name: "Pixel Forge",
    initials: "PF",
    accentColor: "#8B5CF6",
    hourlyRate: 120,
    createdAt: ts(-220 * DAY),
  },
];

const SEED_PROJECTS: Project[] = [
  {
    id: "prj_dict_site",
    clientId: "cli_dictando",
    name: "Q2 site refresh",
    description: "Marketing site rebuild on Next.js 15 + design tokens.",
    color: "#FF7A1A",
    createdAt: ts(-45 * DAY),
  },
  {
    id: "prj_dict_blog",
    clientId: "cli_dictando",
    name: "Editorial pipeline",
    description: "Long-form SEO articles, weekly cadence.",
    color: "#F59E0B",
    createdAt: ts(-30 * DAY),
  },
  {
    id: "prj_acme_dash",
    clientId: "cli_acme",
    name: "Fleet dashboard v2",
    description: "Internal robotics ops dashboard.",
    color: "#3B82F6",
    createdAt: ts(-120 * DAY),
  },
  {
    id: "prj_acme_api",
    clientId: "cli_acme",
    name: "Telemetry API",
    description: "gRPC ingestion + Postgres warehousing.",
    color: "#06B6D4",
    createdAt: ts(-90 * DAY),
  },
  {
    id: "prj_ns_portal",
    clientId: "cli_northstar",
    name: "Patient portal",
    description: "HIPAA-aware appointment + records portal.",
    color: "#10B981",
    createdAt: ts(-50 * DAY),
  },
  {
    id: "prj_ns_intake",
    clientId: "cli_northstar",
    name: "Intake automation",
    description: "Form-to-EHR pipeline with audit logging.",
    color: "#22C55E",
    createdAt: ts(-25 * DAY),
  },
  {
    id: "prj_pf_site",
    clientId: "cli_pixelforge",
    name: "Studio website",
    description: "Portfolio site + CMS.",
    color: "#8B5CF6",
    createdAt: ts(-150 * DAY),
  },
  {
    id: "prj_pf_brand",
    clientId: "cli_pixelforge",
    name: "Brand kit refresh",
    description: "Logo, type, color tokens, social templates.",
    color: "#A855F7",
    createdAt: ts(-40 * DAY),
  },
];

const SEED_SKILLS: Skill[] = [
  {
    id: "skl_landing_page",
    name: "Landing page redesign",
    description: "Hero, sections, CTA, responsive, ships to staging.",
    category: "engineering",
    baselineHours: 6,
    rateModifier: 1.0,
    tags: ["frontend", "marketing"],
  },
  {
    id: "skl_stripe_integration",
    name: "Stripe integration",
    description: "Checkout, webhooks, customer portal, idempotent.",
    category: "engineering",
    baselineHours: 12,
    rateModifier: 1.2,
    tags: ["payments", "backend"],
  },
  {
    id: "skl_bug_fix_fe",
    name: "Frontend bug fix",
    description: "Reproduce, isolate, patch, regression test.",
    category: "engineering",
    baselineHours: 2,
    rateModifier: 1.0,
    tags: ["frontend", "maintenance"],
  },
  {
    id: "skl_bug_fix_be",
    name: "Backend bug fix",
    description: "Trace, root-cause, patch, deploy with rollback plan.",
    category: "engineering",
    baselineHours: 3,
    rateModifier: 1.0,
    tags: ["backend", "maintenance"],
  },
  {
    id: "skl_blog_post",
    name: "Long-form blog post (1500w)",
    description: "Research, outline, draft, edit, SEO meta.",
    category: "content",
    baselineHours: 4,
    rateModifier: 0.85,
    tags: ["seo", "writing"],
  },
  {
    id: "skl_brand_guidelines",
    name: "Brand guidelines",
    description: "Logo lockups, type scale, color tokens, examples.",
    category: "design",
    baselineHours: 10,
    rateModifier: 1.1,
    tags: ["brand", "design"],
  },
  {
    id: "skl_dashboard_screen",
    name: "Dashboard screen",
    description: "Layout, components, data wiring, loading states.",
    category: "engineering",
    baselineHours: 8,
    rateModifier: 1.0,
    tags: ["frontend", "internal-tool"],
  },
  {
    id: "skl_api_endpoint",
    name: "API endpoint",
    description: "Schema, handler, auth, tests, docs.",
    category: "engineering",
    baselineHours: 4,
    rateModifier: 1.0,
    tags: ["backend"],
  },
  {
    id: "skl_user_research",
    name: "User research synthesis",
    description: "Transcribe, cluster, themes, insight memo.",
    category: "research",
    baselineHours: 6,
    rateModifier: 0.9,
    tags: ["research"],
  },
  {
    id: "skl_devops_pipeline",
    name: "CI/CD pipeline",
    description: "GitHub Actions, preview envs, secrets management.",
    category: "ops",
    baselineHours: 6,
    rateModifier: 1.15,
    tags: ["devops"],
  },
  {
    id: "skl_seo_audit",
    name: "SEO audit",
    description: "Crawl, on-page, schema, fixes plan.",
    category: "research",
    baselineHours: 5,
    rateModifier: 0.95,
    tags: ["seo"],
  },
  {
    id: "skl_email_template",
    name: "Email template set",
    description: "5 transactional templates, responsive, dark-mode safe.",
    category: "design",
    baselineHours: 3,
    rateModifier: 1.0,
    tags: ["email", "design"],
  },
];

function seedRuns(): {
  runs: Run[];
  events: RunEvent[];
  approvals: Approval[];
} {
  const runs: Run[] = [];
  const events: RunEvent[] = [];
  const approvals: Approval[] = [];

  const mkRun = (
    i: number,
    clientId: string,
    projectId: string,
    skillId: string,
    status: RunStatus,
    startOffsetMs: number,
    runtimeSec: number,
    activeSec: number,
    tokensIn: number,
    tokensOut: number,
  ): Run => {
    const client = SEED_CLIENTS.find((c) => c.id === clientId)!;
    const skill = SEED_SKILLS.find((s) => s.id === skillId)!;
    const rate = client.hourlyRate * skill.rateModifier;
    const billable =
      status === "shipped" ? skill.baselineHours * rate : 0;
    const cost = (tokensIn * 3 + tokensOut * 15) / 1_000_000;
    return {
      id: `run_${String(i).padStart(4, "0")}`,
      clientId,
      projectId,
      skillId,
      agentName: i % 3 === 0 ? "claude-opus-4-7" : "claude-sonnet-4-6",
      status,
      startedAt: ts(startOffsetMs),
      endedAt:
        status === "running" || status === "awaiting_approval"
          ? undefined
          : ts(startOffsetMs + runtimeSec * 1000),
      runtimeSec,
      activeSec,
      tokensIn,
      tokensOut,
      cacheHits: Math.round(tokensIn * 0.4),
      costUsd: Number(cost.toFixed(4)),
      baselineHours: skill.baselineHours,
      rateUsd: rate,
      billableUsd: Number(billable.toFixed(2)),
      prompt: undefined,
      deliverableUrl:
        status === "shipped" ? `https://github.com/agency/pr/${1000 + i}` : undefined,
    };
  };

  const seeds: Array<
    [
      string,
      string,
      string,
      RunStatus,
      number,
      number,
      number,
      number,
      number,
    ]
  > = [
    ["cli_dictando", "prj_dict_site", "skl_landing_page", "shipped", -7 * DAY, 980, 612, 184_000, 41_000],
    ["cli_dictando", "prj_dict_site", "skl_dashboard_screen", "shipped", -5 * DAY, 1420, 880, 220_000, 58_000],
    ["cli_dictando", "prj_dict_blog", "skl_blog_post", "shipped", -4 * DAY, 740, 410, 92_000, 28_000],
    ["cli_dictando", "prj_dict_blog", "skl_seo_audit", "shipped", -3 * DAY, 1200, 720, 130_000, 31_000],
    ["cli_acme", "prj_acme_dash", "skl_dashboard_screen", "shipped", -10 * DAY, 1690, 1010, 240_000, 62_000],
    ["cli_acme", "prj_acme_dash", "skl_bug_fix_fe", "shipped", -2 * DAY, 380, 220, 38_000, 9_400],
    ["cli_acme", "prj_acme_api", "skl_api_endpoint", "shipped", -8 * DAY, 920, 540, 110_000, 27_000],
    ["cli_acme", "prj_acme_api", "skl_devops_pipeline", "shipped", -6 * DAY, 1880, 1120, 270_000, 71_000],
    ["cli_northstar", "prj_ns_portal", "skl_landing_page", "shipped", -12 * DAY, 1050, 640, 175_000, 43_000],
    ["cli_northstar", "prj_ns_portal", "skl_stripe_integration", "shipped", -9 * DAY, 2840, 1720, 410_000, 102_000],
    ["cli_northstar", "prj_ns_intake", "skl_api_endpoint", "shipped", -1 * DAY, 870, 510, 99_000, 24_000],
    ["cli_northstar", "prj_ns_intake", "skl_bug_fix_be", "shipped", -1 * DAY - 6 * HOUR, 540, 320, 54_000, 14_000],
    ["cli_pixelforge", "prj_pf_site", "skl_landing_page", "shipped", -14 * DAY, 1100, 660, 195_000, 47_000],
    ["cli_pixelforge", "prj_pf_site", "skl_email_template", "shipped", -11 * DAY, 720, 410, 78_000, 19_000],
    ["cli_pixelforge", "prj_pf_brand", "skl_brand_guidelines", "shipped", -3 * DAY, 2210, 1330, 320_000, 84_000],
    ["cli_pixelforge", "prj_pf_brand", "skl_user_research", "shipped", -2 * DAY - 4 * HOUR, 1480, 880, 165_000, 38_000],
    ["cli_dictando", "prj_dict_site", "skl_bug_fix_fe", "failed", -2 * DAY - 2 * HOUR, 290, 170, 31_000, 7_400],
    ["cli_acme", "prj_acme_dash", "skl_bug_fix_fe", "cancelled", -1 * DAY - 1 * HOUR, 60, 30, 4_200, 900],
    ["cli_dictando", "prj_dict_site", "skl_landing_page", "awaiting_approval", -45 * 60 * 1000, 380, 240, 62_000, 16_000],
    ["cli_northstar", "prj_ns_intake", "skl_api_endpoint", "awaiting_approval", -22 * 60 * 1000, 190, 120, 28_000, 7_200],
    ["cli_acme", "prj_acme_api", "skl_devops_pipeline", "awaiting_approval", -15 * 60 * 1000, 220, 140, 41_000, 9_800],
    ["cli_dictando", "prj_dict_blog", "skl_blog_post", "running", -8 * 60 * 1000, 480, 280, 71_000, 18_000],
    ["cli_pixelforge", "prj_pf_brand", "skl_brand_guidelines", "running", -3 * 60 * 1000, 180, 110, 24_000, 6_100],
    ["cli_acme", "prj_acme_dash", "skl_dashboard_screen", "running", -90_000, 90, 55, 12_000, 3_000],
    ["cli_northstar", "prj_ns_portal", "skl_landing_page", "running", -30_000, 30, 20, 4_400, 1_100],
  ];

  seeds.forEach((s, i) => {
    runs.push(mkRun(i + 1, ...s));
  });

  const eventTemplates: Array<
    [RunEventKind, string, string?, number?]
  > = [
    ["tool_call", "Read package.json", "Inspecting dependencies", 120],
    ["tool_call", "Glob '**/*.tsx'", "Map component layout", 240],
    ["thought", "Plan: extract Hero into shared component", undefined, 0],
    ["file_edit", "components/marketing/hero.tsx", "+148 / -22", 1100],
    ["tool_call", "Bash 'pnpm build'", "Verify type-check passes", 18_400],
    ["decision", "Use server component for above-the-fold", "Avoids hydration cost", 0],
    ["file_edit", "app/(marketing)/page.tsx", "+62 / -41", 700],
    ["tool_call", "Grep '@/components/ui/button'", undefined, 90],
    ["milestone", "Deliverable pushed to staging", "https://staging.example.com", 0],
  ];

  runs.forEach((run, ri) => {
    if (run.status === "running" || run.status === "shipped" || run.status === "awaiting_approval") {
      const count = run.status === "shipped" ? 9 : run.status === "awaiting_approval" ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const tpl = eventTemplates[i % eventTemplates.length];
        events.push({
          id: `evt_${run.id}_${i}`,
          runId: run.id,
          ts: ts(
            new Date(run.startedAt).getTime() - NOW + i * 30_000 + ri * 100,
          ),
          kind: tpl[0],
          label: tpl[1],
          detail: tpl[2],
          durationMs: tpl[3],
        });
      }
    }
  });

  const approvalSeeds: Array<[string, string, string]> = [
    ["run_0019", "Publish landing page redesign to production?", "Staging URL: https://staging.dictando.ro · Lighthouse 98/100/100/100"],
    ["run_0020", "Drop and recreate intake_forms table for new schema?", "Migration is non-reversible. Backup snapshot id: snap_8f2a1c."],
    ["run_0021", "Rotate production deploy key and update GitHub Actions secret?", "Old key still valid for 24h after rotation."],
  ];

  approvalSeeds.forEach(([runId, q, ctx], i) => {
    approvals.push({
      id: `apr_${String(i + 1).padStart(4, "0")}`,
      runId,
      question: q,
      context: ctx,
      status: "pending",
      createdAt: ts(-(15 + i * 10) * 60 * 1000),
    });
    events.push({
      id: `evt_${runId}_apr`,
      runId,
      ts: ts(-(15 + i * 10) * 60 * 1000),
      kind: "approval_requested",
      label: q,
      detail: ctx,
    });
  });

  return { runs, events, approvals };
}

function seedInvoices(runs: Run[]): Invoice[] {
  const invoices: Invoice[] = [];
  const periodStart = ts(-30 * DAY);
  const periodEnd = ts(0);

  SEED_CLIENTS.forEach((client, idx) => {
    const clientRuns = runs.filter(
      (r) => r.clientId === client.id && r.status === "shipped",
    );
    if (clientRuns.length === 0) return;
    const lineItems = clientRuns.map((r) => {
      const skill = SEED_SKILLS.find((s) => s.id === r.skillId)!;
      return {
        runId: r.id,
        skillName: skill.name,
        description: `${skill.name} — run ${r.id}`,
        hours: r.baselineHours,
        rateUsd: r.rateUsd,
        amountUsd: r.billableUsd,
      };
    });
    const subtotal = lineItems.reduce((s, li) => s + li.amountUsd, 0);
    const tax = 0;
    invoices.push({
      id: `inv_${String(idx + 1).padStart(4, "0")}`,
      number: `INV-2026-${String(100 + idx).padStart(4, "0")}`,
      clientId: client.id,
      status: idx === 0 ? "sent" : idx === 1 ? "paid" : idx === 2 ? "draft" : "overdue",
      periodStart,
      periodEnd,
      issuedAt: idx === 2 ? undefined : ts(-2 * DAY),
      dueAt: ts(12 * DAY),
      paidAt: idx === 1 ? ts(-1 * DAY) : undefined,
      lineItems,
      subtotalUsd: Number(subtotal.toFixed(2)),
      taxUsd: tax,
      totalUsd: Number((subtotal + tax).toFixed(2)),
    });
  });

  return invoices;
}

function bootstrap(): Store {
  const { runs, events, approvals } = seedRuns();
  return {
    clients: SEED_CLIENTS,
    projects: SEED_PROJECTS,
    skills: SEED_SKILLS,
    runs,
    events,
    approvals,
    invoices: seedInvoices(runs),
  };
}

export function getStore(): Store {
  if (!globalThis.__agencyStore) {
    globalThis.__agencyStore = bootstrap();
  }
  return globalThis.__agencyStore;
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export const api = {
  listClients: () => getStore().clients.slice(),
  getClient: (id: string) =>
    getStore().clients.find((c) => c.id === id),
  listProjects: (clientId?: string) => {
    const s = getStore();
    return clientId
      ? s.projects.filter((p) => p.clientId === clientId)
      : s.projects.slice();
  },
  getProject: (id: string) =>
    getStore().projects.find((p) => p.id === id),
  listSkills: () => getStore().skills.slice(),
  getSkill: (id: string) =>
    getStore().skills.find((s) => s.id === id),

  listRuns: (filter?: {
    clientId?: string;
    projectId?: string;
    status?: RunStatus;
    limit?: number;
  }) => {
    const s = getStore();
    let rows = s.runs.slice();
    if (filter?.clientId) rows = rows.filter((r) => r.clientId === filter.clientId);
    if (filter?.projectId) rows = rows.filter((r) => r.projectId === filter.projectId);
    if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
    rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    if (filter?.limit) rows = rows.slice(0, filter.limit);
    return rows;
  },
  getRun: (id: string) => getStore().runs.find((r) => r.id === id),
  listRunEvents: (runId: string) =>
    getStore()
      .events.filter((e) => e.runId === runId)
      .sort((a, b) => a.ts.localeCompare(b.ts)),

  startRun: (input: {
    clientId: string;
    projectId: string;
    skillId: string;
    agentName?: string;
    prompt?: string;
  }) => {
    const s = getStore();
    const client = s.clients.find((c) => c.id === input.clientId);
    const project = s.projects.find((p) => p.id === input.projectId);
    const skill = s.skills.find((sk) => sk.id === input.skillId);
    if (!client || !project || !skill) {
      throw new Error("Unknown client / project / skill");
    }
    const run: Run = {
      id: genId("run"),
      clientId: client.id,
      projectId: project.id,
      skillId: skill.id,
      agentName: input.agentName ?? "claude-opus-4-7",
      status: "running",
      prompt: input.prompt,
      startedAt: new Date().toISOString(),
      runtimeSec: 0,
      activeSec: 0,
      tokensIn: 0,
      tokensOut: 0,
      cacheHits: 0,
      costUsd: 0,
      baselineHours: skill.baselineHours,
      rateUsd: client.hourlyRate * skill.rateModifier,
      billableUsd: 0,
    };
    s.runs.unshift(run);
    s.events.push({
      id: genId("evt"),
      runId: run.id,
      ts: run.startedAt,
      kind: "milestone",
      label: `Run started · ${skill.name}`,
      detail: input.prompt,
    });
    return run;
  },

  recordEvent: (input: {
    runId: string;
    kind: RunEventKind;
    label: string;
    detail?: string;
    durationMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    activeMs?: number;
  }) => {
    const s = getStore();
    const run = s.runs.find((r) => r.id === input.runId);
    if (!run) throw new Error("Unknown run");
    const event: RunEvent = {
      id: genId("evt"),
      runId: run.id,
      ts: new Date().toISOString(),
      kind: input.kind,
      label: input.label,
      detail: input.detail,
      durationMs: input.durationMs,
    };
    s.events.push(event);
    if (input.tokensIn) run.tokensIn += input.tokensIn;
    if (input.tokensOut) run.tokensOut += input.tokensOut;
    if (input.activeMs) run.activeSec += Math.round(input.activeMs / 1000);
    run.costUsd = Number(
      ((run.tokensIn * 3 + run.tokensOut * 15) / 1_000_000).toFixed(4),
    );
    run.runtimeSec = Math.round(
      (Date.now() - new Date(run.startedAt).getTime()) / 1000,
    );
    return event;
  },

  requestApproval: (input: {
    runId: string;
    question: string;
    context?: string;
  }) => {
    const s = getStore();
    const run = s.runs.find((r) => r.id === input.runId);
    if (!run) throw new Error("Unknown run");
    const approval: Approval = {
      id: genId("apr"),
      runId: run.id,
      question: input.question,
      context: input.context,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    s.approvals.push(approval);
    run.status = "awaiting_approval";
    s.events.push({
      id: genId("evt"),
      runId: run.id,
      ts: approval.createdAt,
      kind: "approval_requested",
      label: input.question,
      detail: input.context,
    });
    return approval;
  },

  resolveApproval: (input: {
    approvalId: string;
    status: "approved" | "rejected";
    resolvedBy?: string;
  }) => {
    const s = getStore();
    const apr = s.approvals.find((a) => a.id === input.approvalId);
    if (!apr) throw new Error("Unknown approval");
    apr.status = input.status;
    apr.resolvedAt = new Date().toISOString();
    apr.resolvedBy = input.resolvedBy;
    const run = s.runs.find((r) => r.id === apr.runId);
    if (run) {
      run.status = input.status === "approved" ? "running" : "cancelled";
      s.events.push({
        id: genId("evt"),
        runId: run.id,
        ts: apr.resolvedAt!,
        kind: "approval_resolved",
        label: `${input.status === "approved" ? "Approved" : "Rejected"}: ${apr.question}`,
      });
    }
    return apr;
  },

  endRun: (input: {
    runId: string;
    status: "shipped" | "failed" | "cancelled";
    deliverableUrl?: string;
    notes?: string;
  }) => {
    const s = getStore();
    const run = s.runs.find((r) => r.id === input.runId);
    if (!run) throw new Error("Unknown run");
    run.status = input.status;
    run.endedAt = new Date().toISOString();
    run.deliverableUrl = input.deliverableUrl;
    run.notes = input.notes;
    run.runtimeSec = Math.round(
      (new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
    );
    if (input.status === "shipped") {
      run.billableUsd = Number(
        (run.baselineHours * run.rateUsd).toFixed(2),
      );
    }
    s.events.push({
      id: genId("evt"),
      runId: run.id,
      ts: run.endedAt,
      kind: "milestone",
      label: `Run ${input.status}`,
      detail: input.deliverableUrl,
    });
    return run;
  },

  listApprovals: (status?: "pending" | "approved" | "rejected") => {
    const s = getStore();
    return status
      ? s.approvals.filter((a) => a.status === status)
      : s.approvals.slice();
  },

  listInvoices: (clientId?: string) => {
    const s = getStore();
    return clientId
      ? s.invoices.filter((i) => i.clientId === clientId)
      : s.invoices.slice();
  },
  getInvoice: (id: string) => getStore().invoices.find((i) => i.id === id),

  leverage: (windowDays = 30) => {
    const s = getStore();
    const cutoff = Date.now() - windowDays * DAY;
    const rows = s.runs.filter(
      (r) =>
        new Date(r.startedAt).getTime() >= cutoff &&
        r.status === "shipped",
    );
    const runtimeHours = rows.reduce((acc, r) => acc + r.runtimeSec / 3600, 0);
    const activeHours = rows.reduce((acc, r) => acc + r.activeSec / 3600, 0);
    const effectiveHours = rows.reduce((acc, r) => acc + r.baselineHours, 0);
    const billableUsd = rows.reduce((acc, r) => acc + r.billableUsd, 0);
    const costUsd = rows.reduce((acc, r) => acc + r.costUsd, 0);
    const margin = billableUsd - costUsd;
    return {
      windowDays,
      effectiveHours: Number(effectiveHours.toFixed(2)),
      runtimeHours: Number(runtimeHours.toFixed(2)),
      activeHours: Number(activeHours.toFixed(2)),
      multiplier: runtimeHours > 0 ? Number((effectiveHours / runtimeHours).toFixed(2)) : 0,
      billableUsd: Number(billableUsd.toFixed(2)),
      costUsd: Number(costUsd.toFixed(4)),
      marginUsd: Number(margin.toFixed(2)),
      marginPct: billableUsd > 0 ? Number(((margin / billableUsd) * 100).toFixed(2)) : 0,
      runs: rows.length,
    };
  },
};
