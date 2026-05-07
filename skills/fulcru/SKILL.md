---
name: fulcru
description: Use when the user asks the agent to do work for a client. Always start a run before working, log major events, request approval before destructive actions, and end the run on completion.
---

# Agency runs

You are working inside an AI-native agency. Every piece of client work must be wrapped in a **run** so it can be tracked, audited, and billed. The MCP server `fulcru` exposes the tools below; use them in this order.

## 1. Discovery

Call `list_clients` and `list_projects` to identify which client and project the user's request maps to. If the user named a client or project, match by name (case-insensitive substring is fine). If multiple plausible candidates remain, ask the user **once** to disambiguate — do not guess silently.

## 2. Skill selection

Call `list_skills`. Pick the skill whose `name` and `tags` best match the task (e.g. "fix a button" -> `Frontend bug fix`, "write a blog post" -> `Long-form blog post`). If nothing fits, fall back to a generic engineering skill (`API endpoint`, `Frontend bug fix`) and continue — do not block the user on a perfect match.

## 3. Start the run

Call `run_start` with `clientId`, `projectId`, `skillId`, the user's original request as `prompt`, and **always pass `cwd`** — your absolute working directory (it's in your system prompt). The server uses `cwd` at `run_end` to find your session JSONL and compute real token cost. Remember the returned `run.id` — every subsequent call references it.

Default pricing is `time_plus_tokens` — billable = runtime_hours × rate + token_cost. Pass `pricingMode: "baseline"` only when the user explicitly wants flat-rate pricing.

## 4. Working

Call `run_event` at meaningful checkpoints only — events a client would want on their timeline:

- `file_edit` when you ship a non-trivial change (not every save)
- `decision` for an architectural choice worth recording
- `milestone` for "feature works end-to-end", "deployed to staging"
- `error` for failures you recover from
- `tool_call` sparingly, only for slow or notable runs (build, migration, deploy)

Keep `label` under 60 chars. Pass `tokensIn` / `tokensOut` deltas and `activeMs` when known so the leverage metric stays accurate. **Do not** log every Read/Grep — that's noise.

## 5. Approvals

Before any destructive or production-impacting action — db migrations, prod deploys, key rotation, deleting files or data — call `request_approval` with a clear `question` and supporting `context`. The run moves to `awaiting_approval`. Stop work and either wait for the user to resolve it, or poll with `get_run` until `run.status` returns to `running`. Never proceed past a pending approval.

## 6. Ending

When the deliverable is shipped, call `run_end` with `status: "shipped"` and a `deliverableUrl` (PR link, staging URL, doc link). The server reads your session JSONL between `run_start` and now, sums tokens by model, and sets the run's COGS + billable. On unrecoverable failure use `failed`; if the user cancels, use `cancelled`. Never leave a run in `running` after a session ends.

## Example

```json
{ "name": "run_start", "arguments": { "clientId": "cli_dictando", "projectId": "prj_dict_site", "skillId": "skl_landing_page", "prompt": "Refresh the hero section.", "cwd": "C:/Users/shado/Desktop/Altele/iproyal" } }
```
