import { NextRequest } from "next/server";
import { bindApi, type BoundApi } from "@/lib/agency/server-api";
import { enrichRunFromSession } from "@/lib/agency/session-importer";
import {
  extractBearerToken,
  resolveUserIdFromKey,
} from "@/lib/agency/mcp-keys";
import type { RunEventKind } from "@/lib/agency/types";

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
const SERVER_VERSION = "0.2.0";
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

const TOOLS = [
  {
    name: "list_clients",
    description:
      "List every client the agency works with. Call at the start of a session when you need to identify which client the user's task belongs to.",
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
      "List the agency's skill catalog (each has a baseline_hours and rate modifier used to price the run). Call before run_start to pick the closest skill to the task.",
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
            "Absolute working directory of this Claude Code session - required to look up the JSONL for live token-cost enrichment at run_end.",
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
      "End the run when work is complete. The server reads your session JSONL from run_start to now, sums token usage, and computes billable = runtime_hours × rate + token_cost. Use status=shipped on success (with deliverableUrl), failed on unrecoverable error, cancelled if the user aborted.",
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
