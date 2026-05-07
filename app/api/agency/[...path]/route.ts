import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { bindApi } from "@/lib/agency/server-api";
import { enrichRunFromSession } from "@/lib/agency/session-importer";
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

function unauthorized() {
  return json({ error: "unauthorized" }, { status: 401 });
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
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();
  const { path } = await ctx.params;
  const url = new URL(req.url);
  return route("GET", path ?? [], url, null, session.user.id);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();
  const { path } = await ctx.params;
  const url = new URL(req.url);
  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch (e) {
    return bad((e as Error).message);
  }
  return route("POST", path ?? [], url, body, session.user.id);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();
  const { path } = await ctx.params;
  const url = new URL(req.url);
  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch (e) {
    return bad((e as Error).message);
  }
  return route("PATCH", path ?? [], url, body, session.user.id);
}

async function route(
  method: "GET" | "POST" | "PATCH",
  path: string[],
  url: URL,
  body: Record<string, unknown> | null,
  userId: string,
): Promise<Response> {
  const api = bindApi(userId);
  try {
    const [resource, id, action] = path;
    const qp = url.searchParams;

    switch (resource) {
      case "clients": {
        if (method === "GET") {
          if (!id) return json(await api.listClients());
          const c = await api.getClient(id);
          return c ? json(c) : notFound("Client not found");
        }
        if (method === "PATCH") {
          if (!id) return bad("Client id is required for PATCH");
          if (!body) return bad("Missing body");
          const ccRaw = body.ccRecipients;
          const ccRecipients =
            ccRaw === null
              ? null
              : Array.isArray(ccRaw)
                ? (ccRaw.filter((x) => typeof x === "string") as string[])
                : undefined;
          try {
            const updated = await api.updateClient(id, {
              name: asString(body.name),
              initials: asString(body.initials),
              accentColor: asString(body.accentColor),
              hourlyRate: asNumber(body.hourlyRate),
              email: body.email === null ? null : asString(body.email),
              address: body.address === null ? null : asString(body.address),
              ccRecipients,
              note: body.note === null ? null : asString(body.note),
            });
            return json(updated);
          } catch (e) {
            return bad((e as Error).message, 404);
          }
        }
        if (id) return bad("Method not allowed", 405);
        if (!body) return bad("Missing body");
        const name = asString(body.name);
        const hourlyRate = asNumber(body.hourlyRate);
        if (!name || hourlyRate === undefined) {
          return bad("name and hourlyRate are required");
        }
        const created = await api.createClient({
          name,
          initials: asString(body.initials),
          accentColor: asString(body.accentColor),
          hourlyRate,
          email: asString(body.email),
          address: asString(body.address),
          ccRecipients: Array.isArray(body.ccRecipients)
            ? (body.ccRecipients.filter(
                (x) => typeof x === "string",
              ) as string[])
            : undefined,
          note: asString(body.note),
        });
        return json(created, { status: 201 });
      }

      case "projects": {
        if (method === "GET") {
          if (!id) {
            const clientId = qp.get("clientId") ?? undefined;
            return json(await api.listProjects(clientId));
          }
          const p = await api.getProject(id);
          return p ? json(p) : notFound("Project not found");
        }
        if (id) return bad("Method not allowed", 405);
        if (!body) return bad("Missing body");
        const clientId = asString(body.clientId);
        const name = asString(body.name);
        if (!clientId || !name) {
          return bad("clientId and name are required");
        }
        const created = await api.createProject({
          clientId,
          name,
          description: asString(body.description),
          color: asString(body.color),
        });
        return json(created, { status: 201 });
      }

      case "skills": {
        if (method === "GET") {
          if (!id) return json(await api.listSkills());
          const s = await api.getSkill(id);
          return s ? json(s) : notFound("Skill not found");
        }
        if (id) return bad("Method not allowed", 405);
        if (!body) return bad("Missing body");
        const name = asString(body.name);
        const category = asString(body.category) as
          | "engineering"
          | "design"
          | "content"
          | "ops"
          | "research"
          | undefined;
        const baselineHours = asNumber(body.baselineHours);
        const rateModifier = asNumber(body.rateModifier);
        const allowedCategories = [
          "engineering",
          "design",
          "content",
          "ops",
          "research",
        ];
        if (
          !name ||
          !category ||
          !allowedCategories.includes(category) ||
          baselineHours === undefined ||
          rateModifier === undefined
        ) {
          return bad(
            "name, category, baselineHours, rateModifier are required",
          );
        }
        const tags = Array.isArray(body.tags)
          ? (body.tags.filter((t) => typeof t === "string") as string[])
          : [];
        const created = await api.createSkill({
          name,
          description: asString(body.description) ?? "",
          category,
          baselineHours,
          rateModifier,
          tags,
        });
        return json(created, { status: 201 });
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
              await api.listRuns({
                clientId: qp.get("clientId") ?? undefined,
                projectId: qp.get("projectId") ?? undefined,
                status: status as RunStatus | undefined,
                limit,
              }),
            );
          }
          const run = await api.getRun(id);
          if (!run) return notFound("Run not found");
          return json({ run, events: await api.listRunEvents(id) });
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
            const pm = asString(body.pricingMode);
            const run = await api.startRun({
              clientId,
              projectId,
              skillId,
              agentName: asString(body.agentName),
              prompt: asString(body.prompt),
              cwd: asString(body.cwd),
              pricingMode:
                pm === "baseline" || pm === "time_plus_tokens" ? pm : undefined,
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
            const evt = await api.recordEvent({
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
            await api.endRun({
              runId: id,
              status: status as "shipped" | "failed" | "cancelled",
              deliverableUrl: asString(body.deliverableUrl),
              notes: asString(body.notes),
            });
            const enrichment = await enrichRunFromSession(userId, {
              runId: id,
              cwd: asString(body.cwd),
            });
            const run = await api.getRun(id);
            return json({ run, enrichment });
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
          return json(
            await api.listApprovals(status as ApprovalStatus | undefined),
          );
        }
        // POST
        if (!body) return bad("Missing body");
        if (!id) {
          const runId = asString(body.runId);
          const question = asString(body.question);
          if (!runId || !question) return bad("runId and question required");
          try {
            const apr = await api.requestApproval({
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
            const apr = await api.resolveApproval({
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
        if (method === "GET") {
          if (!id) {
            return json(
              await api.listInvoices(qp.get("clientId") ?? undefined),
            );
          }
          const inv = await api.getInvoice(id);
          return inv ? json(inv) : notFound("Invoice not found");
        }
        if (!id) {
          if (!body) return bad("Missing body");
          const clientId = asString(body.clientId);
          if (!clientId) return bad("clientId is required");
          try {
            const created = await api.createInvoice({
              clientId,
              windowDays: asNumber(body.windowDays),
              taxPct: asNumber(body.taxPct),
            });
            return json(created, { status: 201 });
          } catch (e) {
            return bad((e as Error).message);
          }
        }
        if (action === "issue") {
          try {
            return json(await api.issueInvoice(id));
          } catch (e) {
            return bad((e as Error).message, 400);
          }
        }
        if (action === "pay") {
          try {
            return json(await api.payInvoice(id));
          } catch (e) {
            return bad((e as Error).message, 400);
          }
        }
        return notFound("Unknown invoice action");
      }

      case "leverage": {
        if (method !== "GET") return bad("Method not allowed", 405);
        const w = qp.get("windowDays");
        const windowDays = w ? Number(w) : 30;
        if (!Number.isFinite(windowDays) || windowDays <= 0) {
          return bad("Invalid windowDays");
        }
        return json(await api.leverage(windowDays));
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
