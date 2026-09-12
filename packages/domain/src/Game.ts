/**
 * Winning Is A Bug — the game (Effect-TS port of `main.bend`).
 *
 * The whole game, and nothing else: a torus map, a walled room, a flag,
 * five moves, and the level as text (the front end asks `grid` for it).
 * Claims about this game live in `Laws.ts`; their proofs live in `Cert.ts`.
 * This file is AI-written and may be rewritten at will — the laws hold or
 * `npm run check` stops passing.
 *
 * @since 0.1.0
 */
import { Match, Schema, pipe } from "effect";
import * as Arr from "effect/Array";

/** Map width in cells. @category Constants @since 0.1.0 */
export const MAP_W = 12 as const;
/** Map height in cells. @category Constants @since 0.1.0 */
export const MAP_H = 8 as const;
/** Room width (cells `0..ROOM_W` are the room's east wall span). @category Constants @since 0.1.0 */
export const ROOM_W = 3 as const;
/** Room height. @category Constants @since 0.1.0 */
export const ROOM_H = 3 as const;
/** Flag x coordinate (inside the room). @category Constants @since 0.1.0 */
export const FLAG_X = 1 as const;
/** Flag y coordinate (inside the room). @category Constants @since 0.1.0 */
export const FLAG_Y = 1 as const;
/** Player start x. @category Constants @since 0.1.0 */
export const START_X = 8 as const;
/** Player start y. @category Constants @since 0.1.0 */
export const START_Y = 5 as const;

const XCoord = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ minimum: 0, maximum: MAP_W - 1 }),
).annotate({ identifier: "XCoord", description: "Horizontal cell coordinate inside the map." });

const YCoord = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ minimum: 0, maximum: MAP_H - 1 }),
).annotate({ identifier: "YCoord", description: "Vertical cell coordinate inside the map." });

/**
 * A move: four steps plus grab.
 * @category Models
 * @since 0.1.0
 */
export const Move = Schema.Literals(["Up", "Down", "Left", "Right", "Grab"]).annotate({
  identifier: "Move",
  description: "One player action: a torus step or a flag grab.",
});
export type Move = typeof Move.Type;

/** All moves, for exhaustive enumeration. @category Models @since 0.1.0 */
export const ALL_MOVES: ReadonlyArray<Move> = ["Up", "Down", "Left", "Right", "Grab"];

/**
 * The game state: player position plus the won flag.
 * @category Models
 * @since 0.1.0
 */
export class Game extends Schema.Class<Game>("Game")(
  {
    x: XCoord,
    y: YCoord,
    won: Schema.Boolean,
  },
  { description: "Player position on the torus plus the won flag." },
) {}

/** Decode an unknown value as a Game. @category Constructors @since 0.1.0 */
export const decodeGame = Schema.decodeUnknownSync(Game);
/** Decode an unknown value as a Move. @category Constructors @since 0.1.0 */
export const decodeMove = Schema.decodeUnknownSync(Move);
/** Type guard for Game. @category Guards @since 0.1.0 */
export const isGame = Schema.is(Game);
/** Type guard for Move. @category Guards @since 0.1.0 */
export const isMove = Schema.is(Move);

/**
 * True when the cell is a wall. The room's east and south walls are drawn
 * directly; its north and west walls ARE the far edges of the torus.
 *
 * @category Geometry
 * @since 0.1.0
 */
export const wall = (x: number, y: number): boolean => {
  const east = x === ROOM_W && y <= ROOM_H;
  const south = x <= ROOM_W && y === ROOM_H;
  const north = x <= ROOM_W && y === MAP_H - 1;
  const west = x === MAP_W - 1 && y <= ROOM_H;
  return east || south || north || west;
};

/** Wrap one step upward around the torus. @category Geometry @since 0.1.0 */
export const warpUp = (y: number): number => (y === 0 ? MAP_H - 1 : y - 1);
/** Wrap one step downward around the torus. @category Geometry @since 0.1.0 */
export const warpDown = (y: number): number => (y + 1 === MAP_H ? 0 : y + 1);
/** Wrap one step leftward around the torus. @category Geometry @since 0.1.0 */
export const warpLeft = (x: number): number => (x === 0 ? MAP_W - 1 : x - 1);
/** Wrap one step rightward around the torus. @category Geometry @since 0.1.0 */
export const warpRight = (x: number): number => (x + 1 === MAP_W ? 0 : x + 1);

/**
 * Attempt to enter `(tx, ty)`: a wall means staying put.
 * @category Steps
 * @since 0.1.0
 */
export const move = (self: Game, tx: number, ty: number): Game =>
  wall(tx, ty) ? self : new Game({ x: tx, y: ty, won: self.won });

/**
 * Apply one action to a state. Grab sets `won` only while standing
 * exactly on the flag cell.
 *
 * @category Steps
 * @since 0.1.0
 */
export const step = (self: Game, action: Move): Game =>
  Match.value(action).pipe(
    Match.when("Up", () => move(self, self.x, warpUp(self.y))),
    Match.when("Down", () => move(self, self.x, warpDown(self.y))),
    Match.when("Left", () => move(self, warpLeft(self.x), self.y)),
    Match.when("Right", () => move(self, warpRight(self.x), self.y)),
    Match.when(
      "Grab",
      () =>
        new Game({
          x: self.x,
          y: self.y,
          won: self.won || (self.x === FLAG_X && self.y === FLAG_Y),
        }),
    ),
    Match.exhaustive,
  );

/** Initial game state. @category Constructors @since 0.1.0 */
export const init = (): Game => new Game({ x: START_X, y: START_Y, won: false });

/**
 * Apply a sequence of moves to a board.
 * @category Steps
 * @since 0.1.0
 */
export const apply = (self: Game, moves: ReadonlyArray<Move>): Game =>
  Arr.reduce(moves, self, (board, m) => step(board, m));

/** True when the board shows victory. @category Destructors @since 0.1.0 */
export const isWon = (self: Game): boolean => self.won;

/**
 * Render one cell: `#` wall, `F` flag, `P` start, `.` floor.
 * @category Rendering
 * @since 0.1.0
 */
export const cell = (x: number, y: number): string => {
  if (wall(x, y)) return "#";
  if (x === FLAG_X && y === FLAG_Y) return "F";
  if (x === START_X && y === START_Y) return "P";
  return ".";
};

/** Render row `y` left-to-right. @category Rendering @since 0.1.0 */
export const row = (y: number): string =>
  pipe(
    Arr.makeBy(MAP_W, (x) => cell(x, y)),
    Arr.join(""),
  );

/** Render the whole level top-to-bottom. The front end asks for exactly this text. @category Rendering @since 0.1.0 */
export const grid = (): string =>
  pipe(
    Arr.makeBy(MAP_H, (y) => row(y)),
    Arr.join("\n"),
  );
