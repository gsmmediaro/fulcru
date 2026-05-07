import { test, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.AGENCY_BASE ?? "http://localhost:3000";
const MCP = `${BASE}/api/mcp`;
const CWD = "C:/Users/shado/Desktop/Altele/iproyal";

const j = async (res) => {
  if (!res.ok && res.status !== 201) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status} — ${t}`);
  }
  return res.json();
};

const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(j);

const get = (url) => fetch(url).then(j);

const rpc = async (method, params) => {
  const res = await post(MCP, {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  });
  if (res.error) throw new Error(res.error.message);
  return res.result;
};

const callTool = async (name, args) => {
  const r = await rpc("tools/call", { name, arguments: args });
  if (r.isError) throw new Error(r.content?.[0]?.text ?? "tool error");
  return JSON.parse(r.content[0].text);
};

const ctx = {
  client: null,
  client2: null,
  project: null,
  project2: null,
  skill: null,
  skill2: null,
};

before(async () => {
  ctx.client = await post(`${BASE}/api/agency/clients`, {
    name: "E2E Client",
    initials: "EC",
    accentColor: "#3B82F6",
    hourlyRate: 150,
  });
  ctx.client2 = await post(`${BASE}/api/agency/clients`, {
    name: "E2E Client B",
    initials: "EB",
    accentColor: "#10B981",
    hourlyRate: 180,
  });
  ctx.project = await post(`${BASE}/api/agency/projects`, {
    clientId: ctx.client.id,
    name: "E2E Project",
    description: "test",
    color: "#3B82F6",
  });
  ctx.project2 = await post(`${BASE}/api/agency/projects`, {
    clientId: ctx.client2.id,
    name: "E2E Project B",
    color: "#10B981",
  });
  ctx.skill = await post(`${BASE}/api/agency/skills`, {
    name: "E2E Skill",
    description: "test",
    category: "engineering",
    baselineHours: 5,
    rateModifier: 1,
    tags: ["test"],
  });
  ctx.skill2 = await post(`${BASE}/api/agency/skills`, {
    name: "E2E Skill B",
    description: "test",
    category: "engineering",
    baselineHours: 6,
    rateModifier: 1.1,
    tags: ["test"],
  });
});

test("agency pages render (200)", async () => {
  const paths = [
    "/agency",
    "/agency/runs",
    "/agency/leverage",
    "/agency/skills",
    "/agency/clients",
    "/agency/projects",
    "/agency/approvals",
    "/agency/invoices",
  ];
  for (const p of paths) {
    const r = await fetch(`${BASE}${p}`);
    assert.equal(r.status, 200, `${p} → ${r.status}`);
  }
});

test("REST: clients/projects/skills round-trip via POST", async () => {
  const clients = await get(`${BASE}/api/agency/clients`);
  const projects = await get(`${BASE}/api/agency/projects`);
  const skills = await get(`${BASE}/api/agency/skills`);
  assert.ok(clients.find((c) => c.id === ctx.client.id));
  assert.ok(projects.find((p) => p.id === ctx.project.id));
  assert.ok(skills.find((s) => s.id === ctx.skill.id));
});

test("REST: leverage returns numeric snapshot", async () => {
  const lev = await get(`${BASE}/api/agency/leverage?windowDays=30`);
  assert.equal(typeof lev.multiplier, "number");
  assert.equal(typeof lev.marginUsd, "number");
  assert.ok(lev.runs >= 0);
});

test("MCP: tools/list exposes 8 tools with cwd on run_start", async () => {
  const r = await rpc("tools/list");
  assert.equal(r.tools.length, 8);
  const start = r.tools.find((t) => t.name === "run_start");
  assert.ok(start.inputSchema.properties.cwd, "run_start must accept cwd");
});

test("MCP: full lifecycle (start → event → end) records the run", async () => {
  const run = await callTool("run_start", {
    clientId: ctx.client.id,
    projectId: ctx.project.id,
    skillId: ctx.skill.id,
    agentName: "claude-opus-4-7",
    prompt: "test lifecycle",
    cwd: CWD,
  });
  assert.ok(run.id.startsWith("run_"));
  assert.equal(run.status, "running");
  assert.equal(run.cwd, CWD);

  await callTool("run_event", {
    runId: run.id,
    kind: "milestone",
    label: "test milestone",
  });

  const ended = await callTool("run_end", {
    runId: run.id,
    status: "shipped",
    deliverableUrl: "https://example.com/pr/1",
  });
  assert.equal(ended.run.status, "shipped");
  assert.ok(typeof ended.enrichment === "object");

  const fetched = await callTool("get_run", { runId: run.id });
  assert.equal(fetched.run.status, "shipped");
  assert.ok(fetched.events.length >= 2);
});

test("MCP: time_plus_tokens billable = runtime_hours × rate + token_cost", async () => {
  const run = await callTool("run_start", {
    clientId: ctx.client.id,
    projectId: ctx.project.id,
    skillId: ctx.skill2.id,
    cwd: CWD,
  });
  await new Promise((r) => setTimeout(r, 1100));
  const ended = await callTool("run_end", {
    runId: run.id,
    status: "shipped",
    deliverableUrl: "https://example.com/pr/2",
  });
  const r = ended.run;
  const runtimeH = r.runtimeSec / 3600;
  const expected = Number((runtimeH * r.rateUsd + r.costUsd).toFixed(2));
  assert.equal(r.billableUsd, expected);
});

test("MCP: baseline mode bills baseline_hours × rate", async () => {
  const run = await callTool("run_start", {
    clientId: ctx.client.id,
    projectId: ctx.project.id,
    skillId: ctx.skill.id,
    pricingMode: "baseline",
    cwd: CWD,
  });
  const ended = await callTool("run_end", {
    runId: run.id,
    status: "shipped",
  });
  const r = ended.run;
  assert.equal(r.billableUsd, Number((r.baselineHours * r.rateUsd).toFixed(2)));
});

test("MCP: invalid args produce isError responses, not crashes", async () => {
  const r = await rpc("tools/call", {
    name: "run_start",
    arguments: { clientId: "nope", projectId: "nope", skillId: "nope" },
  });
  assert.equal(r.isError, true);
});

test("MCP: unknown method returns -32601", async () => {
  const res = await fetch(MCP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "no/such/method" }),
  });
  const body = await res.json();
  assert.equal(body.error.code, -32601);
});

test("REST: approvals roundtrip — create → resolve", async () => {
  const run = await callTool("run_start", {
    clientId: ctx.client2.id,
    projectId: ctx.project2.id,
    skillId: ctx.skill2.id,
    cwd: CWD,
  });
  const apr = await post(`${BASE}/api/agency/approvals`, {
    runId: run.id,
    question: "test approval",
    context: "test context",
  });
  assert.equal(apr.status, "pending");
  const resolved = await post(
    `${BASE}/api/agency/approvals/${apr.id}/resolve`,
    { status: "approved" },
  );
  assert.equal(resolved.status, "approved");
});

test("REST: invoice issue + pay actions", async () => {
  // Create a shipped run for the invoice
  const run = await callTool("run_start", {
    clientId: ctx.client2.id,
    projectId: ctx.project2.id,
    skillId: ctx.skill.id,
    pricingMode: "baseline",
    cwd: CWD,
  });
  await callTool("run_end", { runId: run.id, status: "shipped" });

  const draft = await post(`${BASE}/api/agency/invoices`, {
    clientId: ctx.client2.id,
    windowDays: 30,
    taxPct: 5,
  });
  assert.equal(draft.status, "draft");
  assert.ok(draft.lineItems.length >= 1);

  const issued = await post(
    `${BASE}/api/agency/invoices/${draft.id}/issue`,
    {},
  );
  assert.equal(issued.status, "sent");
  assert.ok(issued.issuedAt);

  const paid = await post(`${BASE}/api/agency/invoices/${draft.id}/pay`, {});
  assert.equal(paid.status, "paid");
  assert.ok(paid.paidAt);
});
