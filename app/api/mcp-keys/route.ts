import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  generateMcpKey,
  listMcpKeys,
  revokeAllMcpKeys,
} from "@/lib/agency/mcp-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const keys = await listMcpKeys(session.user.id);
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  await revokeAllMcpKeys(session.user.id);
  const created = await generateMcpKey(session.user.id, body.name?.trim() || "default");
  return NextResponse.json(created);
}
