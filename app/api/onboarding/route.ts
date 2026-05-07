import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import {
  AGENCY_SIZES,
  ATTRIBUTIONS,
  CONCURRENT_CLIENTS,
  SERVICE_CATEGORIES,
  USE_CASES,
  type OnboardingPayload,
} from "@/lib/onboarding/types";

function isOneOf<T extends readonly string[]>(
  arr: T,
  v: unknown,
): v is T[number] {
  return typeof v === "string" && (arr as readonly string[]).includes(v);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: Partial<OnboardingPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (
    !isOneOf(AGENCY_SIZES, body.agencySize) ||
    !isOneOf(CONCURRENT_CLIENTS, body.concurrentClients) ||
    !isOneOf(SERVICE_CATEGORIES, body.serviceCategory) ||
    !Array.isArray(body.useCases) ||
    body.useCases.length === 0 ||
    !body.useCases.every((u) => isOneOf(USE_CASES, u)) ||
    !isOneOf(ATTRIBUTIONS, body.attribution)
  ) {
    return NextResponse.json(
      { error: "validation failed" },
      { status: 422 },
    );
  }

  if (
    body.serviceCategory === "other" &&
    !body.serviceCategoryOther?.trim()
  ) {
    return NextResponse.json(
      { error: "serviceCategoryOther required" },
      { status: 422 },
    );
  }
  if (body.attribution === "other" && !body.attributionOther?.trim()) {
    return NextResponse.json(
      { error: "attributionOther required" },
      { status: 422 },
    );
  }

  await sql`
    INSERT INTO app_user (id) VALUES (${userId})
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO onboarding_state (
      user_id, agency_size, concurrent_clients,
      service_category, service_category_other,
      use_cases, attribution, attribution_other
    ) VALUES (
      ${userId},
      ${body.agencySize},
      ${body.concurrentClients},
      ${body.serviceCategory},
      ${body.serviceCategoryOther ?? null},
      ${body.useCases},
      ${body.attribution},
      ${body.attributionOther ?? null}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      agency_size = EXCLUDED.agency_size,
      concurrent_clients = EXCLUDED.concurrent_clients,
      service_category = EXCLUDED.service_category,
      service_category_other = EXCLUDED.service_category_other,
      use_cases = EXCLUDED.use_cases,
      attribution = EXCLUDED.attribution,
      attribution_other = EXCLUDED.attribution_other,
      completed_at = NOW()
  `;

  return NextResponse.json({ ok: true, redirect: "/agency" });
}
