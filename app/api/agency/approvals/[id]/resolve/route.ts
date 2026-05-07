import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { bindApi } from "@/lib/agency/server-api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: "approved" | "rejected";
  };
  const status = body.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 },
    );
  }
  try {
    const api = bindApi(session.user.id);
    const approval = await api.resolveApproval({ approvalId: id, status });
    return NextResponse.json(approval);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 404 },
    );
  }
}
