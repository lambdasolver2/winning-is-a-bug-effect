/**
 * Board scene: the whole level as a pure function of the model.
 * `Canvas.view` repaints on every render, so these shapes ARE the pixels —
 * no imperative draw code, no canvas refs anywhere else.
 *
 * @since 0.1.0
 */
import { Canvas } from "foldkit";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import { Game } from "@wib/domain";
import type { Model } from "../app/model.js";

/** Pixel size of one tile. @category Scene @since 0.1.0 */
export const TILE = 44 as const;
/** Board pixel width. @category Scene @since 0.1.0 */
export const BOARD_W = Game.MAP_W * TILE;
/** Board pixel height. @category Scene @since 0.1.0 */
export const BOARD_H = Game.MAP_H * TILE;

type Shape = Parameters<typeof Canvas.view>[0]["shapes"][number];

const floorTile = (x: number, y: number): Shape =>
  Canvas.Rect({
    x: x * TILE,
    y: y * TILE,
    width: TILE,
    height: TILE,
    fill: (x + y) % 2 === 0 ? "#11151f" : "#131826",
  });

const wallTile = (x: number, y: number): ReadonlyArray<Shape> => [
  Canvas.Rect({
    x: x * TILE + 1,
    y: y * TILE + 1,
    width: TILE - 2,
    height: TILE - 2,
    fill: "#2a3347",
  }),
  Canvas.Rect({
    x: x * TILE + 4,
    y: y * TILE + 4,
    width: TILE - 8,
    height: TILE / 2 - 6,
    fill: "#39445e",
  }),
];

const flagShapes = (now: number): ReadonlyArray<Shape> => {
  const wob = Math.sin(now / 300) * 2;
  const cx = Game.FLAG_X * TILE + TILE / 2;
  const cy = Game.FLAG_Y * TILE + TILE / 2;
  return [
    Canvas.Path({
      instructions: [
        Canvas.MoveTo({ x: cx - 6, y: cy + 12 }),
        Canvas.LineTo({ x: cx - 6, y: cy - 14 }),
      ],
      stroke: "#8a7440",
      lineWidth: 2,
    }),
    Canvas.Path({
      instructions: [
        Canvas.MoveTo({ x: cx - 5, y: cy - 14 }),
        Canvas.LineTo({ x: cx + 13 + wob, y: cy - 9 }),
        Canvas.LineTo({ x: cx - 5, y: cy - 3 }),
        Canvas.Close({}),
      ],
      fill: "#ffd25e",
    }),
  ];
};

const playerAt = (model: Model): readonly [number, number] => {
  const slide = model.slide;
  if (slide !== null) {
    const k = Math.min((model.now - slide.t0) / 90, 1);
    return [slide.fx + (slide.tx - slide.fx) * k, slide.fy + (slide.ty - slide.fy) * k];
  }
  return [model.board.x, model.board.y];
};

const bumpOffset = (model: Model): readonly [number, number] => {
  const bump = model.bump;
  if (bump === null) return [0, 0];
  const k = Math.max(1 - (model.now - bump.t0) / 120, 0) * 6;
  return [bump.dx * k, bump.dy * k];
};

const playerShapes = (model: Model): ReadonlyArray<Shape> => {
  const [px, py] = playerAt(model);
  const [bx, by] = bumpOffset(model);
  const cx = px * TILE + TILE / 2 + bx;
  const cy = py * TILE + TILE / 2 + by;
  return [
    Canvas.Circle({ x: cx, y: cy, radius: TILE * 0.3, fill: "#59e3ff" }),
    Canvas.Circle({ x: cx - 4, y: cy - 3, radius: 2.4, fill: "#0b0e14" }),
    Canvas.Circle({ x: cx + 4, y: cy - 3, radius: 2.4, fill: "#0b0e14" }),
  ];
};

/**
 * Every shape on the board, back to front: floor, flag, player.
 *
 * @category Scene
 * @since 0.1.0
 */
export const scene = (model: Model): ReadonlyArray<Shape> => [
  ...pipe(
    Arr.makeBy(Game.MAP_W * Game.MAP_H, (i) => {
      const x = i % Game.MAP_W;
      const y = Math.floor(i / Game.MAP_W);
      return Game.wall(x, y) ? wallTile(x, y) : [floorTile(x, y)];
    }),
    Arr.flatten,
  ),
  ...flagShapes(model.now),
  ...playerShapes(model),
];
