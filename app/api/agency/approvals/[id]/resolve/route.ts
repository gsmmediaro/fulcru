import { NextResponse } from "next/server";
import { api } from "@/lib/agency/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const approval = api.resolveApproval({ approvalId: id, status });
    return NextResponse.json(approval);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 404 },
    );
  }
}
