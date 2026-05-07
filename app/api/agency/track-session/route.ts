import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  findSessionJsonl,
  importSessionAsRun,
  parseSession,
} from "@/lib/agency/session-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  sessionId?: string;
  filePath?: string;
  cwd?: string;
  clientId: string;
  projectId: string;
  skillId: string;
  agentName?: string;
  prompt?: string;
  hourlyRate?: number;
  pricingMode?: "time_plus_tokens" | "baseline";
  dryRun?: boolean;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.clientId || !body.projectId || !body.skillId) {
    return NextResponse.json(
      { error: "clientId, projectId and skillId are required" },
      { status: 400 },
    );
  }

  let filePath = body.filePath;
  try {
    if (!filePath) {
      filePath = findSessionJsonl({
        sessionId: body.sessionId,
        cwd: body.cwd,
      });
    }
    const stats = parseSession(filePath);
    if (body.dryRun) {
      return NextResponse.json({ stats }, { headers: { "cache-control": "no-store" } });
    }
    const { run, events } = await importSessionAsRun(userId, {
      stats,
      clientId: body.clientId,
      projectId: body.projectId,
      skillId: body.skillId,
      agentName: body.agentName,
      prompt: body.prompt,
      hourlyRate: body.hourlyRate,
      pricingMode: body.pricingMode,
    });
    return NextResponse.json(
      { stats, run, events },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "track-session",
    method: "POST",
    body: {
      sessionId: "optional",
      filePath: "optional absolute path to a Claude Code .jsonl",
      cwd: "optional cwd to scope projects dir",
      clientId: "required",
      projectId: "required",
      skillId: "required",
      hourlyRate: "optional override (USD/h)",
      pricingMode: "time_plus_tokens (default) | baseline",
      dryRun: "boolean - return stats without creating a run",
    },
  });
}
