# Fulcru

Time-tracking, leverage measurement, and billing for AI-coding agencies. Bill the leverage.

Fulcru runs in your AI coding tools (Claude Code, Codex, OpenCode, Cursor, etc.) over the Model Context Protocol (MCP). Every agent session is automatically logged, priced from real active time and token cost, and rolled up into client-ready invoices.

## What's in the box

- **MCP server** at `/api/mcp` that any MCP-capable agent can connect to. Tools cover starting and ending billable runs, importing historical Claude Code or Codex JSONL transcripts, manual time entries, expenses, invoices, approvals.
- **Multi-tenant web app** with Google OAuth (and email/password via Better Auth), per-user clients, projects, skills, runs, expenses, invoices, settings.
- **Effort-aware pricing**: the `time_only` mode supports an active-time multiplier plus optional weights for change category, run difficulty, and post-hoc quality confidence. The `time_plus_tokens` and `baseline` modes are also available.
- **Subscription cost amortization**: tell Fulcru what you pay Anthropic or OpenAI per month and it allocates that cost across clients by their share of active time so margins are honest.
- **Stop hook** for Claude Code that auto-submits every session via the MCP API. See `scripts/fulcru-stop-hook.mjs`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Neon Postgres (serverless driver)
- Better Auth for sessions (Google OAuth + email/password)
- Tailwind 4 with AlignUI-style design tokens
- Be Vietnam Pro

## Quick start (local)

### 1. Prereqs

- Node 20.9+
- A Postgres database. Easiest is a free [Neon](https://neon.tech) project.
- A Google OAuth client (optional, you can also use email/password). [Console](https://console.cloud.google.com/apis/credentials)

### 2. Clone and install

```sh
git clone https://github.com/<your-fork>/fulcru.git
cd fulcru
npm install
```

### 3. Environment

Copy the template and fill in:

```sh
cp .env.example .env.local
```

Required variables:

| Variable               | Notes                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres pooled connection string with `?sslmode=require`            |
| `BETTER_AUTH_SECRET`   | 32 bytes hex. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BETTER_AUTH_URL`      | `http://localhost:3000` for dev, prod URL for prod                   |
| `NEXT_PUBLIC_APP_URL`  | Same as above                                                        |
| `GOOGLE_CLIENT_ID`     | Optional, only if you want Google sign-in                            |
| `GOOGLE_CLIENT_SECRET` | Optional                                                             |
| `BLOB_READ_WRITE_TOKEN` | Optional, only if you want receipt uploads (uses Vercel Blob)       |

### 4. Database schema

The schema lives in the codebase as Postgres SQL. The simplest path is to run the app once with a fresh database, the first request creates the tables via migrations baked into the Better Auth + store layer. If you want a cleaner bootstrap, dump the schema with `pg_dump --schema-only` from a working instance.

### 5. Run the dev server

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and walk through onboarding. You will land at `/agency`.

## Connecting an AI agent

Fulcru is a remote MCP server. Generate an API key under `/agency/settings`, then connect from your tool of choice.

### Claude Code

```sh
claude mcp add --transport http fulcru http://localhost:3000/api/mcp \
  --header "Authorization: Bearer <your-fcr_-key>"
```

### Codex

```sh
$env:FULCRU_TOKEN = "<your-fcr_-key>"     # PowerShell
codex mcp add fulcru --url http://localhost:3000/api/mcp \
  --bearer-token-env-var FULCRU_TOKEN
```

### Anything else

Most MCP clients accept the same JSON config:

```json
{
  "mcpServers": {
    "fulcru": {
      "url": "http://localhost:3000/api/mcp",
      "headers": { "Authorization": "Bearer <your-fcr_-key>" }
    }
  }
}
```

## Auto-logging Claude Code sessions

Drop the Stop hook into `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node /absolute/path/to/scripts/fulcru-stop-hook.mjs"
      }]
    }]
  },
  "env": {
    "FULCRU_API_KEY": "<your-fcr_-key>",
    "FULCRU_BASE_URL": "https://your-fulcru.example.com"
  }
}
```

Every session that ends with at least 60 seconds of active time gets posted via `submit_session_data` and shows up under the run's auto-routed client and project (or in the Inbox if no `cwd` mapping exists yet).

## Deploying

`DEPLOY.md` covers Railway end-to-end. Vercel works too, the only deploy requirement is a Postgres connection plus the env vars listed above.

## Repository layout

```
app/                     Next.js App Router
  agency/                authenticated routes (clients, runs, invoices, ...)
  api/agency/            REST API for the web client
  api/mcp/route.ts       MCP server (JSON-RPC over HTTP)
  onboarding/            first-run wizard
components/agency/       UI for runs, invoices, expenses, settings
components/layout/       app shell, sidebar, topbar
lib/agency/              store (SQL), session importers, pricing, scoring
lib/i18n/                English + Romanian dictionaries
scripts/
  fulcru-stop-hook.mjs   Claude Code Stop hook
  recompute-billable.mjs admin: rerun the billable formula for one user
  recompute-cost-usd.mjs admin: backfill token costs from stored token counts
```

## License

MIT, see `LICENSE`.

## Contributing

Issues and PRs welcome. Before opening a PR, please:

- Run `npm run lint` and `npm test`
- Avoid em or en dashes in copy, use commas, hyphens, or split sentences
- Keep new dependencies to a minimum, this repo aims to stay lean
