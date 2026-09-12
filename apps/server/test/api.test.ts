/**
 * Game server integration tests over an ephemeral port
 * (Effect http-server skill: `NodeHttpServer.layerTest`).
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
} from "effect/unstable/http";
import { NodeHttpServer } from "@effect/platform-node";
import { AppRoutes } from "../src/app.js";
import { Game } from "@wib/domain";

const serve = HttpRouter.serve(AppRoutes).pipe(Layer.build);

const decodeGame = HttpClientResponse.schemaBodyJson(Game.Game);

describe("game server", () => {
  it.effect("GET /api/health is ok", () =>
    Effect.gen(function* () {
      yield* serve;
      const res = yield* HttpClient.get("/api/health");
      expect(yield* res.text).toBe("ok");
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("GET /api/state is the verified init", () =>
    Effect.gen(function* () {
      yield* serve;
      const res = yield* HttpClient.get("/api/state");
      const state = yield* decodeGame(res);
      expect(state.x).toBe(Game.START_X);
      expect(state.y).toBe(Game.START_Y);
      expect(state.won).toBe(false);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("POST /api/apply steps and never mints a win", () =>
    Effect.gen(function* () {
      yield* serve;
      const body = yield* HttpBody.json({
        state: { x: Game.START_X, y: Game.START_Y, won: false },
        moves: ["Left", "Grab"],
      });
      const res = yield* HttpClientRequest.post("/api/apply").pipe(
        HttpClientRequest.setBody(body),
        HttpClient.execute,
      );
      const next = yield* decodeGame(res);
      expect(next.x).toBe(Game.START_X - 1);
      expect(next.won).toBe(false);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );

  it.effect("POST /api/cert reports a held certificate", () =>
    Effect.gen(function* () {
      yield* serve;
      const body = yield* HttpBody.json({});
      const res = yield* HttpClientRequest.post("/api/cert").pipe(
        HttpClientRequest.setBody(body),
        HttpClient.execute,
      );
      expect(yield* res.json).toMatchObject({ certificateHolds: true, runFalse: true });
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});
