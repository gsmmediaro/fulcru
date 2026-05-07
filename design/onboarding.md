# Onboarding — Design Spec

> Four-step wizard shown immediately after a user finishes Google OAuth and before they reach `/agency`. Structure copied from Clockify (4 steps, stepper, Back / Next / Done). Visual language is Fulcra (dark, teal brand, Be Vietnam Pro, no AI-slop blue).

---

## 1. Purpose

Capture five things on first sign-in so the workspace is useful from day zero, and we have segmentation data for outreach:

1. **Agency size** — drives default invoice templates, hint about team seats
2. **Concurrent clients** — drives whether we surface the multi-client billing roll-up
3. **Primary service** — drives which seed Skills we offer in the catalog
4. **Why Fulcra** — drives which surface we land them on after onboarding
5. **Attribution** — feeds the founder analytics dashboard, not surfaced to user

Onboarding is single-shot: completion writes `onboarding_state.completed_at` and the wizard never re-appears.

---

## 2. Route & gating

```
/auth/google           → Google OAuth start (Stack Auth)
/auth/callback         → OAuth handler, creates User, redirects:
                           ├─ first-time login           → /onboarding
                           └─ returning user             → /agency
/onboarding            → wizard (this spec)
/onboarding → /agency  → on Done, write onboarding_state.completed_at, redirect
```

Middleware (`middleware.ts`) enforces:

| Path                | Unauth user                  | Auth + onboarding incomplete | Auth + onboarding complete |
| ------------------- | ---------------------------- | ---------------------------- | -------------------------- |
| `/`                 | landing                      | landing                      | landing                    |
| `/agency/*`         | redirect to `/auth/sign-in`  | redirect to `/onboarding`    | allowed                    |
| `/onboarding`       | redirect to `/auth/sign-in`  | allowed                      | redirect to `/agency`      |
| `/api/agency/*`     | 401                          | 200 (read-only) / 403 (write)| 200                        |
| `/api/mcp`          | 401 (no Bearer)              | 401 if key not provisioned   | 200                        |

Onboarding is **mandatory before any write** to keep server logic from branching on partial state.

---

## 3. Layout — page chrome

The wizard does **not** use the AppShell (no sidebar, no topbar). It runs in a dedicated layout:

```
┌─────────────────────────────────────────────────────────────┐
│  Logo (top-left)                          User avatar (TR)  │  ← 64px
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ┌─────────────┐                      │
│                        │             │                      │
│                        │  Wizard     │                      │
│                        │  card       │  ← 480 wide          │
│                        │             │                      │
│                        └─────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
   bg = --color-bg-app                  (no animated bg blobs)
```

- App background `--color-bg-app` (`#1c1c1c`).
- Card centered viewport-wise, **vertical offset 18vh from top** (not pure-center — feels grounded, not floating).
- Logo links back to `/` (signed-out user).
- Avatar in top-right shows current Google user; clicking opens "Sign out" popover.

**No** decorative cloud-blob background like Clockify. Our background is the dark canvas, full stop. If we want texture later, it's a single subtle dot grid via `background-image`, not illustrated shapes.

---

## 4. Wizard card

```
┌──────────────────────────────────────────────────────────────┐
│  ─────────────●─────○──────────○──────────○──────            │  ← progress rail
│   Pasul 1       Pasul 2     Pasul 3     Pasul 4              │  ← labels (label-xs, soft)
│                                                              │
│  Cât de mare e agenția ta?                                   │  ← headline-xs, strong
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │ ○ Solo   │ │ ○ 2–5    │ │ ○ 6–20   │  ← pill-chips        │
│  └──────────┘ └──────────┘ └──────────┘                      │
│                                                              │
│  Cu câți clienți lucrezi simultan?                           │
│  …                                                           │
│                                                              │
│ ─────────────────────────────────────────────────────────── │  ← divider
│  ‹ Înapoi                                Continuă →          │  ← footer
└──────────────────────────────────────────────────────────────┘
   width 480px, radius 12px, ring 1px stroke-soft, bg surface
```

### Token mapping

| Element            | Token                                       |
| ------------------ | ------------------------------------------- |
| Card bg            | `--color-bg-surface` (`#232323`)            |
| Card ring          | `1px var(--color-stroke-soft)`              |
| Card radius        | `--radius-12`                               |
| Card padding       | `32px 28px` (header), `8px 28px 24px` (body)|
| Card max-w         | `480px` desktop, full-width with `16px` gutter ≤ `--breakpoint-sm` |
| Headline           | `tp-headline-xs` (18/24, weight 600)        |
| Step labels        | `tp-label-xs` (11/14, soft)                 |
| Body copy          | `tp-body-s` (14/20)                         |
| Pill chip text     | `tp-label-m` (14/20, weight 600)            |
| Active pill ring   | `2px var(--color-brand-400)`                |
| Active pill fill   | `color-mix(in oklab, var(--color-brand-400) 14%, transparent)` |
| Inactive pill bg   | `--color-bg-surface-elevated`               |
| Inactive pill ring | `1px var(--color-stroke-soft)`              |
| Pill radius        | `--radius-8` (slightly squarer than Clockify's full pill — Fulcra is more architectural) |
| Footer divider     | `1px var(--color-stroke-soft)`              |
| Animation          | `modal-rise` on card mount, `count-in` on step swap |

### What we explicitly do NOT do

- **No** light-blue Clockify chrome.
- **No** rounded full-pill chips with 2-tone backgrounds. Our chips are soft rectangles with a teal accent ring on selection.
- **No** "STEP 1" / "STEP 2" all-caps with underline ticker. Our stepper is a single-line progress rail with dot heads, sized 4px high with 8px filled dots.
- **No** background blobs.
- **No** giant illustrations next to the question.
- **No** modal — this is a full page. The card sits on the viewport, not over a backdrop.

---

## 5. Stepper component

### Visual

```
        4px rail · stroke-soft, 100% width
        ┌─────────────●─────●─────○─────○─┐
        │             ↑                   │
        │             current step (filled circle, brand-400, 10px)
        │     past step (filled circle, brand-300, 8px, ✓ inside)
        │                              future step (hollow circle, stroke-strong, 8px)
```

### Behavior

- Click a past step → jumps back, preserves any forward state in memory (no destructive re-set).
- Future steps are **not** clickable until reached linearly (mirrors Clockify).
- `aria-current="step"` on the active dot.
- Mobile (≤ 480px): hide labels, keep dots. Card title takes role of "you are here."

---

## 6. Pill-chip component

A new shared component: `components/ui/chip.tsx`. Used across all four steps.

### Props

```ts
type ChipProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** When multi-select, render a check icon instead of a radio dot */
  multi?: boolean;
};
```

### Visual (single-select, default)

```
unselected:           selected:
┌─────────────┐      ┌─────────────┐
│ ○  Solo     │      │ ●  Solo     │   ← brand-400 filled circle
└─────────────┘      └─────────────┘
   stroke-soft         brand-400 ring 2px + tinted bg
```

### Sizing

- Height `36px`, padding `8px 14px`.
- Gap between dot and label `10px`.
- Border-radius `--radius-8`.
- Wrap horizontally in flex with `gap: 8px row 8px column`.

### Multi-select variant

Replaces the radio dot with a 16px square check (filled brand-400 + white check icon). Single-select uses the radio dot. **No** ban-listed `border-left` accent stripes.

---

## 7. Steps — content

### Step 1 — `agency_size`

> **RO**: "Cât de mare e agenția ta?" / **EN**: "How large is your agency?"
> Single-select.

| Value          | Label RO          | Label EN     |
| -------------- | ----------------- | ------------ |
| `solo`         | Doar eu           | Solo         |
| `s_2_5`        | 2 – 5             | 2 – 5        |
| `s_6_20`       | 6 – 20            | 6 – 20       |
| `s_21_50`      | 21 – 50           | 21 – 50      |
| `s_51_plus`    | 51+               | 51+          |

> **RO**: "Cu câți clienți lucrezi simultan?" / **EN**: "How many clients do you serve at once?"
> Single-select. Same row of chips, second sub-question.

| Value     | Label   |
| --------- | ------- |
| `c_1`     | 1       |
| `c_2_5`   | 2 – 5   |
| `c_6_15`  | 6 – 15  |
| `c_16_50` | 16 – 50 |
| `c_50_plus` | 50+   |

**Validation**: both required to enable Continue.

### Step 2 — `service_category`

> **RO**: "Care e principalul serviciu pe care îl livrezi?" / **EN**: "What's the main service you deliver?"
> Single-select.

| Value          | Label RO              | Label EN              |
| -------------- | --------------------- | --------------------- |
| `web_dev`      | Dezvoltare web        | Web development       |
| `design`       | Design / branding     | Design / branding     |
| `content`      | Conținut & SEO        | Content & SEO         |
| `marketing`    | Marketing & ads       | Marketing & ads       |
| `data`         | Date & automatizare   | Data & automation     |
| `consulting`   | Consultanță           | Consulting            |
| `ops`          | Operațiuni & DevOps   | Ops & DevOps          |
| `other`        | Altceva               | Something else        |

If `other` selected → **inline reveal** of a single-line input below the chip row (`Spune-ne în 2-3 cuvinte`). Stored in `service_category_other`.

### Step 3 — `use_cases`

> **RO**: "Pentru ce folosești Fulcra?" / **EN**: "What will you use Fulcra for?"
> **Multi-select** (the only multi-select step). At least one required.

| Value           | Label RO                                | Label EN                              |
| --------------- | --------------------------------------- | ------------------------------------- |
| `track_runs`    | Vreau să văd costul rulărilor AI        | Track AI run cost                     |
| `bill_clients`  | Facturez clienții pentru munca AI       | Bill clients for AI work              |
| `approvals`     | Vreau aprobări înainte ca AI-ul să livreze | Manage approvals before AI ships    |
| `team_visibility` | Vreau vizibilitate pentru echipa mea | Team visibility                       |
| `leverage`      | Vreau să măsor pârghia AI vs ore reale  | Measure AI leverage vs hours          |

Each chip uses the multi-select check icon (square, not radio dot).

### Step 4 — `attribution`

> **RO**: "Cum ai auzit de noi?" / **EN**: "How did you hear about us?"
> Single-select.

| Value         | Label RO                          | Label EN                          |
| ------------- | --------------------------------- | --------------------------------- |
| `search`      | Google / Bing                     | Search engine                     |
| `youtube`     | YouTube                           | YouTube                           |
| `twitter`     | X (ex Twitter)                    | X (ex Twitter)                    |
| `linkedin`    | LinkedIn                          | LinkedIn                          |
| `reddit`      | Reddit                            | Reddit                            |
| `tiktok`      | TikTok                            | TikTok                            |
| `friend`      | De la un prieten / coleg          | Friend / colleague                |
| `claude_code` | Lista MCP din Claude Code         | Claude Code MCP listing           |
| `other`       | Altceva                           | Other                             |

`other` → reveals input as in step 2.

---

## 8. Footer / navigation

```
┌───────────────────────────────────────────────────┐
│ ‹ Înapoi                       Continuă →         │
└───────────────────────────────────────────────────┘
   ghost button                  primary-orange button
   (hidden on step 1)            (label = "Termină" on step 4)
```

- Continue is **disabled** until validation passes for current step (greyed out, not hidden — we want users to see the gate).
- Continue: orange primary button, h `40px`, padding `0 16px`, radius `--radius-8`.
- Back: ghost button, no border, `--color-text-soft`, hover `--color-text-strong`.
- Right-arrow icon trailing on Continue, left-arrow leading on Back.
- On step 4 the label changes to **"Termină"** / **"Finish"** and the icon swaps to a check.

### Keyboard

- `Enter` on the card → equivalent to clicking Continue (if enabled).
- `Esc` → no-op (you can't escape onboarding without finishing or signing out).
- `Tab` order: chips top-to-bottom, then Back, then Continue.

---

## 9. State & persistence

### Client state

Single React reducer in `app/onboarding/state.ts`:

```ts
type OnboardingState = {
  step: 1 | 2 | 3 | 4;
  agencySize?: AgencySize;
  concurrentClients?: ConcurrentClients;
  serviceCategory?: ServiceCategory;
  serviceCategoryOther?: string;
  useCases: UseCase[];          // multi-select
  attribution?: Attribution;
  attributionOther?: string;
};
```

State lives only in the wizard component — we don't persist partial answers. If the user closes the tab mid-flow, they restart from step 1 next session. (This is what Clockify does and it's the right call: 4 steps is < 60s, partial-state recovery isn't worth the complexity.)

### Server persistence

On Done, `POST /api/onboarding` with the full payload. Server validates and writes:

```sql
INSERT INTO onboarding_state (
  user_id, agency_size, concurrent_clients, service_category,
  service_category_other, use_cases, attribution, attribution_other,
  completed_at
) VALUES (...);
```

Then it ALSO seeds:

- 1 default Skill matching `service_category` (e.g. for `web_dev` → "Landing page redesign", baseline 6h, modifier 1.0).
- 1 default Client placeholder named "Primul client" with the user's locale's currency rate filled in.
- A welcome Run is **NOT** seeded — empty state on `/agency/runs` is part of the experience.

Response: `{ ok: true, redirect: "/agency" }`. Client follows the redirect with `router.push` + `router.refresh()` to flush the auth state.

---

## 10. Animation budget

| When                 | What                                                            |
| -------------------- | --------------------------------------------------------------- |
| Card mount           | `modal-rise` (220ms, ease-out-expo)                             |
| Step transition      | Outgoing step: `opacity 0` + `translateY(-6px)` over 160ms      |
|                      | Incoming step: `opacity 1` + `translateY(0)` over 220ms, 60ms delay |
| Chip selection       | Background and ring transition 140ms, ease-out-quart            |
| Continue press       | `transform: scale(0.98)` while held                             |
| Done                 | `count-in` on the words "Bun venit, {name}" full-screen for 800ms before redirecting |

All wrapped in `prefers-reduced-motion: reduce` media query — disabled by globals.css already.

---

## 11. Accessibility

- Focus ring on chips: `2px var(--color-brand-400)` outside the chip (offset 2px), already covered by `.focus-ring`.
- Each chip is `role="radio"` (single-select group) or `role="checkbox"` (multi-select group).
- The chip group has `role="radiogroup"` / `role="group"` with `aria-labelledby` referencing the question heading.
- Stepper dots have `aria-label="Pasul {n} din 4"` and the current one is `aria-current="step"`.
- Continue button has `aria-disabled` (not `disabled`), so screen readers announce it but don't lose tab order. It still cannot be activated when invalid.
- Color contrast: brand-400 on bg-surface ≥ 7:1, label text on chips ≥ 4.5:1. Verified via OKLCH lightness deltas.

---

## 12. Components to create

| Path                                                      | Status | Purpose                                                |
| --------------------------------------------------------- | ------ | ------------------------------------------------------ |
| `components/ui/chip.tsx`                                  | new    | Pill-chip used by all 4 steps (single + multi variants)|
| `components/onboarding/stepper.tsx`                       | new    | Horizontal progress rail w/ dots                       |
| `components/onboarding/wizard.tsx`                        | new    | Reducer + step orchestration                           |
| `components/onboarding/step-agency-size.tsx`              | new    | Step 1 content                                         |
| `components/onboarding/step-service.tsx`                  | new    | Step 2 content                                         |
| `components/onboarding/step-use-cases.tsx`                | new    | Step 3 content                                         |
| `components/onboarding/step-attribution.tsx`              | new    | Step 4 content                                         |
| `app/onboarding/page.tsx`                                 | new    | Server entry: gate, render wizard                      |
| `app/onboarding/layout.tsx`                               | new    | Standalone layout (no AppShell)                        |
| `app/api/onboarding/route.ts`                             | new    | POST handler that writes state + redirects             |

Existing components reused: `Button`, `Modal` (NOT used — page not modal), `LocaleProvider`, `Logo`.

---

## 13. Database (anchored to the bigger DB plan)

`onboarding_state` table:

```sql
CREATE TABLE onboarding_state (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  agency_size        TEXT NOT NULL,
  concurrent_clients TEXT NOT NULL,
  service_category   TEXT NOT NULL,
  service_category_other TEXT,
  use_cases          TEXT[] NOT NULL,
  attribution        TEXT NOT NULL,
  attribution_other  TEXT,
  completed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The presence of a row in this table is the source of truth for "onboarding done." Middleware checks via a single `SELECT 1 FROM onboarding_state WHERE user_id = $1`. Result is cached on the user's session for the request's lifetime.

---

## 14. Open questions / decisions deferred

- **Skipping**: Should there be a "skip onboarding" escape hatch? **Decision: No.** It's 4 steps, < 60s. Skipping leaves us with worse data and a worse default workspace.
- **Editing later**: Where does a user edit these answers? **Decision: Settings page → Profile section. Out of scope for v1; ship the wizard first.**
- **Multi-language at the wizard layer**: Reuse `useLocale()`. Strings live in `lib/i18n/dict.ts` under `onboarding.*`. RO is the default the user is currently using.
- **Step animation direction**: Forward vs back direction — should they animate differently? **Decision: Yes (forward = slide left, back = slide right), but ship with simple fade first; layer in directional motion in v1.1.**

---

## 15. Build order

1. Stack Auth + Google OAuth (so we have a `user` to onboard).
2. `users` + `onboarding_state` tables in Neon.
3. Middleware gate.
4. `chip.tsx`, `stepper.tsx` primitives.
5. `app/onboarding/{layout,page}.tsx` + four step components.
6. `POST /api/onboarding` + redirect.
7. Locale strings in `lib/i18n/dict.ts`.
8. E2E test: sign in → wizard → all 4 steps → land on `/agency`.

Each step in this list is a checkpoint where we stop, verify visually in browser, then proceed.
