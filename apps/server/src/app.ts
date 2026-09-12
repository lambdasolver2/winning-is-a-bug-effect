/**
 * Winning Is A Bug — game server app (pure definitions, no boot).
 *
 * Local Effect HTTP server exposing the game rules, so the browser UI and
 * the opencode2 server API can drive play with no credentials and no Bend
 * toolchain: everything runs on localhost.
 *
 * - `GET  /api/health` — liveness, no credentials.
 * - `GET  /api/grid`   — level text (single author: `Game.grid`).
 * - `GET  /api/state`  — initial state.
 * - `POST /api/apply`  — `{ state, moves }` JSON body, returns next state.
 * - `GET  /api/cert`   — computed certificate status (`chk_all` tables +
 *   reachable-set induction).
 *
 * Run: `npm run server` (respects `PORT`, defaults to 3000).
 *
 * @since 0.1.0
 */
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { Cert, Game } from "@wib/domain";

/** POST /api/apply body. @category Api @since 0.1.0 */
export class ApplyRequest extends Schema.Class<ApplyRequest>("ApplyRequest")({
  state: Game.Game,
  moves: Schema.Array(Game.Move),
}) {}

const gameResponse = HttpServerResponse.schemaJson(Game.Game);

const HealthRoute = HttpRouter.add("GET", "/api/health", HttpServerResponse.text("ok"));

const GridRoute = HttpRouter.add(
  "GET",
  "/api/grid",
  Effect.succeed(HttpServerResponse.text(Game.grid())),
);

const StateRoute = HttpRouter.add(
  "GET",
  "/api/state",
  Effect.succeed(Game.init()).pipe(Effect.flatMap((state) => gameResponse(state))),
);

const ApplyRoute = HttpRouter.add(
  "POST",
  "/api/apply",
  Effect.gen(function* () {
    const { state, moves } = yield* HttpServerRequest.schemaBodyJson(ApplyRequest);
    return yield* gameResponse(Game.apply(state, moves));
  }),
);

const CertRoute = HttpRouter.add(
  "POST",
  "/api/cert",
  Effect.succeed({
    certificateHolds: Cert.certificateHolds(),
    runFalse: Cert.runFalse(),
    reachableStates: Cert.reachableStates().length,
  }).pipe(Effect.flatMap((report) => HttpServerResponse.json(report))),
);

/** All game routes (pure layer, importable without booting). @category Api @since 0.1.0 */
export const AppRoutes = Layer.mergeAll(
  HealthRoute,
  GridRoute,
  StateRoute,
  ApplyRoute,
  CertRoute,
  HttpRouter.cors(),
);
