# Winning Is A Bug — Effect-TS + Foldkit port

A tiny game with one rule: grab the flag and you win. And one feature: it ships with a **machine-checked proof** that you can't — this time in **Effect-TS + TypeScript**, with a **Foldkit + foldcn** website.

Ported from VictorTaelin's [`winning_is_a_bug`](https://github.com/VictorTaelin/winning_is_a_bug) (Bend);
the originals are vendored here as read-only references (`reference/winning_is_a_bug/`,
`reference/dearly/`).
UI architecture, tooling and code style mirror [Dearly](https://github.com/SyahrulBhudiF/Dearly)
(Effect + Foldkit + Bun + Turbo): `apps/*` + `packages/*` monorepo, strict TS,
oxlint/oxfmt, per-package `check`/`test`/`build` behind turbo.

## The law

> For any sequence of moves, applying it to the initial game state doesn't result in victory.

TypeScript has no `forall`, so the proof is discharged three ways covering the whole input space:

1. **Computed certificate** — `chkAll` enumerates all 96 cells × 5 moves and must evaluate to `true`.
2. **Reachable-set induction** — BFS from `init()` visits every reachable state and asserts each is safe and unwon; any move sequence lands in this set.
3. **Property tests** — random sequences plus `effect_harness_verify` + `effect_harness_critic` gates.

If you ever see the win screen, the checker is broken. File a bug.

## Layout (Dearly-shaped monorepo)

```
packages/domain → Game rules (Schema), Laws (human claims), Cert (machine proofs)
apps/server     → Effect HttpRouter game API (grid/state/apply/cert), Node runtime
apps/web        → Foldkit app (Model/Messages/update/Commands) + foldcn UI
```

`apps/web` uses **only foldkit + foldcn** for UI: declarative `Canvas.view` board, foldcn `button`/`badge`/`kbd`/`dialog`/`toast`, keyboard + frame streams via `h.OnMount`. No hand-rolled components. Game rules never live in UI code.

## foldcn setup (already done, for reference)

Prerequisite is a Foldkit + Tailwind v4 project whose CSS entry contains
`@import "tailwindcss";` (`apps/web/src/index.css`). Registry and components
were added with the shadcn CLI (components land copy-paste in
`apps/web/src/components/ui`, aliases `@/*`):

```sh
# components.json already registers the namespace; base + components:
npx shadcn@latest add @foldcn/foldcn
npx shadcn@latest add @foldcn/button @foldcn/dialog @foldcn/toast @foldcn/kbd @foldcn/badge
```

Keep `effect@4.0.0-rc.112` + `foldkit@0.158` pinned afterwards — the CLI may
suggest other versions. Docs: https://foldcn.elianiva.com/llms.txt.

## Verification status

- `bun run check` (turbo, per-package `tsc --noEmit`): green, incl. root config.
- `bun run test`: 28 green — domain induction + property tests, server
  `layerTest` endpoints, web pure-`update` tests.
- `bun run lint` (oxlint + foldkit rules): 0 errors; `bun run fmt:check`: clean.
- `effect_harness_verify`: deterministic checks pass (`ts-typecheck`
  passed); one intentional exception (`node:http` factory required by
  `NodeHttpServer.layer`); skill-ledger evidence stays empty by design here.
- `effect_harness_critic`: unavailable in this restricted plugin context
  (explicit, never a silent pass).

## Run

```sh
bun install
bun run build && bun run check && bun run test
cd apps/web && bun run dev         # site on http://localhost:5173, local rules, no server needed
cd apps/server && bun run worker:dev  # API + assets as a local worker (login)
```

Production is static files + one Worker (no Node/bun at runtime):
`apps/web/dist` is plain static output (also Pages-compatible),
`apps/server/src/worker.ts` serves the API. Deploy with alchemy (see below).

Website modes: default plays the local Effect core; `?api=http://localhost:3000` plays the server. No credentials anywhere — including the local opencode2 service (`opencode2 api get /api/plugin` shows `opencode.effect-harness`).

See `AGENTS.md` for commands, architecture, and conventions.
See `DEPLOY.md` for Cloudflare deployment (`bunx wrangler login`, then `bun run deploy`).
