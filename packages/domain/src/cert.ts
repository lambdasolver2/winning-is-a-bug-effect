/**
 * Winning Is A Bug — the certificate (port of `cert.bend`).
 *
 * The proofs. This module imports the game (as Game) and the claims (as
 * Laws) and discharges every law the human states — an undischarged law
 * fails `npm run check`, so the test suite is the whole verification.
 *
 * Shape of the argument (same as Bend): an invariant ("the player stands
 * on a safe cell: on the map, not inside the room, not on a wall") holds
 * at the start and survives every action. The finite geometry is computed,
 * not argued: `chkAll` enumerates the whole map and must evaluate to true,
 * and `certAt` indexes that certificate at arbitrary coordinates. A grab
 * off the flag never sets `won`, and the flag's cell is in the room.
 *
 * Because the state space is tiny (12 x 8 cells x won-bit), the induction
 * is additionally discharged by exhaustive enumeration: every state
 * reachable from `init()` is visited and asserted safe-and-unwon.
 *
 * @since 0.1.0
 */
import { Effect, Match, Schema } from "effect";
import * as Arr from "effect/Array";
import * as Game from "./game.js";
import * as Laws from "./laws.js";

/**
 * The room interior: the flag's 3x3 corner including its east/south walls.
 * Mirrors `room` in cert.bend (`nat_le(x,2) && nat_le(y,2)`).
 *
 * @category Invariant
 * @since 0.1.0
 */
export const room = (x: number, y: number): boolean => x <= 2 && y <= 2;

/**
 * Safe cells: on the map, not inside the room, not on a wall.
 * Mirrors `okpos` in cert.bend.
 *
 * @category Invariant
 * @since 0.1.0
 */
export const okpos = (x: number, y: number): boolean =>
  x >= 0 && x < Game.MAP_W && y >= 0 && y < Game.MAP_H && !room(x, y) && !Game.wall(x, y);

/** Target x of one action from `(x, y)`. Mirrors `tx` in cert.bend. @category Invariant @since 0.1.0 */
export const tx = (action: Game.Move, x: number, _y: number): number =>
  Match.value(action).pipe(
    Match.when("Up", () => x),
    Match.when("Down", () => x),
    Match.when("Grab", () => x),
    Match.when("Left", () => Game.warpLeft(x)),
    Match.when("Right", () => Game.warpRight(x)),
    Match.exhaustive,
  );

/** Target y of one action from `(x, y)`. Mirrors `ty` in cert.bend. @category Invariant @since 0.1.0 */
export const ty = (action: Game.Move, x: number, y: number): number =>
  Match.value(action).pipe(
    Match.when("Up", () => Game.warpUp(y)),
    Match.when("Down", () => Game.warpDown(y)),
    Match.when("Left", () => y),
    Match.when("Right", () => y),
    Match.when("Grab", () => y),
    Match.exhaustive,
  );

/**
 * One certificate cell: from a safe cell, stepping toward a non-wall must
 * land on a safe cell. Mirrors `chk` in cert.bend.
 *
 * @category Certificate
 * @since 0.1.0
 */
export const chk = (action: Game.Move, x: number, y: number): boolean => {
  const fromSafe = okpos(x, y);
  const targetWall = Game.wall(tx(action, x, y), ty(action, x, y));
  const targetSafe = okpos(tx(action, x, y), ty(action, x, y));
  return !(fromSafe && !targetWall) || targetSafe;
};

/**
 * The computed certificate for one move: `chk` over every map cell.
 * Must evaluate to true — its truth is checked, not argued.
 *
 * @category Certificate
 * @since 0.1.0
 */
export const allCells: ReadonlyArray<readonly [number, number]> = Arr.makeBy(
  Game.MAP_W * Game.MAP_H,
  (i) => [i % Game.MAP_W, Math.floor(i / Game.MAP_W)] as const,
);

export const chkAll = (action: Game.Move): boolean =>
  Arr.every(allCells, ([x, y]) => chk(action, x, y));

/**
 * The whole certificate: every move's geometry table checks out.
 * Mirrors the `Unit{}` (computed-True) evidence in cert.bend.
 *
 * @category Certificate
 * @since 0.1.0
 */
export const certificateHolds = (): boolean => Game.ALL_MOVES.every(chkAll);

/**
 * Index the certificate at open coordinates (reflection lemma).
 * Returns true when the step from a safe cell is justified.
 *
 * @category Certificate
 * @since 0.1.0
 */
export const certAt = (action: Game.Move, x: number, y: number): boolean =>
  chkAll(action) && chk(action, x, y);

/**
 * A grab off the flag never wins; standing on the flag is impossible
 * from safety because the flag cell `(1,1)` is in the room.
 * Mirrors `no_flag` in cert.bend.
 *
 * @category Certificate
 * @since 0.1.0
 */
export const grabSafe = (x: number, y: number): boolean => {
  if (!okpos(x, y)) return true;
  return !(x === Game.FLAG_X && y === Game.FLAG_Y);
};

const stateKey = (state: Game.Game): string => `${state.x},${state.y},${state.won}`;

const isKnown = (seen: ReadonlyArray<string>, state: Game.Game): boolean =>
  seen.includes(stateKey(state));

/**
 * Every state reachable from `init()` via any move sequence, by frontier
 * expansion to a fixpoint. Finite: at most MAP_W x MAP_H x 2 states.
 *
 * @category Proof
 * @since 0.1.0
 */
export const reachableStates = (): ReadonlyArray<Game.Game> => {
  const close = (
    seen: ReadonlyArray<Game.Game>,
    keys: ReadonlyArray<string>,
    frontier: ReadonlyArray<Game.Game>,
  ): ReadonlyArray<Game.Game> =>
    Arr.match(frontier, {
      onEmpty: () => seen,
      onNonEmpty: (current) => {
        const folded = Arr.reduce(
          current,
          { fresh: Arr.empty<Game.Game>(), freshKeys: keys },
          ({ fresh, freshKeys }, state) =>
            isKnown(freshKeys, state)
              ? { fresh, freshKeys }
              : {
                  fresh: Arr.append(fresh, state),
                  freshKeys: Arr.append(freshKeys, stateKey(state)),
                },
        );
        const grown = [...seen, ...folded.fresh] as const;
        const next = Arr.flatMap(folded.fresh, (state) =>
          Arr.map(Game.ALL_MOVES, (action) => Game.step(state, action)),
        );
        return close(grown, folded.freshKeys, next);
      },
    });
  const start = Game.init();
  return close([], [], [start]);
};

/**
 * The theorem's engine: from any safe unwon state, no action list wins.
 * Discharged by checking the full reachable set: every reachable state is
 * safe (when unwon) and unwon. Mirrors `run_false` in cert.bend.
 *
 * @category Proof
 * @since 0.1.0
 */
export const runFalse = (): boolean => {
  if (!certificateHolds()) return false;
  if (!okpos(Game.START_X, Game.START_Y)) return false;
  return Arr.every(reachableStates(), (state) => !Game.isWon(state) && okpos(state.x, state.y));
};

/**
 * Fill the human's law: the start cell is safe (computed), and `runFalse`
 * carries that safety through any list of actions.
 * Mirrors `Laws.winning_is_a_bug` in cert.bend.
 *
 * @category Proof
 * @since 0.1.0
 */
export const winningIsABug = (_moves: ReadonlyArray<Game.Move>): boolean => runFalse();

/** Proof failure for the law. @category Errors @since 0.1.0 */
export class CertError extends Schema.TaggedError<CertError>()("CertError", {
  detail: Schema.String,
}) {}

/**
 * Effectful entrypoint for the whole verification: certificate tables,
 * start-cell safety, reachable-set induction, and the human law predicate
 * over a sample sequence. Fails with `CertError` on any violation.
 *
 * @category Proof
 * @since 0.1.0
 */
export const checkLawEffect = Effect.fn("Cert.checkLaw")(function* (
  sample: ReadonlyArray<Game.Move>,
) {
  yield* Effect.logDebug("checking computed certificate tables");
  if (!certificateHolds())
    return yield* Effect.fail(new CertError({ detail: "chk_all table has a hole" }));
  yield* Effect.logDebug("checking start cell safety");
  if (!okpos(Game.START_X, Game.START_Y))
    return yield* Effect.fail(new CertError({ detail: "start cell is not safe" }));
  yield* Effect.logDebug("checking reachable-state induction");
  if (!runFalse())
    return yield* Effect.fail(
      new CertError({ detail: "reachable set contains a won or unsafe state" }),
    );
  yield* Effect.logDebug("checking human law predicate on sample");
  if (!Laws.winningIsABug(sample))
    return yield* Effect.fail(new CertError({ detail: "law predicate failed on sample" }));
  return true as const;
});
