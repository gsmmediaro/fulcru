import { NextRequest } from "next/server";
import { api } from "@/lib/agency/store";
import type {
  ApprovalStatus,
  RunEventKind,
  RunStatus,
} from "@/lib/agency/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUN_STATUSES: RunStatus[] = [
  "running",
  "awaiting_approval",
  "shipped",
  "failed",
  "cancelled",
];

const END_STATUSES: Array<"shipped" | "failed" | "cancelled"> = [
  "shipped",
  "failed",
  "cancelled",
];

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

const APPROVAL_STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected"];

const RESOLVE_STATUSES: Array<"approved" | "rejected"> = [
  "approved",
  "rejected",
];

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function bad(error: string, status = 400) {
  return json({ error }, { status });
}

function notFound(error = "Not found") {
  return json({ error }, { status: 404 });
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  return route("GET", path ?? [], url, null);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch (e) {
    return bad((e as Error).message);
  }
  return route("POST", path ?? [], url, body);
}

function route(
  method: "GET" | "POST",
  path: string[],
  url: URL,
  body: Record<string, unknown> | null,
): Response {
  try {
    const [resource, id, action] = path;
    const qp = url.searchParams;

    switch (resource) {
      case "clients": {
        if (method !== "GET") return bad("Method not allowed", 405);
        if (!id) return json(api.listClients());
        const c = api.getClient(id);
        return c ? json(c) : notFound("Client not found");
      }

      case "projects": {
        if (method !== "GET") return bad("Method not allowed", 405);
        if (!id) {
          const clientId = qp.get("clientId") ?? undefined;
          return json(api.listProjects(clientId));
        }
        const p = api.getProject(id);
        return p ? json(p) : notFound("Project not found");
      }

      case "skills": {
        if (method !== "GET") return bad("Method not allowed", 405);
        if (!id) return json(api.listSkills());
        const s = api.getSkill(id);
        return s ? json(s) : notFound("Skill not found");
      }

      case "runs": {
        if (method === "GET") {
          if (!id) {
            const status = qp.get("status") ?? undefined;
            if (status && !RUN_STATUSES.includes(status as RunStatus)) {
              return bad(`Invalid status: ${status}`);
            }
            const limitRaw = qp.get("limit");
            const limit = limitRaw ? Number(limitRaw) : undefined;
            if (limitRaw && (!Number.isFinite(limit) || (limit ?? 0) < 0)) {
              return bad("Invalid limit");
            }
            return json(
              api.listRuns({
                clientId: qp.get("clientId") ?? undefined,
                projectId: qp.get("projectId") ?? undefined,
                status: status as RunStatus | undefined,
                limit,
              }),
            );
          }
          const run = api.getRun(id);
          if (!run) return notFound("Run not found");
          return json({ run, events: api.listRunEvents(id) });
        }
        // POST
        if (!body) return bad("Missing body");
        if (!id) {
          const clientId = asString(body.clientId);
          const projectId = asString(body.projectId);
          const skillId = asString(body.skillId);
          if (!clientId || !projectId || !skillId) {
            return bad("clientId, projectId, skillId required");
          }
          try {
            const run = api.startRun({
              clientId,
              projectId,
              skillId,
              agentName: asString(body.agentName),
              prompt: asString(body.prompt),
            });
            return json(run, { status: 201 });
          } catch (e) {
            return bad((e as Error).message);
          }
        }
        if (action === "events") {
          const kind = asString(body.kind);
          const label = asString(body.label);
          if (!kind || !label) return bad("kind and label required");
          if (!EVENT_KINDS.includes(kind as RunEventKind)) {
            return bad(`Invalid kind: ${kind}`);
          }
          try {
            const evt = api.recordEvent({
              runId: id,
              kind: kind as RunEventKind,
              label,
              detail: asString(body.detail),
              durationMs: asNumber(body.durationMs),
              tokensIn: asNumber(body.tokensIn),
              tokensOut: asNumber(body.tokensOut),
              activeMs: asNumber(body.activeMs),
            });
            return json(evt, { status: 201 });
          } catch (e) {
            return bad((e as Error).message, 404);
          }
        }
        if (action === "end") {
          const status = asString(body.status);
          if (!status || !END_STATUSES.includes(status as typeof END_STATUSES[number])) {
            return bad("status must be shipped|failed|cancelled");
          }
          try {
            const run = api.endRun({
              runId: id,
              status: status as "shipped" | "failed" | "cancelled",
              deliverableUrl: asString(body.deliverableUrl),
              notes: asString(body.notes),
            });
            return json(run);
          } catch (e) {
            return bad((e as Error).message, 404);
          }
        }
        return notFound("Unknown run action");
      }

      case "approvals": {
        if (method === "GET") {
          if (id) return notFound("Approval lookup by id not supported");
          const status = qp.get("status") ?? undefined;
          if (status && !APPROVAL_STATUSES.includes(status as ApprovalStatus)) {
            return bad(`Invalid status: ${status}`);
          }
          return json(api.listApprovals(status as ApprovalStatus | undefined));
        }
        // POST
        if (!body) return bad("Missing body");
        if (!id) {
          const runId = asString(body.runId);
          const question = asString(body.question);
          if (!runId || !question) return bad("runId and question required");
          try {
            const apr = api.requestApproval({
              runId,
              question,
              context: asString(body.context),
            });
            return json(apr, { status: 201 });
          } catch (e) {
            return bad((e as Error).message, 404);
          }
        }
        if (action === "resolve") {
          const status = asString(body.status);
          if (!status || !RESOLVE_STATUSES.includes(status as typeof RESOLVE_STATUSES[number])) {
            return bad("status must be approved|rejected");
          }
          try {
            const apr = api.resolveApproval({
              approvalId: id,
              status: status as "approved" | "rejected",
              resolvedBy: asString(body.resolvedBy),
            });
            return json(apr);
          } catch (e) {
            return bad((e as Error).message, 404);
          }
        }
        return notFound("Unknown approval action");
      }

      case "invoices": {
        if (method !== "GET") return bad("Method not allowed", 405);
        if (!id) {
          return json(api.listInvoices(qp.get("clientId") ?? undefined));
        }
        const inv = api.getInvoice(id);
        return inv ? json(inv) : notFound("Invoice not found");
      }

      case "leverage": {
        if (method !== "GET") return bad("Method not allowed", 405);
        const w = qp.get("windowDays");
        const windowDays = w ? Number(w) : 30;
        if (!Number.isFinite(windowDays) || windowDays <= 0) {
          return bad("Invalid windowDays");
        }
        return json(api.leverage(windowDays));
      }

      default:
        return notFound(`Unknown resource: ${resource ?? "(none)"}`);
    }
  } catch (e) {
    return json(
      { error: (e as Error).message ?? "Internal error" },
      { status: 500 },
    );
  }
}
