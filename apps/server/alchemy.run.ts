/**
 * Winning Is A Bug — Alchemy stack (Dearly: `apps/worker/alchemy.run.ts`).
 * One Worker serves the API (`src/worker.ts`) plus the built site
 * (`../web/dist`) as static assets. No D1/R2/Access needed.
 *
 * Login, then deploy:
 *   bunx wrangler login
 *   bun run deploy
 *
 * @since 0.1.0
 */
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, Effect, Option } from "effect";

const GAME_DOMAIN = Config.option(Config.string("GAME_DOMAIN"));

export default Alchemy.Stack(
  "WinningIsABug",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const domain = yield* GAME_DOMAIN;
    const worker = yield* Cloudflare.Worker("WibWorker", {
      main: "./src/worker.ts",
      assets: "../web/dist",
      compatibility: { flags: ["nodejs_compat"] },
      ...(Option.isSome(domain) ? { domain: domain.value } : {}),
      dev: {
        port: 3000,
        strictPort: true,
      },
    });

    return { url: worker.url };
  }),
);
