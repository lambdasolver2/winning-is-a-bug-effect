---
name: alchemy-deploy
description: Deploy Effect apps to Cloudflare with Alchemy, without wrangler. Use when writing alchemy.run.ts stacks, Worker entries, Pages/static deploys, managing profiles and stages, or debugging deploy/auth failures.
---

# Alchemy Deploy (no wrangler)

Never use wrangler. Alchemy is the only deploy path. Agent docs index:
https://alchemy.run/llms.txt (every page has a Markdown twin; resource API in
`llms-full.txt`). Start at Cloudflare setup (`/cloudflare/setup`), then the
resource you need (Workers `/cloudflare/compute/workers`, Foldkit frontend
`/cloudflare/frontend/foldkit`, custom domains `/cloudflare/networking/custom-domains`).

## Stack shape (this repo: `apps/server/alchemy.run.ts`)

- One `Alchemy.Stack` composition root; one file per concern (Dearly file
  layout, see `/project-structure/file-layout`; monorepo patterns in
  `/project-structure/monorepo`).
- One `Cloudflare.Worker` (`main: ./src/worker.ts`, `assets: ../web/dist`,
  `nodejs_compat`), domain optional via `GAME_DOMAIN` (`Option.isSome`,
  never `_tag` checks). A pure client app could use
  `Cloudflare.Website.Foldkit` instead; an app with an API keeps
  Worker+assets.
- Server code exposes routes twice: Node (`NodeHttpServer.layer`, local dev
  only) and Worker (`HttpRouter.toWebHandler` +
  `HttpServer.layerServices`). Production is Worker-only.

## Auth (human-owned, never committed)

- Profiles first: `bunx alchemy profile list/show/current`,
  `bunx alchemy profile refresh --profile default --provider Cloudflare`
  (browser OAuth). See `/environments/profiles`.
- Headless/CI: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` env, or
  provider credentials as code (`/environments/ci`).
- Stages isolate environments (`/environments/stages`); `alchemy plan`
  previews, `deploy --yes` applies, `drift`/`nuke`/`destroy` recover.

## Commands (`apps/server`)

- `bun run worker:dev` — local worker + assets, hot reload (login needed).
- `bun run deploy` — `alchemy deploy --yes`.
- `bun run destroy` — remove the stack.
- Debug: `bunx alchemy state`, `bunx alchemy logs`, Inspecting State
  (`/cli/inspecting-state`).

## Rules

- Pin latest `alchemy` beta exact alongside the Effect stack.
- `main` points at a fetch handler (`{ fetch }`), never at Node listen code.
- Secrets via `effect/Config` at Construction time
  (`/cloudflare/security/secrets-env`); never commit tokens.
- `bun run build` must pass before `bun run deploy` (Worker `assets`
  points at fresh `../web/dist`).
