---
name: foldkit-verified-ui
description: Build Foldkit + foldcn UI that is verified beyond what tsc can check. Use when writing Foldkit apps (Model/Messages/update/Commands), wiring foldcn components, proving game/domain laws in TypeScript fast (<1s suites), deploying with Alchemy, or auditing UI work for the failure modes typechecks miss.
---

# Verified Foldkit UI

Typecheck is necessary but not sufficient. This skill lists what `tsc --noEmit`
cannot catch in a Foldkit + Effect-TS codebase, and which check catches each
failure instead. Follow it after every UI change, before claiming anything
renders correctly.

## 0. Ground rules

- Effect version is pinned exact across the repo (`effect`, `@effect/*`,
  `foldkit` peer). The shadcn CLI downgrades Effect — re-pin afterwards.
- Read API from installed `node_modules/*/dist/*.d.ts`, never from an older
  example repo. Installed foldkit 0.158 differs from older examples:
  `{model, commands}` returns, `view(model, h)`, `Command.define` object
  config, `TaggedClass` + `new`.
- No `<style>` in `index.html`. All styling through typed `h.Class(...)` /
  foldcn builders so it is checked, versioned, and bundled. `<html
class="dark">` carries the foldcn dark theme.
- No hand-rolled components: foldcn (`button`, `badge`, `kbd`, `dialog`,
  `toast`, `card`, `separator`) + `foldkit/canvas` + Tailwind utilities.
  Layout divs with Tailwind classes are fine; bespoke buttons/toasts/dialogs
  are not.
- Browser `fetch` inside a Command `execute` is allowed (Dearly precedent):
  decode the body through Schema immediately and map failures to a tagged
  Message. No `HttpClient` layer ceremony for single-shot browser calls.

## 1. Beyond typecheck — failure → check

| #   | Failure (all observed in this repo)                                                | Check that catches it                                                                          |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Dialog panel visible while closed (shell element never rendered)                   | Story/render test asserting closed state shows no panel; screenshot review                     |
| 2   | Wrong theme (foldcn defaults light)                                                | Story test asserting `dark` on root; visual sample                                             |
| 3   | Missing animations (movement snaps)                                                | Behavior-pinning unit tests written from the original's spec first                             |
| 4   | Dead Tailwind classes (`px-(--card-spacing)` never generated)                      | Standard utilities only (project rule); CI grep of built CSS for critical utilities            |
| 5   | Edits that silently never applied                                                  | Assert every replacement; prefer the `edit` tool (confirms replacement)                        |
| 6   | Vacuous proof (reachable set was 1 state, tests green)                             | Assert **both bounds** (`>50` and `≤192`); independent oracle (`POST /api/cert`, curl it)      |
| 7   | Version skew (platform RC mismatch, stale vite-plugin, old vitest, CLI downgrades) | `bun install --frozen-lockfile` in CI; **boot smoke test** (or `layerTest`, no network needed) |
| 8   | Test expectation wrong, code right (tick anti-spike cap)                           | Read the framework docs first (foldkit caps `deltaTime`; `now` advances ≤32ms/frame)           |
| 9   | Deleted-file references, stale lockfiles                                           | `bun run build && check && test` from a clean tree in CI                                       |
| 10  | Text clipped on small viewports
| 11  | No visual proof after a UI change | `agent-browser` loop (global bun install): `open <url>` → `set viewport <w> <h>` → `screenshot` → read the PNG → fix → repeat at 1280 + 390 wide. Close with `close`. Screenshots land in agent-browser tmp; copy what to keep | (foldcn `badge` is `nowrap` + `overflow-hidden` by design) | Wrap rows (`flex-wrap` footer), responsive type (`text-[22px] sm:text-[28px]`); narrow-viewport screenshot review |

Green tests prove nothing about strength. Review every new test with: does it
fail if the implementation is weakened (fewer states, dropped animation,
unwrapped dialog)?

## 2. Foldkit testing (no Playwright)

Foldkit is not Playwright. Test through the architecture:

- **Pure `update` tests** (`vitest`, no DOM): `main.ts` holds definitions,
  `entry.ts` boots the runtime, so tests import `update`/`init` directly.
  Assert transitions, counters, toasts shown, dialog `isOpen`.
- **Story tests** (`foldkit/test`, `foldkit/test/vitest`): replay Messages and
  resolve Commands without running effects — e.g. remote mode answers without
  network. Prefer over e2e for logic.
- **Effect tests** (`@effect/vitest`, `it.live` default): services, layers,
  `NodeHttpServer.layerTest` for HTTP on ephemeral ports.
- **Property tests** (`fast-check`): sequence properties over the domain.
- Reserve real-browser checks for pre-release visual review, not CI logic.

## 3. Fast proofs in TypeScript (<1s suites)

TypeScript cannot express `forall inputs`. When the state space is finite,
prove by exhaustive cases instead — this suite runs in ~70ms:

1. **Schema-first domain** (`Schema.Class` models, `Schema.Literals` moves,
   branded/bounded coordinates). Decode at every boundary.
2. **Computed certificate**: enumerate the whole space (`chk_all` over all
   96 cells × 5 moves) and assert it evaluates to true. Compute, don't argue.
3. **Reachable-set induction**: BFS from `init()` to a fixpoint; assert every
   reachable state satisfies the invariant. Any input sequence lands in this
   set, so none can violate the law.
4. **Pin the traversal**: assert the reachable count from both sides. A
   one-sided bound passes on a broken (vacuous or duplicating) traversal.
5. **Separate the wall**: human claims in `Laws.ts` (frozen), machine proofs in
   `Cert.ts`. The check fails the moment a law stops holding.
6. Keep it fast: pure functions, no timers/network in the proof path,
   bounded property runs (`numRuns: 500`, sequences ≤ 200).

## 4. Alchemy deploy (Cloudflare)

Covered by the dedicated `alchemy-deploy` skill — load it for stacks,
Worker entries, Pages/static deploys, profiles/stages, and deploy
troubleshooting. Never use wrangler.

## 5. oxlint-plugin (required)

Config lives in root `.oxlintrc.json`: the full scaffold preset from
https://foldkit.dev/tooling/oxlint-plugin (correctness off, `no-unused-vars`
with `_` ignores, `typescript/no-explicit-any` error,
`consistent-type-assertions: never`, all documented foldkit rules) plus
vendored-`components/ui` overrides. Highlights that bit this repo:

- `Got*` is reserved for Submodel wrappers carrying `message`. Command
  results are `Received*` (`got-prefix-requires-submodel-payload`).
- Omit `commands` when statically none (`no-empty-commands-array` — make
  `commands?` optional in result types); omit empty children arrays
  (`no-empty-children-array`).
- `Command` binding matches `Command.define` name
  (`command-binding-matches-name`, `command-define-pascal-const`); construct
  Messages only via callables (`new` on `TaggedClass`,
  `prefer-callable-message-constructor`); never hand-roll command structs.
- One `OnMount` per element — merge streams instead
  (`no-duplicate-onmount-per-element`).
- Time/randomness only inside `execute` (`Clock`/`Random`), never at decision
  time (`no-impure-call-at-decision-time`); no module-level mutable state;
  keep dev guardrails on; stable keys, no index keys, no raw DOM event attrs.
- This app is a browser-only SPA (no SSR/prerender), so
  `no-nonportable-server-globals` stays off by documented decision.

Run `bun run lint` (0 errors) and `bun run fmt:check` before every summary.
When a rule misfires on vendored foldcn code, narrow the override — never
weaken the project-wide policy.
