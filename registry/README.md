# Registry submissions

How to list the Fulcru agent surface in the places agents look. Do these the same
day the repo goes public, then let it breathe 1-2 weeks before the launch push.

## Important: the hosted MCP is auth-gated

Fulcru's MCP is a **remote** server behind a Bearer token, so directory scanners
cannot introspect the tools on their own. Two fixes, already prepared here:

- `server.json` — the manifest for the **official MCP Registry**.
- `server-card.json` — a static tool card. **This must be served by the app** at
  `https://<app>/.well-known/mcp/server-card.json` so scanners (Smithery, Glama)
  can read the tool list without a token. Add a route in the Convex app that
  returns this JSON.

## 1. Official MCP Registry (registry.modelcontextprotocol.io)

Glama and others are supersets of this, so it is the highest-leverage listing.

```bash
# one-time: install the publisher
npm i -g @modelcontextprotocol/publisher   # or the mcp-publisher binary
mcp-publisher login github                 # auth as gsmmediaro
mcp-publisher publish ./registry/server.json
```

The npm package `fulcru` must be published first (its name is referenced in
`server.json` under packages[].identifier).

## 2. Glama (glama.ai)

Free, auto-indexing. Submit the GitHub repo URL at glama.ai (Building an MCP
server -> "List your server for free"). It rebuilds and scores automatically.

## 3. Smithery (smithery.ai)

```bash
smithery mcp publish "https://little-orca-977.convex.site/mcp" -n gsmmediaro/fulcru \
  --config-schema '{"type":"object","properties":{"token":{"type":"string"}},"required":["token"]}'
```

Or use smithery.ai/new with the HTTPS URL. If the scan 403s on the auth wall, it
falls back to the served `server-card.json`.

## 4. mcp.so

Submit the GitHub repo / server URL through the form at mcp.so.

## 5. Hermes (Nous Research) — skill + MCP

The skill (`skills/fulcru/SKILL.md`) is publish-ready.

```bash
# publish the skill to the Hermes Skills Hub
hermes skills publish ./skills/fulcru

# register the MCP in Hermes config.yaml:
#   mcp_servers:
#     fulcru:
#       command: "npx"
#       args: ["-y", "fulcru", "fulcru-mcp"]
#       env:
#         FULCRU_TOKEN: "pk_..."
```

Also list on the community Hermes Registry (registry.hermesone.org) and, for
OpenClaw, install the skill with `npx skills add gsmmediaro/fulcru-agent`.

## Awesome lists

Open PRs adding Fulcru to `awesome-mcp-servers` and any `awesome-aeo` /
`awesome-geo` lists — the agent-era equivalent of GitHub trending.
