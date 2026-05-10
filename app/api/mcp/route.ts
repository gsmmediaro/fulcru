import { NextRequest } from "next/server";
import { bindApi, type BoundApi } from "@/lib/agency/server-api";
import {
  defaultProjectsRoot,
  encodeCwdForClaude,
  enrichRunFromSession,
  findSessionJsonl,
  importSessionAsRun,
  parseSession,
  type SessionStats,
} from "@/lib/agency/session-importer";
import {
  findCodexSessionJsonl,
  listCodexSessions,
  parseCodexSession,
} from "@/lib/agency/codex-session-importer";
import { readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  renderInvoiceHtml,
  renderInvoiceMarkdown,
} from "@/lib/agency/invoice-render";
import {
  extractBearerToken,
  resolveUserIdFromKey,
} from "@/lib/agency/mcp-keys";
import type {
  ExpenseCategory,
  InvoiceLineItem,
  InvoiceRecurrence,
  RunEventKind,
  SkillCategory,
} from "@/lib/agency/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

const SERVER_NAME = "fulcru";
const SERVER_VERSION = "0.3.0";
const PROTOCOL_VERSION = "2025-06-18";

const EVENT_KINDS: RunEventKind[] = [
  "tool_call",
  "thought",
  "decision",
  "file_edit",
  "approval_requested",
  "approval_resolved",
  "error",
  "milestone",
];

const SKILL_CATEGORIES: SkillCategory[] = [
  "engineering",
  "design",
  "content",
  "ops",
  "research",
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ai_tools",
  "software",
  "hosting",
  "domain",
  "hardware",
  "travel",
  "food",
  "marketing",
  "education",
  "other",
];

const INVOICE_RECURRENCES: InvoiceRecurrence[] = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

// ────────────────────────────────────────────────────────────────────────────
// PREFERRED ENTRY POINTS
//
// To bill historical LLM/agent sessions:
//   submit_session_data  -> works in any deployment (cloud or self-hosted).
//                           You parse the source transcript locally and submit
//                           the timing/tokens/cost inline. Auto-creates project
//                           (from cwd basename) and skill if missing.
//   import_session       -> Claude Code JSONL convenience importer, only when
//                           the MCP server has filesystem access to the user's
//                           ~/.claude/projects/ folder.
//
// To track work as it happens:
//   run_start -> run_event* -> run_end.
//
// To log a manual block of time the user already spent:
//   add_time_entry.
//
// Don't ask the user "which skill?" up front - prefer auto-pick (first skill,
// or auto-create a generic 'AI development' skill). Only ask the user the ONE
// thing that genuinely needs deciding (which client, or import-history vs
// track-forward when both are plausible).
// ────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_clients",
    description:
      "List every client the agency works with. Optional: submit_session_data and add_time_entry auto-pick the only client when there is exactly one. Only call when more than one client is plausible and you need to disambiguate.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_projects",
    description:
      "List projects, optionally filtered by clientId. Call after list_clients to find the specific project the work targets.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "Filter to one client." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_skills",
    description:
      "List the agency's skill catalog (each has a baseline_hours and rate modifier used to price the run). Optional: submit_session_data, add_time_entry and start_manual_timer auto-pick the user's first skill (or auto-create 'AI development' if none exist). Only call if you need a specific skill or to verify what exists.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "run_start",
    description:
      "Start a billable run. Call this BEFORE doing any client work. Returns the created run; remember run.id for subsequent events.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string" },
        agentName: { type: "string" },
        prompt: {
          type: "string",
          description: "The user's original request, for audit.",
        },
        cwd: {
          type: "string",
          description:
            "Absolute working directory of this agent session. For Claude Code, this lets run_end find the local JSONL for token-cost enrichment.",
        },
        pricingMode: {
          type: "string",
          enum: ["baseline", "time_plus_tokens"],
          description:
            "time_plus_tokens (default): billable = runtime_hours × rate + token_cost. baseline: billable = skill.baseline_hours × rate.",
        },
      },
      required: ["clientId", "projectId", "skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "run_event",
    description:
      "Log a meaningful checkpoint during a run (file edit, decision, milestone, error). Don't log every tool call - only the ones a client would care to see on their timeline. Pass token deltas if known.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        kind: { type: "string", enum: EVENT_KINDS },
        label: {
          type: "string",
          description: "Short summary, under 60 chars.",
        },
        detail: { type: "string" },
        durationMs: { type: "number" },
        tokensIn: { type: "number" },
        tokensOut: { type: "number" },
        activeMs: { type: "number" },
      },
      required: ["runId", "kind", "label"],
      additionalProperties: false,
    },
  },
  {
    name: "request_approval",
    description:
      "Block on a human approval before a destructive or production-impacting action (db migration, deploy to prod, key rotation, deleting data). The run moves to awaiting_approval; do not proceed until resolved.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        question: { type: "string" },
        context: { type: "string" },
      },
      required: ["runId", "question"],
      additionalProperties: false,
    },
  },
  {
    name: "run_end",
    description:
      "End the run when work is complete. When a supported local transcript is available, the server enriches token usage and computes billable = runtime_hours × rate + token_cost. Use status=shipped on success (with deliverableUrl), failed on unrecoverable error, cancelled if the user aborted.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        status: {
          type: "string",
          enum: ["shipped", "failed", "cancelled"],
        },
        deliverableUrl: { type: "string" },
        notes: { type: "string" },
        cwd: {
          type: "string",
          description:
            "Absolute cwd of this session, only required if not provided at run_start.",
        },
      },
      required: ["runId", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "get_run",
    description:
      "Fetch a run and its event timeline. Useful for polling while waiting on an approval.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
      },
      required: ["runId"],
      additionalProperties: false,
    },
  },

  // ─── Auto-create primitives ────────────────────────────────
  // These let Claude resolve missing entities by asking the user for a
  // name and then creating the entity, instead of failing.
  {
    name: "create_client",
    description:
      "Create a new client. Call this when list_clients does not return the client the user mentioned. ALWAYS confirm the name and hourlyRate with the user first - don't invent values. Returns the new client; reuse its id immediately.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        hourlyRate: {
          type: "number",
          description: "Positive USD per hour. Confirm with the user.",
        },
        initials: { type: "string", description: "Up to 3 chars; auto-derived from name if omitted." },
        accentColor: { type: "string", description: "Hex like #FF7A1A." },
        email: { type: "string" },
        address: { type: "string" },
        ccRecipients: { type: "array", items: { type: "string" }, maxItems: 3 },
        note: { type: "string" },
      },
      required: ["name", "hourlyRate"],
      additionalProperties: false,
    },
  },
  {
    name: "create_project",
    description:
      "Create a new project under an existing client. Call this when list_projects does not contain the project the user named. Ask the user for the project name before creating. Returns the new project; reuse its id immediately.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        color: { type: "string", description: "Hex; defaults to client accent." },
      },
      required: ["clientId", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_project",
    description:
      "Delete a project permanently. Run delete_run first for any runs you intend to remove. Also removes cwd mappings for that project and detaches project-linked expenses.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_skill",
    description:
      "Create a new skill in the catalog. Skills carry baseline_hours and rate_modifier used to price runs. Pick the closest existing skill via list_skills first; only create when none fits AND you genuinely need a separate billing category. For most agentic LLM work prefer the auto-created generic 'AI development' skill over inventing opinionated names like 'Frontend Engineering' or 'Backend Engineering' - those clutter the catalog and don't help pricing.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        category: { type: "string", enum: SKILL_CATEGORIES },
        baselineHours: { type: "number", description: "Positive; typical hours for this kind of task." },
        rateModifier: { type: "number", description: "Positive multiplier on the client's hourly rate (e.g. 1.0 default, 1.5 premium)." },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" }, maxItems: 6 },
      },
      required: ["name", "category", "baselineHours", "rateModifier"],
      additionalProperties: false,
    },
  },

  // ─── Manual time entries ───────────────────────────────────
  {
    name: "add_time_entry",
    description:
      "Append a completed manual time entry (the user worked from start to end on a given date). Use this when the user says e.g. 'log 2 hours yesterday on project X' - resolve client/project/skill via list_* first, create_* if missing, then call this. If skillId is omitted, the user's first skill is used (auto-created as 'General work' if none exist). Status is 'shipped' immediately. billable defaults to true if a rate is known.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        startTime: { type: "string", description: "HH:MM (24h)" },
        endTime: { type: "string", description: "HH:MM (24h). Overnight is supported." },
        description: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string", description: "Optional; defaults to user's first skill." },
        billable: { type: "boolean" },
      },
      required: ["date", "startTime", "endTime"],
      additionalProperties: false,
    },
  },
  {
    name: "start_manual_timer",
    description:
      "Start a live manual timer (kind=manual). Use when the user says 'start timer for X'. If skillId is omitted, falls back to the user's first skill. Returns the run; remember run.id so you can stop it later.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string", description: "Optional; defaults to user's first skill." },
        description: { type: "string" },
        billable: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "stop_run",
    description:
      "Stop a running run (manual timer or break). Computes runtime and recomputes billable from rate. For agentic MCP runs, prefer run_end.",
    inputSchema: {
      type: "object",
      properties: { runId: { type: "string" } },
      required: ["runId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_run",
    description:
      "Edit an existing run: change description, start/end times, client/project, or billable flag. Recomputes runtime and billable USD.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        description: { type: "string" },
        startedAt: { type: "string", description: "ISO timestamp" },
        endedAt: { type: "string", description: "ISO timestamp" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        billable: { type: "boolean" },
      },
      required: ["runId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_run",
    description:
      "Delete a run permanently. Works for any kind (mcp, manual, break). Confirm with the user first - this is irreversible.",
    inputSchema: {
      type: "object",
      properties: { runId: { type: "string" } },
      required: ["runId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_runs",
    description:
      "List runs filtered by client, project, status, or sinceDate. Use to gather hours for an invoice or to show the user what they did this week.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        projectId: { type: "string" },
        status: { type: "string", enum: ["running", "awaiting_approval", "shipped", "failed", "cancelled"] },
        sinceDate: { type: "string", description: "ISO timestamp; only runs started at/after this." },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },

  // ─── Invoices ──────────────────────────────────────────────
  {
    name: "list_invoices",
    description: "List invoices, optionally filtered by clientId.",
    inputSchema: {
      type: "object",
      properties: { clientId: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "get_invoice",
    description: "Fetch one invoice by id (full line items and totals).",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_invoice",
    description:
      "Auto-build a draft invoice for a client from all uninvoiced shipped runs in the last `windowDays` (default 30). Each run becomes a line item using the run's stored billable_usd amount. Apply taxPct if any. Errors if no eligible runs.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        windowDays: { type: "number", description: "Default 30." },
        taxPct: { type: "number", description: "0-100; default 0." },
      },
      required: ["clientId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_invoice",
    description:
      "Edit a draft invoice: header (subject/notes/dates), bill-from / bill-to, discount, taxPct, recurring schedule, or replace line items. Recomputes totals when lineItems/discount/taxPct change.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: { type: "string" },
        subject: { type: "string" },
        notes: { type: "string" },
        issuedAt: { type: "string" },
        dueAt: { type: "string" },
        billFromName: { type: "string" },
        billFromAddress: { type: "string" },
        billFromEmail: { type: "string" },
        billToName: { type: "string" },
        billToAddress: { type: "string" },
        billToEmail: { type: "string" },
        billToCcEmails: { type: "array", items: { type: "string" }, maxItems: 3 },
        discountAmount: { type: "number" },
        taxPct: { type: "number" },
        recurringEnabled: { type: "boolean" },
        recurringRecurrence: { type: "string", enum: INVOICE_RECURRENCES },
        recurringNextIssue: { type: "string", description: "YYYY-MM-DD" },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["service", "product"] },
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              amount: { type: "number" },
              runId: { type: "string" },
              skillName: { type: "string" },
            },
            required: ["type", "description", "quantity", "unitPrice", "amount"],
            additionalProperties: false,
          },
        },
      },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "issue_invoice",
    description: "Move a draft invoice to status=sent and stamp issued_at.",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "pay_invoice",
    description: "Mark an invoice as paid (sets status=paid, paid_at=now).",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "void_invoice",
    description: "Mark an invoice as void.",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_invoice",
    description: "Delete an invoice permanently. Confirm with the user first.",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "duplicate_invoice",
    description: "Clone an invoice to a new draft with a fresh number.",
    inputSchema: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "export_invoice",
    description:
      "Render an invoice to a file (markdown or html). Returns the rendered content in the response. If `outputPath` is given, the server also writes the file to that absolute path on the host running this server (creates parent dirs). Use format=html for a printable, styled invoice; format=markdown for a portable plain-text version. The default extension is added if outputPath has no extension.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: { type: "string" },
        format: {
          type: "string",
          enum: ["markdown", "html"],
          description: "Default markdown.",
        },
        outputPath: {
          type: "string",
          description:
            "Absolute path where the server should write the file. Optional; if omitted, the rendered content is returned only.",
        },
      },
      required: ["invoiceId"],
      additionalProperties: false,
    },
  },

  // ─── Expenses ──────────────────────────────────────────────
  {
    name: "list_expenses",
    description: "List expenses with optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        clientId: { type: "string" },
        fromDate: { type: "string", description: "YYYY-MM-DD" },
        toDate: { type: "string", description: "YYYY-MM-DD" },
        billable: { type: "boolean" },
        invoiceId: { type: "string", description: "Pass null to find unattached." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_expense",
    description:
      "Log an expense (e.g. AI tool subscription, hosting bill). If projectId is given and clientId is not, clientId is auto-derived from the project.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        category: { type: "string", enum: EXPENSE_CATEGORIES },
        amount: { type: "number" },
        currency: { type: "string", description: "Default USD." },
        projectId: { type: "string" },
        clientId: { type: "string" },
        note: { type: "string" },
        billable: { type: "boolean", description: "Default true." },
        receiptUrl: { type: "string" },
      },
      required: ["date", "category", "amount"],
      additionalProperties: false,
    },
  },
  {
    name: "update_expense",
    description: "Edit an existing expense.",
    inputSchema: {
      type: "object",
      properties: {
        expenseId: { type: "string" },
        date: { type: "string" },
        category: { type: "string", enum: EXPENSE_CATEGORIES },
        amount: { type: "number" },
        currency: { type: "string" },
        projectId: { type: "string" },
        clientId: { type: "string" },
        note: { type: "string" },
        billable: { type: "boolean" },
        receiptUrl: { type: "string" },
        invoiceId: { type: "string" },
      },
      required: ["expenseId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_expense",
    description: "Delete an expense.",
    inputSchema: {
      type: "object",
      properties: { expenseId: { type: "string" } },
      required: ["expenseId"],
      additionalProperties: false,
    },
  },
  {
    name: "attach_expenses_to_invoice",
    description:
      "Bulk-attach a list of expenses to an invoice. Use after create_invoice to add billable expenses to the invoice.",
    inputSchema: {
      type: "object",
      properties: {
        expenseIds: { type: "array", items: { type: "string" }, minItems: 1 },
        invoiceId: { type: "string" },
      },
      required: ["expenseIds", "invoiceId"],
      additionalProperties: false,
    },
  },

  // ─── Settings + leverage ───────────────────────────────────
  {
    name: "get_settings",
    description: "Fetch agency settings (default rate, business name/address/email, currency).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "update_settings",
    description:
      "Patch agency settings. Use to set the default hourly rate or fill in bill-from details.",
    inputSchema: {
      type: "object",
      properties: {
        defaultHourlyRate: { type: "number" },
        businessName: { type: "string" },
        businessAddress: { type: "string" },
        businessEmail: { type: "string" },
        businessCurrency: { type: "string", description: "ISO 4217 (USD, EUR, RON)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "leverage",
    description:
      "Compute a leverage snapshot for the last `windowDays` days: effective vs runtime hours, multiplier, billable, cost, margin.",
    inputSchema: {
      type: "object",
      properties: { windowDays: { type: "number" } },
      additionalProperties: false,
    },
  },

  // ─── Claude Code session import ────────────────────────────
  {
    name: "list_sessions",
    description:
      "List all Claude Code session JSONL files for a given cwd (working directory). Reads ~/.claude/projects/{encoded-cwd}/. Returns one entry per session with sessionId, filePath, size, modifiedAt - no parsing yet. Use this to discover what work has happened in a project before billing it.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description: "Absolute path of the project (e.g. C:\\Users\\me\\Desktop\\my-project).",
        },
      },
      required: ["cwd"],
      additionalProperties: false,
    },
  },
  {
    name: "preview_session",
    description:
      "Parse a Claude Code session JSONL and return its stats (tokens, models, runtime, active time, tool calls, file edits, computed token cost) WITHOUT creating a run. Use this to show the user what a session would bill at before importing.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "UUID of the session." },
        cwd: { type: "string", description: "Project cwd (resolves the JSONL together with sessionId)." },
        filePath: { type: "string", description: "Direct .jsonl path. Overrides sessionId+cwd." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "import_session",
    description:
      "Parse a Claude Code session JSONL and create a billable run from it under the given client/project/skill. Re-importing the same sessionId replaces the prior run. Default pricingMode is `time_plus_tokens` (active hours × rate + token cost). Only works when this MCP server has filesystem access to the user's ~/.claude/projects/ folder (i.e. self-hosted on the same machine). For cloud-deployed Fulcru, use submit_session_data instead - read the JSONL with your local file tool, parse it yourself, and submit the numbers.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        cwd: { type: "string" },
        filePath: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string" },
        agentName: { type: "string" },
        prompt: { type: "string" },
        hourlyRate: { type: "number", description: "Override; default is client.hourlyRate × skill.rateModifier." },
        pricingMode: { type: "string", enum: ["time_plus_tokens", "baseline"] },
      },
      required: ["clientId", "projectId", "skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "import_all_sessions",
    description:
      "Bulk-import ALL Claude Code sessions for a given cwd as billable runs under the same client/project/skill. Skips sessions that have no timestamped events. Returns a summary per session. Only works when this MCP server has filesystem access to ~/.claude/projects/. For cloud-deployed Fulcru, loop submit_session_data instead.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string" },
        agentName: { type: "string" },
        hourlyRate: { type: "number" },
        pricingMode: { type: "string", enum: ["time_plus_tokens", "baseline"] },
      },
      required: ["cwd", "clientId", "projectId", "skillId"],
      additionalProperties: false,
    },
  },

  // ─── Codex / ChatGPT session import ───────────────────────
  {
    name: "list_codex_sessions",
    description:
      "List local Codex Desktop/ChatGPT agent session JSONL files. Reads ~/.codex/sessions recursively and can filter by cwd. Returns sessionId, cwd, title, filePath, size, and modifiedAt - no importing yet.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: {
          type: "string",
          description:
            "Optional absolute project path to filter sessions by cwd.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "preview_codex_session",
    description:
      "Parse a local Codex Desktop/ChatGPT agent session JSONL and return stats (tokens, model, runtime, active time, tool calls, file edits, computed token cost) WITHOUT creating a run.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Codex session UUID." },
        cwd: {
          type: "string",
          description: "Optional project cwd to scope session lookup.",
        },
        filePath: {
          type: "string",
          description: "Direct .jsonl path. Overrides sessionId+cwd.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "import_codex_session",
    description:
      "Parse a local Codex Desktop/ChatGPT agent session JSONL and create a billable run under the given client/project/skill. Re-importing the same sessionId replaces the prior run. Default pricingMode is `time_plus_tokens`.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        cwd: { type: "string" },
        filePath: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string" },
        agentName: { type: "string" },
        prompt: { type: "string" },
        hourlyRate: {
          type: "number",
          description: "Override; default is client.hourlyRate x skill.rateModifier.",
        },
        pricingMode: { type: "string", enum: ["time_plus_tokens", "baseline"] },
      },
      required: ["clientId", "projectId", "skillId"],
      additionalProperties: false,
    },
  },
  {
    name: "import_all_codex_sessions",
    description:
      "Bulk-import all local Codex Desktop/ChatGPT agent sessions for a cwd as billable runs under the same client/project/skill. Skips sessions with no timestamped events. Returns a summary per session.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        skillId: { type: "string" },
        agentName: { type: "string" },
        hourlyRate: { type: "number" },
        pricingMode: { type: "string", enum: ["time_plus_tokens", "baseline"] },
      },
      required: ["cwd", "clientId", "projectId", "skillId"],
      additionalProperties: false,
    },
  },

  // ─── Cloud-friendly session submission + Inbox triage ──────
  {
    name: "set_cwd_mapping",
    description:
      "Pin a working directory to a (client, project). After this, every future submit_session_data call with the same cwd lands directly on that project, no Inbox triage needed. Use this when the user says 'always log work in this folder to project X'.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
      },
      required: ["cwd", "clientId", "projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_unsorted_runs",
    description:
      "List runs that landed in the Inbox (created by the Stop hook for cwds with no mapping yet). Use to show the user what needs triage and how much billable potential is sitting unsorted.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "bulk_assign_runs",
    description:
      "Reassign N runs to a different client + project in one shot. Recomputes rate and billable from the new client's hourlyRate. Use when the user splits work into a new project, renames a client, or wants to bulk-clear the Inbox. Pass alsoMapCwd=true to also pin every distinct cwd among the selected runs to the destination project.",
    inputSchema: {
      type: "object",
      properties: {
        runIds: { type: "array", items: { type: "string" }, minItems: 1 },
        clientId: { type: "string" },
        projectId: { type: "string" },
        alsoMapCwd: { type: "boolean" },
      },
      required: ["runIds", "clientId", "projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "assign_unsorted_run",
    description:
      "Assign one Inbox run to a client + project. With alsoMapCwd=true, also pin the run's cwd so future sessions from there route automatically AND retro-assigns every other unsorted run from the same cwd. This is how you 'claim' a folder once and stop seeing its sessions in the Inbox.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        alsoMapCwd: {
          type: "boolean",
          description:
            "Also create a permanent cwd_mapping so future runs from this cwd skip the Inbox.",
        },
      },
      required: ["runId", "clientId", "projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_session_data",
    description:
      "Submit a parsed LLM/agent session as a billable run. Use this for Codex, Claude Code, opencode, Cursor, or any other tool when you can provide timing, token, and optional cost totals. Auto-resolves missing pieces: cwd mappings win; if clientId is given, projectId is reused or auto-created from projectName/cwd basename; skillId falls back to the user's first skill (auto-creates 'AI development' if none exist). Re-submitting the same sessionId replaces any prior run for that session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "UUID of the source JSONL (used to dedupe re-imports).",
        },
        cwd: {
          type: "string",
          description:
            "Absolute working directory of the session. Used to auto-derive a project name from its basename when projectId is missing.",
        },
        title: {
          type: "string",
          description:
            "Human-readable summary - first user prompt or the task the user asked Claude to do. Becomes the invoice line item description.",
        },
        startedAt: {
          type: "string",
          description: "ISO timestamp of the first event in the session.",
        },
        endedAt: {
          type: "string",
          description: "ISO timestamp of the last event in the session.",
        },
        wallSec: {
          type: "number",
          description: "endedAt - startedAt in seconds (clock time).",
        },
        activeSec: {
          type: "number",
          description:
            "Sum of gaps under 5 minutes between consecutive timestamped events - this is the 'real focused time'. If you cannot compute, reuse wallSec.",
        },
        tokensIn: { type: "number", description: "Total input + cache-write tokens. Defaults to 0." },
        tokensOut: { type: "number", description: "Total output tokens. Defaults to 0." },
        cacheReadTokens: { type: "number", description: "Total cache-read tokens. Optional." },
        tokenCostUsd: {
          type: "number",
          description:
            "Computed compute cost (USD) for the session. Optional - leave 0 if the user is on a flat subscription.",
        },
        model: {
          type: "string",
          description: "Primary model id (for example claude-opus-4-7, gpt-5.5, or another provider id). Optional.",
        },
        toolUses: { type: "number", description: "Total tool calls. Optional." },
        fileEdits: { type: "number", description: "Tool calls that modified files. Optional." },
        clientId: {
          type: "string",
          description:
            "Optional - if omitted and the user has exactly one client, that one is used.",
        },
        projectName: {
          type: "string",
          description:
            "Optional - human-friendly project name. If projectId is omitted and a project with this name exists, it is reused; otherwise it is auto-created. Falls back to basename(cwd).",
        },
        projectId: {
          type: "string",
          description: "Optional - direct project id; takes precedence over projectName.",
        },
        skillId: {
          type: "string",
          description:
            "Optional - if omitted, the user's first skill is used (auto-creates 'AI development' if none exist).",
        },
        agentName: { type: "string", description: "Defaults to model id." },
        hourlyRate: {
          type: "number",
          description:
            "Override the per-run rate. Defaults to client.hourlyRate × skill.rateModifier.",
        },
        pricingMode: {
          type: "string",
          enum: ["time_plus_tokens", "baseline"],
          description:
            "Default time_plus_tokens (active_hours × rate + token_cost). Use baseline for fixed-price work.",
        },
      },
      required: ["sessionId", "startedAt", "endedAt", "wallSec", "activeSec"],
      additionalProperties: false,
    },
  },
];

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}

function rpcError(
  id: string | number | null | undefined,
  error: JsonRpcError,
) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.every((x) => typeof x === "string")
    ? (v as string[])
    : undefined;
}

function asLineItems(v: unknown): InvoiceLineItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: InvoiceLineItem[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return undefined;
    const li = raw as Record<string, unknown>;
    const type = li.type;
    if (type !== "service" && type !== "product") return undefined;
    if (
      typeof li.description !== "string" ||
      typeof li.quantity !== "number" ||
      typeof li.unitPrice !== "number" ||
      typeof li.amount !== "number"
    ) {
      return undefined;
    }
    out.push({
      type,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
      runId: asString(li.runId),
      skillName: asString(li.skillName),
    });
  }
  return out;
}

async function callTool(
  userId: string,
  api: BoundApi,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "list_clients":
      return api.listClients();

    case "list_projects":
      return api.listProjects(asString(args.clientId));

    case "list_skills":
      return api.listSkills();

    case "run_start": {
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      const skillId = asString(args.skillId);
      if (!clientId || !projectId || !skillId) {
        throw new Error("clientId, projectId, skillId are required");
      }
      const pricingMode = asString(args.pricingMode);
      return api.startRun({
        clientId,
        projectId,
        skillId,
        agentName: asString(args.agentName),
        prompt: asString(args.prompt),
        cwd: asString(args.cwd),
        pricingMode:
          pricingMode === "baseline" || pricingMode === "time_plus_tokens"
            ? pricingMode
            : undefined,
      });
    }

    case "run_event": {
      const runId = asString(args.runId);
      const kind = asString(args.kind);
      const label = asString(args.label);
      if (!runId || !kind || !label) {
        throw new Error("runId, kind, label are required");
      }
      if (!EVENT_KINDS.includes(kind as RunEventKind)) {
        throw new Error(`Invalid kind: ${kind}`);
      }
      return api.recordEvent({
        runId,
        kind: kind as RunEventKind,
        label,
        detail: asString(args.detail),
        durationMs: asNumber(args.durationMs),
        tokensIn: asNumber(args.tokensIn),
        tokensOut: asNumber(args.tokensOut),
        activeMs: asNumber(args.activeMs),
      });
    }

    case "request_approval": {
      const runId = asString(args.runId);
      const question = asString(args.question);
      if (!runId || !question) {
        throw new Error("runId and question are required");
      }
      return api.requestApproval({
        runId,
        question,
        context: asString(args.context),
      });
    }

    case "run_end": {
      const runId = asString(args.runId);
      const status = asString(args.status);
      if (!runId || !status) throw new Error("runId and status are required");
      if (!["shipped", "failed", "cancelled"].includes(status)) {
        throw new Error("status must be shipped|failed|cancelled");
      }
      const ended = await api.endRun({
        runId,
        status: status as "shipped" | "failed" | "cancelled",
        deliverableUrl: asString(args.deliverableUrl),
        notes: asString(args.notes),
      });
      const enrichment = await enrichRunFromSession(userId, {
        runId,
        cwd: asString(args.cwd),
      });
      const finalRun = await api.getRun(runId);
      return { run: finalRun ?? ended, enrichment };
    }

    case "get_run": {
      const runId = asString(args.runId);
      if (!runId) throw new Error("runId is required");
      const run = await api.getRun(runId);
      if (!run) throw new Error(`Run not found: ${runId}`);
      const events = await api.listRunEvents(runId);
      return { run, events };
    }

    case "create_client": {
      const clientName = asString(args.name);
      const hourlyRate = asNumber(args.hourlyRate);
      if (!clientName) throw new Error("name is required");
      if (hourlyRate === undefined) throw new Error("hourlyRate is required");
      return api.createClient({
        name: clientName,
        hourlyRate,
        initials: asString(args.initials),
        accentColor: asString(args.accentColor),
        email: asString(args.email),
        address: asString(args.address),
        ccRecipients: asStringArray(args.ccRecipients),
        note: asString(args.note),
      });
    }

    case "create_project": {
      const clientId = asString(args.clientId);
      const projectName = asString(args.name);
      if (!clientId || !projectName) {
        throw new Error("clientId and name are required");
      }
      return api.createProject({
        clientId,
        name: projectName,
        description: asString(args.description),
        color: asString(args.color),
      });
    }

    case "delete_project": {
      const projectId = asString(args.projectId);
      if (!projectId) {
        throw new Error("projectId is required");
      }
      await api.deleteProject(projectId);
      return { ok: true };
    }

    case "create_skill": {
      const skillName = asString(args.name);
      const category = asString(args.category);
      const baselineHours = asNumber(args.baselineHours);
      const rateModifier = asNumber(args.rateModifier);
      if (!skillName || !category || baselineHours === undefined || rateModifier === undefined) {
        throw new Error("name, category, baselineHours, rateModifier are required");
      }
      if (!SKILL_CATEGORIES.includes(category as SkillCategory)) {
        throw new Error(`Invalid category: ${category}`);
      }
      return api.createSkill({
        name: skillName,
        category: category as SkillCategory,
        baselineHours,
        rateModifier,
        description: asString(args.description),
        tags: asStringArray(args.tags),
      });
    }

    case "add_time_entry": {
      const date = asString(args.date);
      const startTime = asString(args.startTime);
      const endTime = asString(args.endTime);
      if (!date || !startTime || !endTime) {
        throw new Error("date, startTime, endTime are required");
      }
      return api.appendManualEntry({
        date,
        startTime,
        endTime,
        skillId: asString(args.skillId),
        description: asString(args.description),
        clientId: asString(args.clientId),
        projectId: asString(args.projectId),
        billable: asBool(args.billable),
      });
    }

    case "start_manual_timer": {
      return api.startManualRun({
        skillId: asString(args.skillId),
        clientId: asString(args.clientId),
        projectId: asString(args.projectId),
        description: asString(args.description),
        billable: asBool(args.billable),
      });
    }

    case "stop_run": {
      const runId = asString(args.runId);
      if (!runId) throw new Error("runId is required");
      return api.stopRun(runId);
    }

    case "update_run": {
      const runId = asString(args.runId);
      if (!runId) throw new Error("runId is required");
      return api.updateRun(runId, {
        description: asString(args.description),
        startedAt: asString(args.startedAt),
        endedAt: asString(args.endedAt),
        clientId: asString(args.clientId),
        projectId: asString(args.projectId),
        billable: asBool(args.billable),
      });
    }

    case "delete_run": {
      const runId = asString(args.runId);
      if (!runId) throw new Error("runId is required");
      await api.deleteRun(runId);
      return { ok: true };
    }

    case "list_runs": {
      const status = asString(args.status);
      return api.listRuns({
        clientId: asString(args.clientId),
        projectId: asString(args.projectId),
        status:
          status === "running" ||
          status === "awaiting_approval" ||
          status === "shipped" ||
          status === "failed" ||
          status === "cancelled"
            ? status
            : undefined,
        sinceDate: asString(args.sinceDate),
        limit: asNumber(args.limit),
      });
    }

    case "list_invoices":
      return api.listInvoices(asString(args.clientId));

    case "get_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      const invoice = await api.getInvoice(invoiceId);
      if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);
      return invoice;
    }

    case "create_invoice": {
      const clientId = asString(args.clientId);
      if (!clientId) throw new Error("clientId is required");
      return api.createInvoice({
        clientId,
        windowDays: asNumber(args.windowDays),
        taxPct: asNumber(args.taxPct),
      });
    }

    case "update_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      const recurrence = asString(args.recurringRecurrence);
      const ccEmails = asStringArray(args.billToCcEmails);
      const lineItems = asLineItems(args.lineItems);
      return api.updateInvoice(invoiceId, {
        subject: asString(args.subject),
        notes: asString(args.notes),
        issuedAt: asString(args.issuedAt),
        dueAt: asString(args.dueAt),
        billFromName: asString(args.billFromName),
        billFromAddress: asString(args.billFromAddress),
        billFromEmail: asString(args.billFromEmail),
        billToName: asString(args.billToName),
        billToAddress: asString(args.billToAddress),
        billToEmail: asString(args.billToEmail),
        billToCcEmails: ccEmails,
        discountAmount: asNumber(args.discountAmount),
        taxPct: asNumber(args.taxPct),
        recurringEnabled: asBool(args.recurringEnabled),
        recurringRecurrence:
          recurrence && INVOICE_RECURRENCES.includes(recurrence as InvoiceRecurrence)
            ? (recurrence as InvoiceRecurrence)
            : undefined,
        recurringNextIssue: asString(args.recurringNextIssue),
        lineItems,
      });
    }

    case "issue_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      return api.issueInvoice(invoiceId);
    }

    case "pay_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      return api.payInvoice(invoiceId);
    }

    case "void_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      return api.voidInvoice(invoiceId);
    }

    case "delete_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      await api.deleteInvoice(invoiceId);
      return { ok: true };
    }

    case "duplicate_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      return api.duplicateInvoice(invoiceId);
    }

    case "export_invoice": {
      const invoiceId = asString(args.invoiceId);
      if (!invoiceId) throw new Error("invoiceId is required");
      const format = asString(args.format) ?? "markdown";
      if (format !== "markdown" && format !== "html") {
        throw new Error("format must be markdown or html");
      }
      const invoice = await api.getInvoice(invoiceId);
      if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);
      const client = await api.getClient(invoice.clientId);
      const settings = await api.getSettings();
      const currency = settings.businessCurrency || "USD";
      const content =
        format === "html"
          ? renderInvoiceHtml(invoice, client ?? null, currency)
          : renderInvoiceMarkdown(invoice, client ?? null, currency);
      const ext = format === "html" ? ".html" : ".md";

      let writtenTo: string | undefined;
      const outputPath = asString(args.outputPath);
      if (outputPath) {
        if (!path.isAbsolute(outputPath)) {
          throw new Error("outputPath must be an absolute path");
        }
        const finalPath = path.extname(outputPath)
          ? outputPath
          : outputPath + ext;
        mkdirSync(path.dirname(finalPath), { recursive: true });
        writeFileSync(finalPath, content, "utf8");
        writtenTo = finalPath;
      }

      return {
        invoiceId,
        format,
        filename: `${invoice.number}${ext}`,
        bytes: Buffer.byteLength(content, "utf8"),
        writtenTo,
        content,
      };
    }

    case "list_expenses": {
      const hasInvoiceId = "invoiceId" in args;
      const invoiceIdRaw = args.invoiceId;
      return api.listExpenses({
        projectId: asString(args.projectId),
        clientId: asString(args.clientId),
        fromDate: asString(args.fromDate),
        toDate: asString(args.toDate),
        billable: asBool(args.billable),
        invoiceId: hasInvoiceId
          ? invoiceIdRaw === null
            ? null
            : asString(invoiceIdRaw)
          : undefined,
      });
    }

    case "create_expense": {
      const date = asString(args.date);
      const category = asString(args.category);
      const amount = asNumber(args.amount);
      if (!date || !category || amount === undefined) {
        throw new Error("date, category, amount are required");
      }
      if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
        throw new Error(`Invalid category: ${category}`);
      }
      return api.createExpense({
        date,
        category: category as ExpenseCategory,
        amount,
        currency: asString(args.currency),
        projectId: asString(args.projectId),
        clientId: asString(args.clientId),
        note: asString(args.note),
        billable: asBool(args.billable),
        receiptUrl: asString(args.receiptUrl),
      });
    }

    case "update_expense": {
      const expenseId = asString(args.expenseId);
      if (!expenseId) throw new Error("expenseId is required");
      const category = asString(args.category);
      if (category && !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
        throw new Error(`Invalid category: ${category}`);
      }
      return api.updateExpense(expenseId, {
        date: asString(args.date),
        category: category as ExpenseCategory | undefined,
        amount: asNumber(args.amount),
        currency: asString(args.currency),
        projectId: asString(args.projectId),
        clientId: asString(args.clientId),
        note: asString(args.note),
        billable: asBool(args.billable),
        receiptUrl: asString(args.receiptUrl),
        invoiceId: asString(args.invoiceId),
      });
    }

    case "delete_expense": {
      const expenseId = asString(args.expenseId);
      if (!expenseId) throw new Error("expenseId is required");
      await api.deleteExpense(expenseId);
      return { ok: true };
    }

    case "attach_expenses_to_invoice": {
      const expenseIds = asStringArray(args.expenseIds);
      const invoiceId = asString(args.invoiceId);
      if (!expenseIds || expenseIds.length === 0 || !invoiceId) {
        throw new Error("expenseIds (non-empty) and invoiceId are required");
      }
      await api.attachExpensesToInvoice(expenseIds, invoiceId);
      return { ok: true, count: expenseIds.length };
    }

    case "get_settings":
      return api.getSettings();

    case "update_settings":
      return api.updateSettings({
        defaultHourlyRate: asNumber(args.defaultHourlyRate),
        businessName: asString(args.businessName),
        businessAddress: asString(args.businessAddress),
        businessEmail: asString(args.businessEmail),
        businessCurrency: asString(args.businessCurrency),
      });

    case "leverage":
      return api.leverage(asNumber(args.windowDays));

    case "list_sessions": {
      const cwd = asString(args.cwd);
      if (!cwd) throw new Error("cwd is required");
      const root = defaultProjectsRoot();
      const dir = path.join(root, encodeCwdForClaude(cwd));
      let files: string[];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
      } catch {
        return { cwd, dir, sessions: [] };
      }
      const sessions = files
        .map((f) => {
          const full = path.join(dir, f);
          const st = statSync(full);
          return {
            sessionId: path.basename(f, ".jsonl"),
            filePath: full,
            sizeBytes: st.size,
            modifiedAt: new Date(st.mtimeMs).toISOString(),
          };
        })
        .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
      return { cwd, dir, sessions };
    }

    case "preview_session": {
      const filePath =
        asString(args.filePath) ||
        findSessionJsonl({
          sessionId: asString(args.sessionId),
          cwd: asString(args.cwd),
        });
      return parseSession(filePath);
    }

    case "import_session": {
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      const skillId = asString(args.skillId);
      if (!clientId || !projectId || !skillId) {
        throw new Error("clientId, projectId, skillId are required");
      }
      const filePath =
        asString(args.filePath) ||
        findSessionJsonl({
          sessionId: asString(args.sessionId),
          cwd: asString(args.cwd),
        });
      const stats = parseSession(filePath);
      const pm = asString(args.pricingMode);
      const { run, events } = await importSessionAsRun(userId, {
        stats,
        clientId,
        projectId,
        skillId,
        agentName: asString(args.agentName),
        prompt: asString(args.prompt),
        hourlyRate: asNumber(args.hourlyRate),
        pricingMode:
          pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined,
      });
      return { run, events, stats };
    }

    case "import_all_sessions": {
      const cwd = asString(args.cwd);
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      const skillId = asString(args.skillId);
      if (!cwd || !clientId || !projectId || !skillId) {
        throw new Error("cwd, clientId, projectId, skillId are required");
      }
      const root = defaultProjectsRoot();
      const dir = path.join(root, encodeCwdForClaude(cwd));
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
      const pm = asString(args.pricingMode);
      const pricingMode =
        pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined;
      const hourlyRate = asNumber(args.hourlyRate);
      const agentName = asString(args.agentName);
      const results: Array<{
        sessionId: string;
        ok: boolean;
        runId?: string;
        billableUsd?: number;
        wallSec?: number;
        error?: string;
      }> = [];
      for (const f of files) {
        const full = path.join(dir, f);
        const sessionId = path.basename(f, ".jsonl");
        try {
          const stats = parseSession(full);
          const { run } = await importSessionAsRun(userId, {
            stats,
            clientId,
            projectId,
            skillId,
            agentName,
            hourlyRate,
            pricingMode,
          });
          results.push({
            sessionId,
            ok: true,
            runId: run.id,
            billableUsd: run.billableUsd,
            wallSec: stats.wallSec,
          });
        } catch (e) {
          results.push({
            sessionId,
            ok: false,
            error: (e as Error).message,
          });
        }
      }
      const totalBillable = results
        .filter((r) => r.ok)
        .reduce((s, r) => s + (r.billableUsd ?? 0), 0);
      const totalWallSec = results
        .filter((r) => r.ok)
        .reduce((s, r) => s + (r.wallSec ?? 0), 0);
      return {
        cwd,
        sessionsFound: files.length,
        imported: results.filter((r) => r.ok).length,
        skipped: results.filter((r) => !r.ok).length,
        totalBillableUsd: Number(totalBillable.toFixed(2)),
        totalWallHours: Number((totalWallSec / 3600).toFixed(2)),
        results,
      };
    }

    case "list_codex_sessions": {
      const cwd = asString(args.cwd);
      const sessions = listCodexSessions({ cwd });
      return { cwd, sessions, sessionsFound: sessions.length };
    }

    case "preview_codex_session": {
      const filePath =
        asString(args.filePath) ||
        findCodexSessionJsonl({
          sessionId: asString(args.sessionId),
          cwd: asString(args.cwd),
        });
      return parseCodexSession(filePath);
    }

    case "import_codex_session": {
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      const skillId = asString(args.skillId);
      if (!clientId || !projectId || !skillId) {
        throw new Error("clientId, projectId, skillId are required");
      }
      const filePath =
        asString(args.filePath) ||
        findCodexSessionJsonl({
          sessionId: asString(args.sessionId),
          cwd: asString(args.cwd),
        });
      const stats = parseCodexSession(filePath);
      const pm = asString(args.pricingMode);
      const { run, events } = await importSessionAsRun(userId, {
        stats,
        clientId,
        projectId,
        skillId,
        agentName: asString(args.agentName) ?? "codex",
        prompt: asString(args.prompt),
        hourlyRate: asNumber(args.hourlyRate),
        pricingMode:
          pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined,
      });
      return { run, events, stats };
    }

    case "import_all_codex_sessions": {
      const cwd = asString(args.cwd);
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      const skillId = asString(args.skillId);
      if (!cwd || !clientId || !projectId || !skillId) {
        throw new Error("cwd, clientId, projectId, skillId are required");
      }
      const sessions = listCodexSessions({ cwd });
      const pm = asString(args.pricingMode);
      const pricingMode =
        pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined;
      const hourlyRate = asNumber(args.hourlyRate);
      const agentName = asString(args.agentName) ?? "codex";
      const results: Array<{
        sessionId: string;
        ok: boolean;
        runId?: string;
        billableUsd?: number;
        wallSec?: number;
        error?: string;
      }> = [];
      for (const session of sessions) {
        try {
          const stats = parseCodexSession(session.filePath);
          const { run } = await importSessionAsRun(userId, {
            stats,
            clientId,
            projectId,
            skillId,
            agentName,
            hourlyRate,
            pricingMode,
          });
          results.push({
            sessionId: session.sessionId,
            ok: true,
            runId: run.id,
            billableUsd: run.billableUsd,
            wallSec: stats.wallSec,
          });
        } catch (e) {
          results.push({
            sessionId: session.sessionId,
            ok: false,
            error: (e as Error).message,
          });
        }
      }
      const totalBillable = results
        .filter((r) => r.ok)
        .reduce((s, r) => s + (r.billableUsd ?? 0), 0);
      const totalWallSec = results
        .filter((r) => r.ok)
        .reduce((s, r) => s + (r.wallSec ?? 0), 0);
      return {
        cwd,
        sessionsFound: sessions.length,
        imported: results.filter((r) => r.ok).length,
        skipped: results.filter((r) => !r.ok).length,
        totalBillableUsd: Number(totalBillable.toFixed(2)),
        totalWallHours: Number((totalWallSec / 3600).toFixed(2)),
        results,
      };
    }

    case "submit_session_data": {
      const sessionId = asString(args.sessionId);
      const startedAt = asString(args.startedAt);
      const endedAt = asString(args.endedAt);
      const wallSec = asNumber(args.wallSec);
      const activeSec = asNumber(args.activeSec);
      if (!sessionId || !startedAt || !endedAt || wallSec === undefined || activeSec === undefined) {
        throw new Error(
          "sessionId, startedAt, endedAt, wallSec and activeSec are required",
        );
      }

      const cwd = asString(args.cwd);

      // Step 1: see if this cwd is already mapped to a project. If so, the
      // mapping wins over everything and we route silently.
      let mapped: { clientId: string; projectId: string } | undefined;
      if (cwd) {
        mapped = await api.findCwdMapping(cwd);
      }

      // Step 2: resolve client / project. Three paths in priority order:
      //   (a) cwd_mapping match -> deterministic, no auto-create
      //   (b) explicit clientId given -> auto-create project from cwd basename
      //   (c) neither -> unsorted (run lands in Inbox)
      let clientId: string | undefined;
      let projectId: string | undefined;
      let unsorted = false;
      let routedBy: "cwd_mapping" | "explicit_client" | "unsorted_inbox" =
        "unsorted_inbox";

      if (mapped) {
        clientId = mapped.clientId;
        projectId = mapped.projectId;
        routedBy = "cwd_mapping";
      } else {
        const explicitClientId = asString(args.clientId);
        const explicitProjectId = asString(args.projectId);
        const explicitProjectName = asString(args.projectName);
        if (explicitClientId) {
          clientId = explicitClientId;
          if (explicitProjectId) {
            projectId = explicitProjectId;
          } else {
            const desiredName =
              explicitProjectName ||
              (cwd ? path.basename(cwd.replace(/[\\/]+$/, "")) : undefined) ||
              "Default project";
            const projects = await api.listProjects(clientId);
            const match = projects.find(
              (p) => p.name.toLowerCase() === desiredName.toLowerCase(),
            );
            if (match) {
              projectId = match.id;
            } else {
              const created = await api.createProject({
                clientId,
                name: desiredName,
              });
              projectId = created.id;
            }
          }
          routedBy = "explicit_client";
        } else {
          unsorted = true;
          routedBy = "unsorted_inbox";
        }
      }

      // Skill always resolves to something. Falls back to the user's first
      // skill or auto-creates a generic 'AI development'.
      let skillId = asString(args.skillId);
      if (!skillId) {
        const skills = await api.listSkills();
        if (skills.length > 0) {
          skillId = skills[0].id;
        } else {
          const created = await api.createSkill({
            name: "AI development",
            category: "engineering",
            baselineHours: 1,
            rateModifier: 1,
            description: "Generic agentic LLM work, billed by active hours.",
          });
          skillId = created.id;
        }
      }

      // Build a SessionStats-shaped payload from the inline data.
      const tokensIn = asNumber(args.tokensIn) ?? 0;
      const tokensOut = asNumber(args.tokensOut) ?? 0;
      const cacheRead = asNumber(args.cacheReadTokens) ?? 0;
      const tokenCostUsd = asNumber(args.tokenCostUsd) ?? 0;
      const model = asString(args.model) ?? "llm-session";
      const toolUses = asNumber(args.toolUses) ?? 0;
      const fileEdits = asNumber(args.fileEdits) ?? 0;
      const title = asString(args.title);
      const stats: SessionStats = {
        sessionId,
        filePath: `submitted:${sessionId}`,
        cwd,
        startedAt,
        endedAt,
        wallSec,
        activeSec,
        userMsgs: 0,
        assistantMsgs: 0,
        toolUses,
        fileEdits,
        modelTotals: {
          [model]: {
            inputTokens: tokensIn,
            outputTokens: tokensOut,
            cacheWriteTokens: 0,
            cacheReadTokens: cacheRead,
            messages: 0,
          },
        },
        tokensIn,
        tokensOut,
        cacheWrite: 0,
        cacheRead,
        tokenCostUsd,
        firstUserPrompt: title,
        aiTitle: title,
      };

      const pm = asString(args.pricingMode);
      const { run, events } = await importSessionAsRun(userId, {
        stats,
        clientId,
        projectId,
        skillId,
        agentName: asString(args.agentName) ?? model,
        prompt: title,
        hourlyRate: asNumber(args.hourlyRate),
        pricingMode:
          pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined,
        allowUnsorted: unsorted,
      });
      return {
        run,
        events,
        resolved: { clientId, projectId, skillId, unsorted, routedBy },
      };
    }

    case "set_cwd_mapping": {
      const cwd = asString(args.cwd);
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      if (!cwd || !clientId || !projectId) {
        throw new Error("cwd, clientId and projectId are required");
      }
      const mapping = await api.upsertCwdMapping({
        cwd,
        clientId,
        projectId,
      });
      return { mapping };
    }

    case "list_unsorted_runs": {
      const runs = await api.listUnsortedRuns();
      return { runs, count: runs.length };
    }

    case "assign_unsorted_run": {
      const runId = asString(args.runId);
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      if (!runId || !clientId || !projectId) {
        throw new Error("runId, clientId and projectId are required");
      }
      const alsoMapCwd = asBool(args.alsoMapCwd) ?? false;
      const run = await api.assignUnsortedRun(runId, {
        clientId,
        projectId,
        alsoMapCwd,
      });
      return { run };
    }

    case "bulk_assign_runs": {
      const runIds = asStringArray(args.runIds);
      const clientId = asString(args.clientId);
      const projectId = asString(args.projectId);
      if (!runIds || runIds.length === 0 || !clientId || !projectId) {
        throw new Error("runIds (non-empty), clientId, projectId are required");
      }
      const alsoMapCwd = asBool(args.alsoMapCwd) ?? false;
      return api.bulkAssignRuns(runIds, { clientId, projectId, alsoMapCwd });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleRpc(
  msg: JsonRpcRequest,
  userId: string | null,
  api: BoundApi | null,
): Promise<unknown | null> {
  const { id, method } = msg;
  const params = (msg.params ?? {}) as Record<string, unknown>;

  const isNotification = id === undefined || id === null;

  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return null;
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }

  if (method === "ping") {
    return rpcResult(id, {});
  }

  if (method === "tools/call") {
    if (!api || !userId) {
      return rpcError(id, {
        code: -32001,
        message:
          "Unauthorized: missing or invalid Bearer token. Generate a key in the Fulcru dashboard and add it as `Authorization: Bearer <key>`.",
      });
    }
    const name = asString(params.name);
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    if (!name) {
      return rpcError(id, { code: -32602, message: "Missing tool name" });
    }
    try {
      const result = await callTool(userId, api, name, args);
      return rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    } catch (e) {
      return rpcResult(id, {
        content: [{ type: "text", text: (e as Error).message }],
        isError: true,
      });
    }
  }

  if (isNotification) return null;
  return rpcError(id, {
    code: -32601,
    message: `Method not found: ${method}`,
  });
}

export async function GET() {
  return jsonResponse({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    transport: "http",
    endpoint: "/api/mcp",
    auth: "Bearer <fcr_…> (issued via /agency)",
  });
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    const text = await req.text();
    payload = text ? JSON.parse(text) : null;
  } catch {
    return jsonResponse(
      rpcError(null, { code: -32700, message: "Parse error" }),
      { status: 400 },
    );
  }

  const token = extractBearerToken(req.headers);
  const userId = token ? await resolveUserIdFromKey(token) : null;
  const api = userId ? bindApi(userId) : null;

  if (Array.isArray(payload)) {
    const responses: unknown[] = [];
    for (const m of payload) {
      const r = await handleRpc(m as JsonRpcRequest, userId, api);
      if (r !== null) responses.push(r);
    }
    if (responses.length === 0) {
      return new Response(null, { status: 202 });
    }
    return jsonResponse(responses);
  }

  if (!payload || typeof payload !== "object") {
    return jsonResponse(
      rpcError(null, { code: -32600, message: "Invalid Request" }),
      { status: 400 },
    );
  }

  const msg = payload as JsonRpcRequest;
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return jsonResponse(
      rpcError(msg.id ?? null, { code: -32600, message: "Invalid Request" }),
      { status: 400 },
    );
  }

  const response = await handleRpc(msg, userId, api);
  if (response === null) {
    return new Response(null, { status: 202 });
  }
  return jsonResponse(response);
}
