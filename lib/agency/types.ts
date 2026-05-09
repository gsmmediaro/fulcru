export type Client = {
  id: string;
  name: string;
  initials: string;
  accentColor: string;
  hourlyRate: number;
  email?: string;
  address?: string;
  ccRecipients?: string[];
  note?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
};

export type SkillCategory =
  | "engineering"
  | "design"
  | "content"
  | "ops"
  | "research";

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  baselineHours: number;
  rateModifier: number;
  tags: string[];
};

export type RunStatus =
  | "running"
  | "awaiting_approval"
  | "shipped"
  | "failed"
  | "cancelled";

export type RunKind = "mcp" | "manual" | "break";

export type ChangeCategory =
  | "feature"
  | "bugfix"
  | "refactor"
  | "infra"
  | "docs"
  | "test"
  | "performance"
  | "research";

export type DifficultyBucket =
  | "trivial"
  | "normal"
  | "moderate"
  | "hard"
  | "very_hard";

export type Run = {
  id: string;
  clientId?: string;
  projectId?: string;
  skillId: string;
  agentName: string;
  status: RunStatus;
  kind: RunKind;
  prompt?: string;
  startedAt: string;
  endedAt?: string;
  runtimeSec: number;
  activeSec: number;
  tokensIn: number;
  tokensOut: number;
  cacheHits: number;
  costUsd: number;
  baselineHours: number;
  rateUsd: number;
  billableUsd: number;
  deliverableUrl?: string;
  notes?: string;
  cwd?: string;
  pricingMode?: BillMode;
  /** True when the run was auto-logged via the Stop hook with no client/project mapping yet. Needs triage. */
  unsorted: boolean;
  /** 0..1 percentile-based score across tokens, active time, and event count vs the user's last 100 runs. */
  difficultyScore?: number;
  /** Auto-classified bucket from the prompt at run end. Override allowed. */
  changeCategory?: ChangeCategory;
  /** 0..1 multiplier applied at billing time. Default 1.0. Lowered by quality signals or manual adjust. */
  qualityConfidence: number;
  /** Optional narrative used in the Value Report, never on invoice. */
  impactNote?: string;
};

export type QualitySignalKind =
  | "manual_adjust"
  | "follow_up_bugfix"
  | "deliverable_revert"
  | "deliverable_fix_commit";

export type QualitySignal = {
  id: string;
  runId: string;
  kind: QualitySignalKind;
  reason?: string;
  delta: number;
  source: "auto" | "manual";
  relatedRunId?: string;
  createdAt: string;
};

export type CwdMapping = {
  id: string;
  cwd: string;
  clientId: string;
  projectId: string;
  createdAt: string;
};

export type RunEventKind =
  | "tool_call"
  | "thought"
  | "decision"
  | "file_edit"
  | "approval_requested"
  | "approval_resolved"
  | "error"
  | "milestone";

export type RunEvent = {
  id: string;
  runId: string;
  ts: string;
  kind: RunEventKind;
  label: string;
  detail?: string;
  durationMs?: number;
};

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Approval = {
  id: string;
  runId: string;
  question: string;
  context?: string;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type InvoiceItemType = "service" | "product";

export type InvoiceLineItem = {
  type: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  runId?: string;
  skillName?: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type InvoiceRecurrence =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type Invoice = {
  id: string;
  number: string;
  clientId: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  lineItems: InvoiceLineItem[];
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subject?: string;
  notes?: string;
  billFromName?: string;
  billFromAddress?: string;
  billFromEmail?: string;
  billToName?: string;
  billToAddress?: string;
  billToEmail?: string;
  billToCcEmails?: string[];
  discountAmount: number;
  taxPct: number;
  recurringEnabled: boolean;
  recurringRecurrence?: InvoiceRecurrence;
  recurringNextIssue?: string;
};

export type ExpenseCategory =
  | "ai_tools"
  | "software"
  | "hosting"
  | "domain"
  | "hardware"
  | "travel"
  | "food"
  | "marketing"
  | "education"
  | "other";

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  projectId?: string;
  clientId?: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  note?: string;
  billable: boolean;
  receiptUrl?: string;
  receiptPathname?: string;
  invoiceId?: string;
  createdAt: string;
};

export type AiCostMode = "per_token" | "subscription";
export type BillMode = "time_only" | "time_plus_tokens" | "baseline";
export type BillingStyle = "pure_active" | "effort_adjusted";
export type ThemePreference = "auto" | "light" | "dark";

export type AgencySettings = {
  defaultHourlyRate?: number;
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessCurrency: string;
  aiCostMode: AiCostMode;
  aiSubscriptionMonthlyUsd: number;
  defaultBillMode: BillMode;
  billActiveMultiplier: number;
  /** UI theme. "auto" follows OS preference, otherwise forced light or dark. */
  theme: ThemePreference;
  /** Top-level switch. pure_active gives clients the literal Claude active hours; effort_adjusted layers in multipliers + quality. */
  billingStyle: BillingStyle;
  /** When effort_adjusted, multiply billable by run.qualityConfidence at billing time. */
  useQualityConfidence: boolean;
  /** When effort_adjusted, also weight by difficulty_score (1 + score × 0.5, capped at 1.5x). Off by default. */
  useDifficultyWeight: boolean;
  /** When effort_adjusted, also apply per-category weights from CATEGORY_WEIGHTS. Off by default. */
  useCategoryWeight: boolean;
  /** Set when the user completes the billing-style onboarding so the wizard does not reappear. */
  billingOnboardedAt?: string;
};

export const CATEGORY_WEIGHTS: Record<ChangeCategory, number> = {
  bugfix: 1.0,
  feature: 1.0,
  performance: 1.1,
  infra: 1.05,
  refactor: 0.95,
  test: 0.95,
  research: 0.9,
  docs: 0.85,
};

export type LeverageSnapshot = {
  windowDays: number;
  effectiveHours: number;
  runtimeHours: number;
  activeHours: number;
  multiplier: number;
  billableUsd: number;
  costUsd: number;
  marginUsd: number;
  marginPct: number;
  runs: number;
};
