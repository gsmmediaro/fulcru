import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { revokeMcpKey } from "@/lib/agency/mcp-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await revokeMcpKey(session.user.id, id);
  return NextResponse.json({ ok: true });
}
