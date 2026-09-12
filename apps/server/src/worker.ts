/**
 * Winning Is A Bug — Cloudflare Worker entry (Dearly: `apps/worker/src/index.ts`).
 * Same `AppRoutes` as the Node server, exposed as a fetch handler; static
 * assets (`../web/dist`) are served by the Worker per `alchemy.run.ts`.
 *
 * @since 0.1.0
 */
import { Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { AppRoutes } from "./app.js";

export const { handler, dispose } = HttpRouter.toWebHandler(
  Layer.provide(AppRoutes, HttpServer.layerServices),
);

export default {
  fetch: handler,
} as const;

void dispose;
