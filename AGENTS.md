# Winning Is A Bug (Effect-TS port)

Effect-TS + Foldkit port of VictorTaelin's `winning_is_a_bug` (Bend).
Monorepo: Bun + Turbo, Effect-TS, Foldkit + foldcn, TypeScript.
Bun + vitest are dev/test tools only. Production is the browser (static
`apps/web/dist`, Pages-compatible) plus one Cloudflare Worker — no
Node/bun runtime in prod.
Upstream sources (`reference/winning_is_a_bug/`, `reference/dearly/`) are read-only references.

## Commands

| Task         | Command                              | Notes                              |
| ------------ | ------------------------------------ | ---------------------------------- |
| Build all    | `bun run build`                      | Compiles domain → server → web     |
| Type check   | `bun run check`                      | `tsc --noEmit` per package (turbo) |
| Lint         | `bun run lint`                       | oxlint `apps packages` + foldkit rules |
| Format       | `bun run fmt`                        | oxfmt                              |
| Format check | `bun run fmt:check`                  | CI gate                            |
| Test all     | `bun run test`                       | vitest per package, builds first   |
| Game server  | `cd apps/server && bun run worker:dev` | alchemy local worker + assets (login) |
| Deploy       | `cd apps/server && bun run deploy`   | alchemy → Cloudflare (see DEPLOY.md) |
| Web dev      | `cd apps/web && bun run dev`         | vite + foldkit HMR, proxies /api   |
| Single test  | `cd packages/domain && bun vitest run -t "name"` | Per-package vitest     |

Fresh clone order: `bun install && bun run build && bun run check && bun run test`.

## Architecture

```
packages/domain → Game rules (Schema), Laws (human claims), Cert (machine proofs)
apps/server     → Effect HttpRouter game API (grid/state/apply/cert), Node runtime
apps/web        → Foldkit app (Model/Messages/update/Commands) + foldcn UI
```

Flow: Browser → same-origin `/api` (vite proxy in dev) → `apps/server` → pure `packages/domain`. The browser never decides: every move goes through `Game.step`/`Game.apply`, locally or via `POST /api/apply`.

The law: for any move sequence, `apply(init, moves)` is never won. `bun run test` in `packages/domain` is the whole verification (computed `chk_all` tables + reachable-set induction + property tests).

## Code Conventions

### TypeScript

- Strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- ESM only (`"type": "module"`), target ES2022, `module: Preserve`
- `import type` for type-only imports (enforced by verbatimModuleSyntax)
- Prefer `ReadonlyArray<T>` over `T[]` in interfaces
- Barrel imports from `@wib/domain` (`import { Game } from "@wib/domain"`)

### Effect-TS Patterns

- **Errors**: `Schema.TaggedError` with `_tag` discriminant and `message` field
- **Schemas**: `Schema.Struct`, `Schema.Class`, `Schema.Union`, `Schema.Literals`. Export both schema and inferred type
- **Messages**: `Schema.TaggedClass`, constructed with `new`, matched with `Match.tagsExhaustive`
- **Options**: `Option.Option<T>` for nullable returns. Use `Option.match`, not null checks
- **Config**: `Config.*` with defaults (`Config.number("PORT").pipe(Config.withDefault(3000))`)
- **Collections**: `Arr`/`Str` combinators and `pipe`, never native loops/sort for domain logic
- Server effects: typed error channel for recoverable failures, `Effect.die` only for invariants

### Foldkit UI (apps/web only — no hand-rolled components)

- One `Model` (Schema), fact-named `Message`s, one exhaustive `update`, side effects as `Command`s
- `main.ts` holds pure definitions; `entry.ts` boots the runtime (keeps tests side-effect free)
- Canvas board: declarative `Canvas.view` shapes (pure function of model)
- DOM events: `fromEventFilterMap` streams attached via `h.OnMount`
- Primitives: foldcn (`button`, `badge`, `kbd`, `dialog`, `toast` submodels); layout in Tailwind classes
- Browser-only SPA (no SSR/prerender): `document`/`window` in app code is intended; `no-nonportable-server-globals` stays off until server rendering exists
- Game rules never live in UI code — UI imports `@wib/domain` only

### Naming

- Files: `camelCase.ts` for modules; Schema export + type export pair
- Error classes: `PascalCase` matching their `_tag`
- Submodel messages wrapped as `Got<Child>Message`; child commands lifted with `Command.mapMessages`

### Testing

- `@effect/vitest`: `it.live` default for effects; plain `vitest` for pure functions
- Property tests via `fast-check` for sequence properties
- Server tests: `NodeHttpServer.layerTest` on ephemeral ports, real layers, no mocks
- Web unit tests: pure `update` transitions (foldkit `main.ts` stays side-effect free so tests import it directly)

### Linting & Formatting

- oxlint + oxfmt (root configs), incl. `@foldkit/oxlint-plugin` rules
- `bun run lint` / `bun run fmt` at root
- husky pre-commit: `bun run check` + lint-staged (`oxlint --fix`, `oxfmt --write` on `*.ts`)

## Skills

Inventory first, every session: run `harness_skill_stats`, list
`.opencode/skills/`, and note what is already loaded before loading more.
Main context stays lean — a skill lives in the main session only if the
task's core work needs it; everything else goes to a subagent carrying
that skill.

| Task | Load directly | Subagent only |
|---|---|---|
| Effect Schema / domain models | `effect-schema-v4`, `effect-domain-modeling` | — |
| Tests | `effect-testing` | — |
| HTTP server / client | `effect-http-server`, `effect-http-client` | — |
| Errors | `effect-error-handling` | — |
| Any UI work | `foldkit-verified-ui` (project skill) | — |
| One-off domains (sql, mcp, rpc, workflow, …) | — | subagent with that skill |
| Codebase exploration | — | `explore` subagent |
| Independent reasoning audit | — | `effect_harness_critic` (read-only) |

Rules:

- The harness skill-gate blocks Effect `write`/`edit` until 4+ `effect-*`
  skills are credited, and it credits `read`-tool loads of the skill files
  (skill-tool content alone does not count). Batch-read the needed
  `SKILL.md` files up front; confirm with `harness_skill_stats`.
- Skill files live under the harness package assets; resolve the current
  path dynamically, e.g.
  `find /home/vscode/.cache/opencode -type d -path "*module-typescript/assets/skills"`.
- Never load speculative skills "just in case". If a need appears mid-task,
  load then — or delegate to a subagent when the output is large and only a
  digest is needed back.

## Project Language

- **Board** (not map/screen), **Move** (Up/Down/Left/Right/Grab), **Grab** (not collect), **Law** (the human claim), **Certificate** (the machine proof), **Toast** (transient notice), **Proof dialog** (win modal)
