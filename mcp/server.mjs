#!/usr/bin/env node
/**
 * fulcru-mcp — a local (stdio) MCP server that proxies to Fulcru's hosted MCP.
 *
 * Some agent hosts (Claude Desktop, Hermes, Cursor) prefer a local stdio server
 * they launch as a subprocess over a remote URL + header. This is that: a thin
 * proxy. It forwards `tools/list` and `tools/call` to Fulcru's hosted endpoint,
 * attaching your token, and answers `initialize`/`ping` locally. There is no
 * tool logic here — the five Fulcru tools live server-side, so this file never
 * drifts from them.
 *
 * Zero dependencies on purpose (matches the CLI): it speaks newline-delimited
 * JSON-RPC over stdin/stdout, the MCP stdio transport.
 *
 *   export FULCRU_TOKEN=pk_...        # Settings -> Integrations in the app
 *   export FULCRU_ENDPOINT=...        # optional; defaults to the hosted MCP
 */

const ENDPOINT =
  process.env.FULCRU_ENDPOINT ?? "https://little-orca-977.convex.site/mcp";
const TOKEN = process.env.FULCRU_TOKEN;
const VERSION = "0.1.0";

/** One JSON-RPC round trip to the hosted HTTP MCP. */
async function remote(method, params, id) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return await res.json();
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function handle(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;

  // Notifications carry no id and expect no response.
  if (id === undefined) return;

  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "fulcru", version: VERSION },
          capabilities: { tools: {} },
        },
      });
    }
    if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });

    if (method === "tools/list") {
      const body = await remote("tools/list", {}, id);
      return send({ jsonrpc: "2.0", id, result: body.result ?? { tools: [] } });
    }

    if (method === "tools/call") {
      if (!TOKEN) {
        return send({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: "FULCRU_TOKEN is not set. Get one at Settings -> Integrations in the Fulcru app.",
              },
            ],
          },
        });
      }
      const body = await remote("tools/call", params, id);
      if (body.error) return send({ jsonrpc: "2.0", id, error: body.error });
      return send({ jsonrpc: "2.0", id, result: body.result });
    }

    return send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: String(err?.message ?? err) },
    });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) void handle(line);
  }
});
// Do NOT force-exit on stdin end: an in-flight tools/call forward is async, and
// exiting here would kill it before its response is written. With stdin closed
// and no pending work, Node drains the event loop and exits on its own.
