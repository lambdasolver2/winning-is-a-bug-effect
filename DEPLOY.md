# Deploy

One Worker serves the API (`apps/server/src/worker.ts`) plus the built site
(`apps/web/dist`) as static assets — same shape as Dearly's worker.

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Cloudflare](https://cloudflare.com) account (Workers free plan suffices;
  no D1/R2/Access needed) with a domain on Cloudflare for `GAME_DOMAIN`

## Login (no wrangler)

Never use wrangler. Auth is headless via env (human-owned, never committed):

```sh
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
```

## Deploy

```sh
bun install
bun run build
cd apps/server
GAME_DOMAIN=game.example.com bun run deploy
```

Omit `GAME_DOMAIN` to deploy on your `workers.dev` subdomain instead.

| Variable               | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | API token with Workers permissions (or login)  |
| `CLOUDFLARE_ACCOUNT_ID`| Your Cloudflare account ID                     |
| `GAME_DOMAIN`          | Domain for the game (optional, workers.dev default) |

## Local worker dev

```sh
cd apps/server
bun run worker:dev
```
