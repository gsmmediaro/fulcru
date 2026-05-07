import { headers } from "next/headers";
import { auth } from "./auth";
import { sql } from "./db";

export async function getSession() {
  const h = await headers();
  return auth.api.getSession({ headers: h });
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user.id;
}

export async function getOnboardingState(userId: string) {
  const rows = (await sql`
    SELECT user_id, completed_at FROM onboarding_state WHERE user_id = ${userId}
  `) as Array<{ user_id: string; completed_at: string }>;
  return rows[0] ?? null;
}

export async function isOnboarded(userId: string): Promise<boolean> {
  return (await getOnboardingState(userId)) !== null;
}
