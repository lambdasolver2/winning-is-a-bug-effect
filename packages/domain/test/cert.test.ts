import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as fc from "fast-check";
import * as Cert from "../src/Cert.js";
import * as Game from "../src/Game.js";
import * as Laws from "../src/Laws.js";

it.live("computed certificate tables hold for every move", () =>
  Effect.sync(() => {
    for (const action of Game.ALL_MOVES) {
      expect(Cert.chkAll(action)).toBe(true);
    }
    expect(Cert.certificateHolds()).toBe(true);
  }),
);

it.live("start cell is safe", () =>
  Effect.sync(() => {
    expect(Cert.okpos(Game.START_X, Game.START_Y)).toBe(true);
    expect(Cert.room(Game.START_X, Game.START_Y)).toBe(false);
    expect(Game.wall(Game.START_X, Game.START_Y)).toBe(false);
  }),
);

it.live("flag cell is inside the room, so safety excludes it", () =>
  Effect.sync(() => {
    expect(Cert.room(Game.FLAG_X, Game.FLAG_Y)).toBe(true);
    expect(Cert.okpos(Game.FLAG_X, Game.FLAG_Y)).toBe(false);
    expect(Cert.grabSafe(Game.START_X, Game.START_Y)).toBe(true);
  }),
);

it.live("every step from a safe cell lands on a wall or a safe cell", () =>
  Effect.sync(() => {
    for (let y = 0; y < Game.MAP_H; y++) {
      for (let x = 0; x < Game.MAP_W; x++) {
        if (!Cert.okpos(x, y)) continue;
        for (const action of Game.ALL_MOVES) {
          const nx = Cert.tx(action, x, y);
          const ny = Cert.ty(action, x, y);
          expect(Game.wall(nx, ny) || Cert.okpos(nx, ny)).toBe(true);
        }
      }
    }
  }),
);

it.live("reachable-set induction: no reachable state is won or unsafe", () =>
  Effect.sync(() => {
    expect(Cert.runFalse()).toBe(true);
    const states = Cert.reachableStates();
    expect(states.length).toBeGreaterThan(50);
    expect(states.length).toBeLessThanOrEqual(Game.MAP_W * Game.MAP_H * 2);
    for (const s of states) {
      expect(Game.isWon(s)).toBe(false);
    }
  }),
);

it.live("law predicate holds on samples, including the Bend main() demo", () =>
  Effect.sync(() => {
    expect(Laws.winningIsABug(["Left", "Left", "Up", "Grab"])).toBe(true);
    expect(Laws.winningIsABug([])).toBe(true);
    expect(Cert.winningIsABug(["Left", "Left", "Up", "Grab"])).toBe(true);
  }),
);

it.live("random move sequences from init never win", () =>
  Effect.sync(() => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...Game.ALL_MOVES), { maxLength: 200 }), (moves) =>
        Laws.winningIsABug(moves),
      ),
      { numRuns: 500 },
    );
  }),
);

it.live("checkLawEffect succeeds end to end", () =>
  Effect.gen(function* () {
    const ok = yield* Cert.checkLawEffect(["Left", "Up", "Grab"]);
    expect(ok).toBe(true);
  }),
);
