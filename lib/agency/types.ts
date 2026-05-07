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

export type Run = {
  id: string;
  clientId: string;
  projectId: string;
  skillId: string;
  agentName: string;
  status: RunStatus;
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
  pricingMode?: "baseline" | "time_plus_tokens";
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

export type AgencySettings = {
  defaultHourlyRate?: number;
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessCurrency: string;
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
