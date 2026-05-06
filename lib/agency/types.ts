export type Client = {
  id: string;
  name: string;
  initials: string;
  accentColor: string;
  hourlyRate: number;
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

export type InvoiceLineItem = {
  runId: string;
  skillName: string;
  description: string;
  hours: number;
  rateUsd: number;
  amountUsd: number;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

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
