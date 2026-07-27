# fulcru

**Get named by AI search engines.**

When someone asks ChatGPT "what's the best CRM for a small team", the answer names
two or three products. Those get the customer. Everyone else is invisible.

`fulcru` finds the questions where an AI assistant names a competitor instead of
you, writes the page that closes the gap, and measures what publishing it did. It
runs as a CLI, an MCP server, and an agent skill, so a human or an agent can run
the whole loop.

This repo is the open, self-hostable agent surface. The measurement engine is the
hosted [Fulcru](https://fulcru.app) service; everything here is a thin client that
talks to it with your token.

We run it on ourselves and publish the result, whichever way it goes. Today it
scores us **0 out of 34 prompts**: [we sell AI visibility and we score zero on our
own product](https://www.fulcru.app/guides/scored-zero-on-our-own-tool), with the
full run and the source data.

```bash
npm install -g fulcru
export FULCRU_TOKEN=pk_...        # Settings -> Integrations at fulcru.app
```

## The loop

```bash
$ fulcru gaps
  0%  k57jc...  best AI visibility tracker for a SaaS startup -> AI names Profound, Peec AI
  0%  k57bw...  how do I know if ChatGPT recommends my brand -> AI names Otterly AI
 33%  k57xz...  tools to track brand mentions in Perplexity -> AI names Semrush

Write the top one:  fulcru write k57jc...

$ fulcru write k57jc... > page.md     # the drafted article, grounded in what AI cites
$ fulcru publish k57jc... https://mysite.com/blog/ai-visibility-trackers
Published. Baseline: AI names you in 0% of 9 measured answers.

$ fulcru delta
    0% ->  44%  +44pts  Best AI Visibility Trackers, Compared
```

That last line is the whole point.

## Commands

| Command | What it does |
|---|---|
| `fulcru gaps [n]` | Questions where AI names a competitor and not you, worst first |
| `fulcru write <promptId>` | Writes the page that closes one gap; Markdown to stdout |
| `fulcru publish <pageId> <url>` | Marks it live and snapshots the baseline to measure from |
| `fulcru delta` | What your published pages actually did |
| `fulcru report [section]` | `overview`, `competitors`, `sources`, `mentions`, `prompts` |

Add `--json` to any command for the raw payload.

## Built for agents

Output is terse lines, not JSON blobs, because the caller is usually an LLM and
its context is the scarce resource. `fulcru gaps` costs an agent about 50 tokens;
the same data as raw API JSON costs about 800. `fulcru write` sends the Markdown
to stdout and everything else to stderr, so `fulcru write <id> > page.md` gives a
clean file.

## MCP

Two ways to wire the five Fulcru tools into an agent.

**Remote (hosted).** Point any MCP client at the hosted endpoint with your token:

```json
{
  "mcpServers": {
    "fulcru": {
      "url": "https://little-orca-977.convex.site/mcp",
      "headers": { "Authorization": "Bearer pk_..." }
    }
  }
}
```

**Local (stdio).** For hosts that prefer a subprocess, this package ships a stdio
MCP server that proxies to the hosted endpoint:

```json
{
  "mcpServers": {
    "fulcru": {
      "command": "npx",
      "args": ["-y", "fulcru", "fulcru-mcp"],
      "env": { "FULCRU_TOKEN": "pk_..." }
    }
  }
}
```

Tools: `fulcru_gaps`, `fulcru_write_page`, `fulcru_publish_page`, `fulcru_delta`,
`fulcru_visibility`.

## Skill

The [`skills/fulcru`](skills/fulcru/SKILL.md) skill runs the whole playbook using
nothing but web access — audit a domain, find the gaps, write the page, re-measure
— with no account and no token. Install it into an agent that supports skills:

```bash
# Claude / OpenClaw
npx skills add gsmmediaro/fulcru
# Hermes
hermes skills install <path-or-registry>
```

The CLI and MCP above are what you use when you want it measured **continuously**
across every engine, with the before/after delta tracked for you.

## Configuration

| Env var | Required | Default | Purpose |
|---|---|---|---|
| `FULCRU_TOKEN` | for the CLI + local MCP | — | Your account token (Settings -> Integrations) |
| `FULCRU_ENDPOINT` | no | `https://little-orca-977.convex.site/mcp` | Point at a self-hosted or custom-domain endpoint |

No secrets are baked into this repo. The token is read from the environment only.

## Self-hosting

The skill needs nothing. The CLI and MCP need a Fulcru account for the continuous,
measured loop; point `FULCRU_ENDPOINT` at your own instance if you run one.

A Docker image is provided:

```bash
docker build -t fulcru .
docker run --rm -e FULCRU_TOKEN=pk_... fulcru gaps
```

## Contributing

Issues and PRs welcome. The tool logic lives in the hosted service; this repo is
the CLI, the stdio MCP proxy, and the skill. If AI names a competitor instead of
you, open an issue with the question — that is exactly the gap this is built to
close.

If this is useful, a ⭐ genuinely helps.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
