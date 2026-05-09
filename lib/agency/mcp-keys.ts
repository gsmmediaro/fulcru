import { createHash, randomBytes } from "crypto";
import { sql } from "@/lib/db";

const KEY_PREFIX = "fcr_";

function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export type McpKey = {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
};

export type CreatedMcpKey = McpKey & {
  /** Plain text key - only returned at creation time. */
  key: string;
};

export async function generateMcpKey(
  userId: string,
  name = "default",
): Promise<CreatedMcpKey> {
  const raw = randomBytes(24).toString("base64url");
  const plain = `${KEY_PREFIX}${raw}`;
  const id = `mck_${randomBytes(6).toString("base64url")}`;
  const prefix = plain.slice(0, 12);
  const keyHash = hashKey(plain);

  await sql`
    INSERT INTO app_user (id) VALUES (${userId})
    ON CONFLICT (id) DO NOTHING
  `;
  const rows = (await sql`
    INSERT INTO mcp_key (id, user_id, name, key_hash, prefix)
    VALUES (${id}, ${userId}, ${name}, ${keyHash}, ${prefix})
    RETURNING id, user_id, name, prefix, created_at, last_used_at
  `) as Array<{
    id: string;
    user_id: string;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
  }>;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    prefix: row.prefix,
    createdAt: String(row.created_at),
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : undefined,
    key: plain,
  };
}

export async function listMcpKeys(userId: string): Promise<McpKey[]> {
  const rows = (await sql`
    SELECT id, user_id, name, prefix, created_at, last_used_at
    FROM mcp_key
    WHERE user_id = ${userId} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `) as Array<{
    id: string;
    user_id: string;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    prefix: r.prefix,
    createdAt: String(r.created_at),
    lastUsedAt: r.last_used_at ? String(r.last_used_at) : undefined,
  }));
}

export async function revokeMcpKey(userId: string, id: string): Promise<void> {
  await sql`
    UPDATE mcp_key
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND id = ${id}
  `;
}

export async function revokeAllMcpKeys(userId: string): Promise<void> {
  await sql`
    UPDATE mcp_key
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}

export async function resolveUserIdFromKey(plainKey: string): Promise<string | null> {
  if (!plainKey || !plainKey.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashKey(plainKey);
  const rows = (await sql`
    SELECT user_id, id
    FROM mcp_key
    WHERE key_hash = ${keyHash} AND revoked_at IS NULL
    LIMIT 1
  `) as Array<{ user_id: string; id: string }>;
  if (rows[0]) {
    void sql`UPDATE mcp_key SET last_used_at = NOW() WHERE id = ${rows[0].id}`;
    return rows[0].user_id;
  }
  return null;
}

export function extractBearerToken(headers: Headers): string | null {
  const auth = headers.get("authorization") ?? headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
