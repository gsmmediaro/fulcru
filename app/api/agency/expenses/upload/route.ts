import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function bad(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return bad(
      "Receipt upload is not configured (BLOB_READ_WRITE_TOKEN missing). The expense was saved without a receipt.",
      503,
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return bad("Invalid multipart/form-data body");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return bad("file field is required");
  }

  // Limit file size to 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return bad("File too large (max 10 MB)");
  }

  const filename =
    file instanceof File
      ? file.name
      : `receipt-${Date.now()}.bin`;

  try {
    const blob = await put(
      `receipts/${session.user.id}/${Date.now()}-${filename}`,
      file,
      { access: "public", token },
    );
    return new Response(
      JSON.stringify({ url: blob.url, pathname: blob.pathname }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return bad(`Upload failed: ${(e as Error).message}`, 500);
  }
}
