#!/usr/bin/env node
/**
 * fulcru - the AEO loop from a terminal, built for agents.
 *
 * Design constraint that drives everything here: the caller is usually an LLM,
 * and its context is the scarce resource. So this CLI prints TERSE LINES, not
 * JSON blobs. `fulcru gaps` costs an agent ~50 tokens; the same data as raw API
 * JSON costs ~800. Pass --json when a machine needs the full shape.
 *
 * It speaks to the same MCP endpoint the agent tools use, so there is exactly
 * one implementation of the loop behind it - no second API to drift.
 *
 * Auth:  export FULCRU_TOKEN=pk_...   (Settings -> Integrations in the app)
 * Usage: fulcru <command>
 *
 *   gaps [n]              questions where AI names a competitor, not you
 *   write <promptId>      write the page that closes one gap (prints Markdown)
 *   publish <pageId> <url>  mark it live; snapshots the baseline to measure from
 *   delta                 what your published pages did
 *   report [section]      overview | competitors | sources | mentions | prompts
 *
 * Every command takes --json to emit the raw payload instead of lines.
 */

const ENDPOINT =
  process.env.FULCRU_ENDPOINT ?? "https://little-orca-977.convex.site/mcp";
const TOKEN = process.env.FULCRU_TOKEN;

const args = process.argv.slice(2);
const wantsJson = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const command = positional[0];

const USAGE = `fulcru - get named by AI search engines

  gaps [n]                 questions where AI names a competitor and not you
  write <promptId>         write the page that closes one gap
  publish <pageId> <url>   mark it live; starts measuring from that moment
  delta                    what your published pages actually did
  report [section]         overview | competitors | sources | mentions | prompts

  --json                   raw payload instead of terse lines

Auth: export FULCRU_TOKEN=pk_...   (get one at Settings -> Integrations)`;

function die(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

/** One JSON-RPC round trip to the MCP endpoint. */
async function call(tool, toolArgs = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: toolArgs },
    }),
  });

  if (!res.ok) die(`fulcru: HTTP ${res.status} from ${ENDPOINT}`);
  const body = await res.json();

  if (body.error) {
    if (body.error.code === -32001) {
      die("fulcru: unauthorized. Set FULCRU_TOKEN (Settings -> Integrations).");
    }
    die(`fulcru: ${body.error.message}`);
  }

  const content = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) {
    if (content === "no_brand") die("fulcru: no brand on this account yet.");
    die(`fulcru: ${content}`);
  }

  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

const out = (line) => process.stdout.write(`${line}\n`);

/** Terse is the point: one line per row, the number first. */
async function main() {
  if (!command || command === "help" || command === "--help") {
    out(USAGE);
    return;
  }
  if (!TOKEN) {
    die("fulcru: FULCRU_TOKEN is not set. Get one at Settings -> Integrations.");
  }

  switch (command) {
    case "gaps": {
      const limit = Number(positional[1]) || 5;
      const rows = await call("fulcru_gaps", { limit });
      if (wantsJson) return out(JSON.stringify(rows));
      if (!rows.length) return out("No open gaps. Every tracked question has a page.");
      for (const r of rows) {
        const instead = r.namedInstead.length
          ? ` -> AI names ${r.namedInstead.join(", ")}`
          : "";
        out(`${String(r.mentionRate).padStart(3)}%  ${r.promptId}  ${r.prompt}${instead}`);
      }
      out(`\nWrite the top one:  fulcru write ${rows[0].promptId}`);
      return;
    }

    case "write": {
      const promptId = positional[1];
      if (!promptId) die("fulcru: write needs a promptId. Run `fulcru gaps` first.");
      const page = await call("fulcru_write_page", { promptId });
      if (wantsJson) return out(JSON.stringify(page));
      // The Markdown goes to stdout so it can be piped straight to a file;
      // everything else goes to stderr so the pipe stays clean.
      process.stderr.write(`pageId: ${page.pageId}\ntitle:  ${page.title}\n\n`);
      out(page.markdown);
      process.stderr.write(
        `\nPublish it, then:  fulcru publish ${page.pageId} <live-url>\n`,
      );
      return;
    }

    case "publish": {
      const [, pageId, url] = positional;
      if (!pageId || !url) die("fulcru: publish needs <pageId> <url>.");
      const r = await call("fulcru_publish_page", { pageId, url });
      if (wantsJson) return out(JSON.stringify(r));
      out(
        `Published. Baseline: AI names you in ${r.baselineMentionRate}% of ${r.measuredAnswers} measured answers.`,
      );
      out("The next tracking pass is measured against that.");
      return;
    }

    case "delta": {
      const rows = await call("fulcru_delta", {});
      if (wantsJson) return out(JSON.stringify(rows));
      if (!rows.length) return out("No pages yet. Run `fulcru gaps`.");
      for (const r of rows) {
        if (r.status !== "published") {
          out(`  draft      ${r.title}`);
        } else if (r.deltaPoints === null) {
          out(`  ${String(r.baseline).padStart(3)}% -> ?    awaiting next pass  ${r.title}`);
        } else {
          const sign = r.deltaPoints > 0 ? "+" : "";
          out(
            `  ${String(r.baseline).padStart(3)}% -> ${String(r.now).padStart(3)}%  ${sign}${r.deltaPoints}pts  ${r.title}`,
          );
        }
      }
      return;
    }

    case "report": {
      const section = positional[1] ?? "overview";
      const data = await call("fulcru_visibility", { section });
      if (wantsJson) return out(JSON.stringify(data));
      if (Array.isArray(data)) {
        for (const row of data) out(Object.values(row).join("  "));
      } else {
        for (const [k, v] of Object.entries(data)) out(`${k}: ${v}`);
      }
      return;
    }

    default:
      die(`fulcru: unknown command "${command}"\n\n${USAGE}`);
  }
}

main().catch((err) => die(`fulcru: ${err.message}`));
