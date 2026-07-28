#!/usr/bin/env node
/**
 * fulcru-mcp — a local (stdio) MCP server that proxies to Fulcru's hosted MCP.
 *
 * Some agent hosts (Claude Desktop, Hermes, Cursor) prefer a local stdio server
 * they launch as a subprocess over a remote URL + header. This is that: a thin
 * proxy. It forwards `tools/list` and `tools/call` to Fulcru's hosted endpoint,
 * attaching your token, and answers the handshake locally. There is no tool
 * logic here — the five Fulcru tools live server-side, so this file never
 * drifts from them.
 *
 * Two protocol eras, one proxy. Revision 2026-07-28 dropped the `initialize`
 * handshake and the session, and put the protocol version, the client's identity
 * and its capabilities in each request's `_meta`; `server/discover` replaced the
 * handshake, and a dual-era client sends it first to find out which era it is
 * talking to. We answer both: `server/discover` for modern hosts, `initialize`
 * for the ones shipping today, and we mirror whichever the host used onto the
 * hosted endpoint so it sees the same era we were asked for.
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
const VERSION = "0.3.1";

const MODERN_VERSION = "2026-07-28";
const LEGACY_VERSION = "2024-11-05";
const SUPPORTED_VERSIONS = [MODERN_VERSION, LEGACY_VERSION];

const META_PROTOCOL_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CLIENT_INFO = "io.modelcontextprotocol/clientInfo";
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

const SERVER_INFO = { name: "fulcru", version: VERSION };

// Who launched us, and one id for this process's run. The legacy path answers
// `initialize` locally, so without these the hosted server would see every
// proxied call as an anonymous POST from `node`. Sending them as headers lets it
// tell Claude Desktop from Cursor, and one long agent session from the next. A
// modern host sends its own `clientInfo` in `_meta` on every request, and the
// session header is gone from that era, so neither is forwarded there.
const session = `ses_${randomHex(32)}`;
let clientName;
let clientVersion;

function randomHex(chars) {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(chars / 2)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, chars);
}

/** One JSON-RPC round trip to the hosted HTTP MCP.
 *
 * `modern` decides which era's headers ride along. The 2026-07-28 transport
 * mirrors `method` and the tool name into headers so a proxy can route without
 * parsing the body, and the server rejects the request if they disagree with it,
 * so they are built from the very params being sent. */
async function remote(method, params, id, modern) {
  const meta = modern ? (params?._meta ?? {}) : undefined;
  const version = modern ? (meta[META_PROTOCOL_VERSION] ?? MODERN_VERSION) : undefined;
  const name = params?.name;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(modern
        ? {
            "MCP-Protocol-Version": version,
            "Mcp-Method": method,
            ...(method === "tools/call" && typeof name === "string"
              ? { "Mcp-Name": headerSafe(name) }
              : {}),
          }
        : {
            "Mcp-Session-Id": session,
            ...(clientName ? { "Mcp-Client-Name": clientName } : {}),
            ...(clientVersion ? { "Mcp-Client-Version": clientVersion } : {}),
          }),
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return await res.json();
}

/** Header values must be printable ASCII. Anything else travels Base64 inside
 *  the sentinel the spec defines, which the server decodes before comparing it
 *  to the body. Our own tool names are plain ASCII; this is for the day a host
 *  forwards someone else's. */
function headerSafe(value) {
  if (/^[\x20-\x7e]*$/.test(value) && value.trim() === value && !value.startsWith("=?base64?")) {
    return value;
  }
  return `=?base64?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

/** Every result we mint locally carries the fields 2026-07-28 requires and
 *  legacy clients ignore. */
function localResult(id, result) {
  return send({
    jsonrpc: "2.0",
    id,
    result: {
      resultType: "complete",
      ...result,
      _meta: { [META_SERVER_INFO]: SERVER_INFO, ...(result._meta ?? {}) },
    },
  });
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

  // Which era the HOST is speaking, decided per request the way the spec says:
  // a `_meta` protocol version, or the method that exists only in the new
  // revision. Everything else is legacy.
  const meta = params?._meta ?? {};
  const metaVersion =
    typeof meta[META_PROTOCOL_VERSION] === "string" ? meta[META_PROTOCOL_VERSION] : undefined;
  const modern = metaVersion !== undefined || method === "server/discover";

  try {
    if (metaVersion !== undefined && !SUPPORTED_VERSIONS.includes(metaVersion)) {
      return send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32022,
          message: "Unsupported protocol version",
          data: { supported: SUPPORTED_VERSIONS, requested: metaVersion },
        },
      });
    }

    // The modern handshake replacement. Answered locally for the same reason
    // `initialize` is: startup must not wait on the network, and the answer is
    // ours to give — this process is the server the host launched.
    if (method === "server/discover") {
      const info = meta[META_CLIENT_INFO];
      clientName = info?.name ?? clientName;
      clientVersion = info?.version ?? clientVersion;
      return localResult(id, {
        supportedVersions: SUPPORTED_VERSIONS,
        capabilities: { tools: {} },
        instructions:
          "Fulcru reports and fixes a brand's visibility in AI answers. Start with fulcru_gaps to get the work list, fulcru_write_page to close a gap, fulcru_publish_page once the page is live, and fulcru_delta to see what publishing did.",
        ttlMs: 3600000,
        cacheScope: "public",
      });
    }

    if (method === "initialize") {
      clientName = params?.clientInfo?.name;
      clientVersion = params?.clientInfo?.version;
      // Answer locally (below) so startup never waits on the network, but tell
      // the hosted server the handshake happened, or its view of this session
      // would begin at the first tools/list with no client info attached.
      // Deliberately not awaited, and its result is thrown away.
      void remote("initialize", params, id, false).catch(() => {});
      return localResult(id, {
        protocolVersion: LEGACY_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      });
    }

    // Removed in 2026-07-28, kept for the legacy hosts that still send it.
    if (method === "ping") return localResult(id, {});

    if (method === "tools/list") {
      const body = await remote("tools/list", params ?? {}, id, modern);
      return send({ jsonrpc: "2.0", id, result: body.result ?? { tools: [] } });
    }

    if (method === "tools/call") {
      if (!TOKEN) {
        return localResult(id, {
          isError: true,
          content: [
            {
              type: "text",
              text: "FULCRU_TOKEN is not set. Get one at Settings -> Integrations in the Fulcru app.",
            },
          ],
        });
      }
      const body = await remote("tools/call", params, id, modern);
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
