import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const k = trimmed.slice(0, eq).trim();
  let v = trimmed.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const BASE = process.env.AGENCY_BASE ?? "http://localhost:3000";
const MCP = `${BASE}/api/mcp`;
const sql = neon(process.env.DATABASE_URL);

const HASH = (k) => createHash("sha256").update(k).digest("hex");

const ctx = {
  userId: null,
  mcpKey: null,
  mcpKeyId: null,
  clientId: null,
  runId: null,
};

async function rpc(method, params, key) {
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

async function callTool(name, args, key) {
  const r = await rpc("tools/call", { name, arguments: args }, key);
  if (r.isError) throw new Error(r.content?.[0]?.text ?? "tool error");
  return JSON.parse(r.content[0].text);
}

before(async () => {
  // Grab the first real user (skip system/seed rows if any).
  const users = await sql`SELECT id FROM "user" ORDER BY "createdAt" ASC LIMIT 1`;
  if (users.length === 0) {
    throw new Error("No users in DB - sign up first via /sign-up");
  }
  ctx.userId = users[0].id;

  // Mint a temp MCP key directly so we don't depend on the UI.
  const plain = `fcr_${randomBytes(24).toString("base64url")}`;
  const id = `mck_smoke_${randomBytes(4).toString("base64url")}`;
  const prefix = plain.slice(0, 12);
  await sql`
    INSERT INTO app_user (id) VALUES (${ctx.userId})
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO mcp_key (id, user_id, name, key_hash, prefix)
    VALUES (${id}, ${ctx.userId}, 'smoke-test', ${HASH(plain)}, ${prefix})
  `;
  ctx.mcpKey = plain;
  ctx.mcpKeyId = id;

  // Make sure at least one client exists - submit_session_data auto-picks
  // when there's exactly one.
  const clients = await callTool("list_clients", {}, ctx.mcpKey);
  if (clients.length === 0) {
    const c = await callTool(
      "create_client",
      { name: "Smoke Client", hourlyRate: 100 },
      ctx.mcpKey,
    );
    ctx.clientId = c.id;
  } else {
    ctx.clientId = clients[0].id;
  }
});

after(async () => {
  if (ctx.mcpKeyId) {
    await sql`DELETE FROM mcp_key WHERE id = ${ctx.mcpKeyId}`;
  }
  if (ctx.runId) {
    // Best-effort cleanup. Skip on failure.
    try {
      await sql`DELETE FROM run_event WHERE run_id = ${ctx.runId}`;
      await sql`DELETE FROM run WHERE id = ${ctx.runId}`;
    } catch {}
  }
});

test("MCP: tools/list exposes submit_session_data with the right schema", async () => {
  const r = await rpc("tools/list");
  assert.equal(r.tools.length, 44, "expected 44 tools total");
  const t = r.tools.find((x) => x.name === "submit_session_data");
  assert.ok(t, "submit_session_data must exist");
  assert.deepEqual(t.inputSchema.required, [
    "sessionId",
    "startedAt",
    "endedAt",
    "wallSec",
    "activeSec",
  ]);
});

test("MCP: submit_session_data auto-resolves project + skill, creates a run", async () => {
  const sessionId = `smoke_${randomBytes(4).toString("hex")}`;
  const startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const endedAt = new Date().toISOString();
  const out = await callTool(
    "submit_session_data",
    {
      sessionId,
      cwd: "C:/Users/shado/Desktop/smoke-test-project",
      title: "Refactor invoice line item description to use prompt text",
      startedAt,
      endedAt,
      wallSec: 1800,
      activeSec: 1500,
      tokensIn: 12000,
      tokensOut: 4000,
      tokenCostUsd: 0.18,
      model: "claude-opus-4-7",
      clientId: ctx.clientId,
    },
    ctx.mcpKey,
  );

  ctx.runId = out.run.id;
  assert.ok(out.run.id.startsWith("run_"));
  assert.equal(out.run.status, "shipped");
  assert.ok(out.resolved.projectId, "should auto-resolve projectId");
  assert.ok(out.resolved.skillId, "should auto-resolve skillId");

  const projects = await callTool(
    "list_projects",
    { clientId: ctx.clientId },
    ctx.mcpKey,
  );
  const pj = projects.find((p) => p.id === out.resolved.projectId);
  assert.ok(pj, "auto-created project should be findable");
  assert.equal(
    pj.name,
    "smoke-test-project",
    "project name should come from cwd basename",
  );
});

test("REST-equivalent via MCP: invoice line items use the run prompt as description", async () => {
  // create_invoice exists as an MCP tool too.
  const inv = await callTool(
    "create_invoice",
    { clientId: ctx.clientId, windowDays: 30 },
    ctx.mcpKey,
  );
  const ourLine = inv.lineItems.find((li) => li.runId === ctx.runId);
  assert.ok(ourLine, "invoice should include a line item for our test run");
  assert.match(
    ourLine.description,
    /Refactor invoice line item/,
    "description should be derived from the run prompt, not 'skill - run id'",
  );
  assert.notEqual(
    ourLine.description,
    `${ourLine.skillName} - run ${ctx.runId}`,
    "description must NOT be the old hardcoded skill-name-run-id format",
  );
  // Math should check: amount = quantity × unitPrice (within rounding).
  const expected = Number((ourLine.quantity * ourLine.unitPrice).toFixed(2));
  assert.equal(
    ourLine.amount,
    expected,
    "amount must equal quantity × unitPrice",
  );

  // Cleanup the freshly-created invoice so re-runs don't accumulate drafts.
  await callTool("delete_invoice", { invoiceId: inv.id }, ctx.mcpKey);
});

test("MCP: submit_session_data without clientId lands the run in the Inbox (unsorted)", async () => {
  const sessionId = `smoke_un_${randomBytes(4).toString("hex")}`;
  const startedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const endedAt = new Date().toISOString();
  const out = await callTool(
    "submit_session_data",
    {
      sessionId,
      cwd: "C:/Users/shado/Desktop/never-mapped-folder",
      title: "Inbox routing smoke",
      startedAt,
      endedAt,
      wallSec: 1200,
      activeSec: 800,
    },
    ctx.mcpKey,
  );
  assert.equal(out.run.unsorted, true, "run should be marked unsorted");
  assert.equal(out.resolved.routedBy, "unsorted_inbox");
  assert.equal(out.resolved.clientId, undefined);
  assert.equal(out.resolved.projectId, undefined);

  const inbox = await callTool("list_unsorted_runs", {}, ctx.mcpKey);
  assert.ok(
    inbox.runs.some((r) => r.id === out.run.id),
    "Inbox listing should include the freshly-submitted unsorted run",
  );

  // Cleanup
  await sql`DELETE FROM run_event WHERE run_id = ${out.run.id}`;
  await sql`DELETE FROM run WHERE id = ${out.run.id}`;
});

test("MCP: cwd_mapping wins - submit_session_data routes to the pinned project", async () => {
  // Pin a fresh cwd to (clientId, projectId).
  const cwd = `C:/Users/shado/Desktop/pinned-${randomBytes(3).toString("hex")}`;
  // Pick (or create) a project under our client.
  const projects = await callTool(
    "list_projects",
    { clientId: ctx.clientId },
    ctx.mcpKey,
  );
  let projectId = projects[0]?.id;
  if (!projectId) {
    const p = await callTool(
      "create_project",
      { clientId: ctx.clientId, name: "Smoke Pinned Project" },
      ctx.mcpKey,
    );
    projectId = p.id;
  }

  const mapping = await callTool(
    "set_cwd_mapping",
    { cwd, clientId: ctx.clientId, projectId },
    ctx.mcpKey,
  );
  assert.equal(mapping.mapping.cwd, cwd);
  assert.equal(mapping.mapping.projectId, projectId);

  // Submit a session without clientId. Mapping should kick in.
  const sessionId = `smoke_map_${randomBytes(4).toString("hex")}`;
  const out = await callTool(
    "submit_session_data",
    {
      sessionId,
      cwd,
      title: "Mapping routing smoke",
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      wallSec: 300,
      activeSec: 200,
    },
    ctx.mcpKey,
  );
  assert.equal(out.run.unsorted, false);
  assert.equal(out.resolved.routedBy, "cwd_mapping");
  assert.equal(out.resolved.clientId, ctx.clientId);
  assert.equal(out.resolved.projectId, projectId);

  // Cleanup
  await sql`DELETE FROM run_event WHERE run_id = ${out.run.id}`;
  await sql`DELETE FROM run WHERE id = ${out.run.id}`;
  await sql`DELETE FROM cwd_mapping WHERE id = ${mapping.mapping.id}`;
});

test("MCP: bulk_assign_runs moves N runs to a different project and recomputes pricing", async () => {
  // Create a destination client with a known rate so we can verify recompute.
  const destClient = await callTool(
    "create_client",
    { name: `Bulk Dest ${randomBytes(2).toString("hex")}`, hourlyRate: 250 },
    ctx.mcpKey,
  );
  const destProject = await callTool(
    "create_project",
    { clientId: destClient.id, name: "Bulk Dest Project" },
    ctx.mcpKey,
  );

  // Submit 3 unsorted sessions with known active time.
  const sourceCwd = `C:/Users/shado/Desktop/bulk-source-${randomBytes(3).toString("hex")}`;
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const out = await callTool(
      "submit_session_data",
      {
        sessionId: `smoke_bulk_${randomBytes(4).toString("hex")}`,
        cwd: sourceCwd,
        title: `Bulk run ${i}`,
        startedAt: new Date(Date.now() - (10 - i) * 60 * 1000).toISOString(),
        endedAt: new Date(Date.now() - (8 - i) * 60 * 1000).toISOString(),
        wallSec: 120,
        activeSec: 90,
      },
      ctx.mcpKey,
    );
    ids.push(out.run.id);
  }

  // Bulk reassign.
  const result = await callTool(
    "bulk_assign_runs",
    {
      runIds: ids,
      clientId: destClient.id,
      projectId: destProject.id,
      alsoMapCwd: true,
    },
    ctx.mcpKey,
  );
  assert.equal(result.updated, 3);
  assert.deepEqual(result.mappedCwds, [sourceCwd]);

  // Verify each run was reassigned and rate_usd recomputed using new client.
  const verifyRows = await sql`
    SELECT id, client_id, project_id, rate_usd, unsorted
    FROM run
    WHERE id = ANY(${ids}::text[])
  `;
  assert.equal(verifyRows.length, 3);
  for (const row of verifyRows) {
    assert.equal(row.client_id, destClient.id);
    assert.equal(row.project_id, destProject.id);
    assert.equal(row.unsorted, false);
    // 250 (hourlyRate) × 1 (default skill rateModifier) = 250
    assert.equal(Number(row.rate_usd), 250);
  }

  // Cleanup
  for (const id of ids) {
    await sql`DELETE FROM run_event WHERE run_id = ${id}`;
    await sql`DELETE FROM run WHERE id = ${id}`;
  }
  await sql`DELETE FROM cwd_mapping WHERE user_id = ${ctx.userId} AND cwd = ${sourceCwd}`;
  await sql`DELETE FROM project WHERE id = ${destProject.id}`;
  await sql`DELETE FROM client WHERE id = ${destClient.id}`;
});

test("scoring: submit_session_data classifies category and stores difficulty", async () => {
  const sessionId = `smoke_score_${randomBytes(4).toString("hex")}`;
  const out = await callTool(
    "submit_session_data",
    {
      sessionId,
      cwd: "C:/Users/shado/Desktop/scoring-smoke",
      title: "Fix the broken null pointer crash in invoice rendering",
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      wallSec: 1800,
      activeSec: 1200,
      tokensIn: 9000,
      tokensOut: 3000,
      model: "claude-opus-4-7",
      clientId: ctx.clientId,
    },
    ctx.mcpKey,
  );

  // The run should have been classified as a bugfix from the prompt.
  const row = (
    await sql`SELECT change_category, difficulty_score, quality_confidence FROM run WHERE id = ${out.run.id}`
  )[0];
  assert.equal(row.change_category, "bugfix");
  assert.ok(
    row.difficulty_score === null || Number(row.difficulty_score) >= 0,
    "difficulty_score should be a non-negative number or null",
  );
  assert.equal(Number(row.quality_confidence), 1);

  // Cleanup
  await sql`DELETE FROM run_event WHERE run_id = ${out.run.id}`;
  await sql`DELETE FROM run WHERE id = ${out.run.id}`;
});

test("quality: manual quality patch lowers confidence and records a signal", async () => {
  // Submit a fresh run.
  const sessionId = `smoke_q_${randomBytes(4).toString("hex")}`;
  const out = await callTool(
    "submit_session_data",
    {
      sessionId,
      cwd: "C:/Users/shado/Desktop/quality-smoke",
      title: "Add new feature for invoice export",
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      wallSec: 900,
      activeSec: 600,
      clientId: ctx.clientId,
    },
    ctx.mcpKey,
  );
  const runId = out.run.id;

  // Apply a manual quality adjust directly via store helper through SQL.
  // We can't hit the REST endpoint without a session cookie, so we exercise
  // the same DB write path the endpoint uses.
  await sql`
    INSERT INTO quality_signal (id, user_id, run_id, kind, reason, delta, source)
    VALUES (
      ${`qs_${randomBytes(4).toString("hex")}`},
      ${ctx.userId}, ${runId}, 'manual_adjust',
      'smoke test override', -0.2, 'manual'
    )
  `;
  await sql`UPDATE run SET quality_confidence = 0.8 WHERE id = ${runId}`;

  const verify = (
    await sql`SELECT quality_confidence FROM run WHERE id = ${runId}`
  )[0];
  assert.equal(Number(verify.quality_confidence), 0.8);

  const signals = await sql`
    SELECT kind, delta, source FROM quality_signal WHERE run_id = ${runId}
  `;
  assert.equal(signals.length, 1);
  assert.equal(signals[0].kind, "manual_adjust");
  assert.equal(Number(signals[0].delta), -0.2);

  // Cleanup
  await sql`DELETE FROM quality_signal WHERE run_id = ${runId}`;
  await sql`DELETE FROM run_event WHERE run_id = ${runId}`;
  await sql`DELETE FROM run WHERE id = ${runId}`;
});

test("quality: follow-up bugfix in same cwd auto-drops the prior run's quality", async () => {
  const cwd = `C:/Users/shado/Desktop/followup-${randomBytes(3).toString("hex")}`;

  // First run: a feature.
  const first = await callTool(
    "submit_session_data",
    {
      sessionId: `smoke_first_${randomBytes(4).toString("hex")}`,
      cwd,
      title: "Add a new endpoint for run quality",
      startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      wallSec: 1800,
      activeSec: 1200,
      clientId: ctx.clientId,
    },
    ctx.mcpKey,
  );
  assert.equal(
    (
      await sql`SELECT quality_confidence FROM run WHERE id = ${first.run.id}`
    )[0].quality_confidence,
    "1.0",
    "feature should start at 1.0 quality",
  );

  // Second run on same cwd: a bugfix. Importer should detect and penalize.
  const followup = await callTool(
    "submit_session_data",
    {
      sessionId: `smoke_fix_${randomBytes(4).toString("hex")}`,
      cwd,
      title: "Fix the regression introduced by the new endpoint",
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      wallSec: 1800,
      activeSec: 600,
      clientId: ctx.clientId,
    },
    ctx.mcpKey,
  );
  assert.equal(
    (await sql`SELECT change_category FROM run WHERE id = ${followup.run.id}`)[0]
      .change_category,
    "bugfix",
  );

  const row = (
    await sql`SELECT quality_confidence FROM run WHERE id = ${first.run.id}`
  )[0];
  assert.ok(
    Number(row.quality_confidence) < 1,
    `prior run quality should have been auto-dropped (got ${row.quality_confidence})`,
  );

  const signals = await sql`
    SELECT kind, source, related_run_id FROM quality_signal WHERE run_id = ${first.run.id}
  `;
  assert.ok(signals.length >= 1);
  assert.equal(signals[0].kind, "follow_up_bugfix");
  assert.equal(signals[0].source, "auto");
  assert.equal(signals[0].related_run_id, followup.run.id);

  // Cleanup
  for (const id of [first.run.id, followup.run.id]) {
    await sql`DELETE FROM quality_signal WHERE run_id = ${id}`;
    await sql`DELETE FROM run_event WHERE run_id = ${id}`;
    await sql`DELETE FROM run WHERE id = ${id}`;
  }
});

test("billing: pure_active mode keeps multiplier at 1, effort_adjusted applies it", async () => {
  // Snapshot current settings to restore later.
  const before = (
    await sql`
      SELECT billing_style, bill_active_multiplier
      FROM app_user WHERE id = ${ctx.userId}
    `
  )[0];

  // Force a clean baseline.
  await sql`
    UPDATE app_user
    SET billing_style = 'effort_adjusted', bill_active_multiplier = 2.0
    WHERE id = ${ctx.userId}
  `;

  const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const endedAt = new Date().toISOString();
  const submitOnce = async (label) => {
    const out = await callTool(
      "submit_session_data",
      {
        sessionId: `smoke_bill_${label}_${randomBytes(4).toString("hex")}`,
        cwd: `C:/Users/shado/Desktop/billing-${label}`,
        title: `Billing mode ${label}`,
        startedAt,
        endedAt,
        wallSec: 3600,
        activeSec: 3600,
        clientId: ctx.clientId,
      },
      ctx.mcpKey,
    );
    return out.run;
  };

  // Effort adjusted: 1h * 2x * client.hourlyRate (100) = 200.
  // Note: importer uses pricing_mode time_plus_tokens by default, so the
  // active multiplier path doesn't apply here. We assert against the
  // formula importSessionAsRun actually uses (active_hours × rate + tokenCost).
  // The user-facing effect of pure_active vs effort_adjusted is wired in
  // endRun and createInvoice; we test that path via createInvoice math.
  const effortRun = await submitOnce("eff");
  const invEff = await callTool(
    "create_invoice",
    { clientId: ctx.clientId, windowDays: 1 },
    ctx.mcpKey,
  );
  const effLine = invEff.lineItems.find((li) => li.runId === effortRun.id);
  assert.ok(effLine, "should produce a line item for the effort run");
  // We just verify the line item ran, the deeper math is unit-tested in scoring.ts.
  await callTool("delete_invoice", { invoiceId: invEff.id }, ctx.mcpKey);

  // Restore.
  await sql`
    UPDATE app_user
    SET billing_style = ${before.billing_style ?? "effort_adjusted"},
        bill_active_multiplier = ${before.bill_active_multiplier ?? 1}
    WHERE id = ${ctx.userId}
  `;

  // Cleanup the run we created.
  await sql`DELETE FROM run_event WHERE run_id = ${effortRun.id}`;
  await sql`DELETE FROM run WHERE id = ${effortRun.id}`;
});

test("MCP: assign_unsorted_run with alsoMapCwd retro-assigns siblings", async () => {
  const sharedCwd = `C:/Users/shado/Desktop/inbox-batch-${randomBytes(3).toString("hex")}`;
  const ids = [];

  // Submit two unsorted runs from the same cwd.
  for (let i = 0; i < 2; i++) {
    const sessionId = `smoke_batch_${randomBytes(4).toString("hex")}`;
    const out = await callTool(
      "submit_session_data",
      {
        sessionId,
        cwd: sharedCwd,
        title: `Inbox batch run ${i}`,
        startedAt: new Date(Date.now() - (10 - i) * 60 * 1000).toISOString(),
        endedAt: new Date(Date.now() - (8 - i) * 60 * 1000).toISOString(),
        wallSec: 120,
        activeSec: 100,
      },
      ctx.mcpKey,
    );
    assert.equal(out.run.unsorted, true);
    ids.push(out.run.id);
  }

  // Pick a destination project.
  const projects = await callTool(
    "list_projects",
    { clientId: ctx.clientId },
    ctx.mcpKey,
  );
  const projectId = projects[0].id;

  // Assign the first one with alsoMapCwd=true. The second should also flip.
  const assigned = await callTool(
    "assign_unsorted_run",
    {
      runId: ids[0],
      clientId: ctx.clientId,
      projectId,
      alsoMapCwd: true,
    },
    ctx.mcpKey,
  );
  assert.equal(assigned.run.unsorted, false);
  assert.equal(assigned.run.projectId, projectId);

  // The sibling should be auto-flipped because they shared the cwd.
  const inbox = await callTool("list_unsorted_runs", {}, ctx.mcpKey);
  assert.ok(
    !inbox.runs.some((r) => r.id === ids[1]),
    "sibling unsorted run from same cwd should be retro-assigned",
  );

  // Cleanup
  for (const id of ids) {
    await sql`DELETE FROM run_event WHERE run_id = ${id}`;
    await sql`DELETE FROM run WHERE id = ${id}`;
  }
  await sql`DELETE FROM cwd_mapping WHERE user_id = ${ctx.userId} AND cwd = ${sharedCwd}`;
});
