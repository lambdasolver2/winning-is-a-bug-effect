/**
 * Winning Is A Bug — game server entry. Boots the runtime; `app.ts` holds
 * the definitions so tests import the app without side effects.
 *
 * Run: `npm run server` (respects `PORT`, defaults to 3000).
 *
 * @since 0.1.0
 */
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
// Intentional: NodeHttpServer.layer requires a server factory (Effect http-server skill pattern).
import { createServer } from "node:http";
import { AppRoutes } from "./app.js";

const PortConfig = Config.number("PORT").pipe(Config.withDefault(3000));

const Main = Layer.unwrap(
  Effect.gen(function* () {
    const port = yield* PortConfig;
    yield* Effect.logInfo(`winning-is-a-bug listening on http://localhost:${port}`);
    return HttpRouter.serve(AppRoutes).pipe(
      Layer.provide(NodeHttpServer.layer(() => createServer(), { port })),
    );
  }),
);

Layer.launch(Main).pipe(NodeRuntime.runMain);
