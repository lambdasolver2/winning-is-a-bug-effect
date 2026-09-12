import { describe, expect, it } from "vitest";
import * as Game from "../src/game.js";

describe("Game geometry", () => {
  it("map dimensions match Bend", () => {
    expect(Game.MAP_W).toBe(12);
    expect(Game.MAP_H).toBe(8);
    expect(Game.FLAG_X).toBe(1);
    expect(Game.FLAG_Y).toBe(1);
    expect(Game.START_X).toBe(8);
    expect(Game.START_Y).toBe(5);
  });

  it("walls seal the room: east, south, and torus-far north/west", () => {
    // east wall x==3, y<=3
    expect(Game.wall(3, 0)).toBe(true);
    expect(Game.wall(3, 3)).toBe(true);
    expect(Game.wall(3, 4)).toBe(false);
    // south wall y==3, x<=3
    expect(Game.wall(0, 3)).toBe(true);
    expect(Game.wall(3, 3)).toBe(true);
    expect(Game.wall(4, 3)).toBe(false);
    // north wall y==7, x<=3 (far edge of the torus)
    expect(Game.wall(0, 7)).toBe(true);
    expect(Game.wall(3, 7)).toBe(true);
    expect(Game.wall(4, 7)).toBe(false);
    // west wall x==11, y<=3 (far edge of the torus)
    expect(Game.wall(11, 0)).toBe(true);
    expect(Game.wall(11, 3)).toBe(true);
    expect(Game.wall(11, 4)).toBe(false);
    // open floor
    expect(Game.wall(8, 5)).toBe(false);
    expect(Game.wall(5, 5)).toBe(false);
  });

  it("warps wrap the torus", () => {
    expect(Game.warpUp(0)).toBe(Game.MAP_H - 1);
    expect(Game.warpUp(5)).toBe(4);
    expect(Game.warpDown(Game.MAP_H - 1)).toBe(0);
    expect(Game.warpDown(5)).toBe(6);
    expect(Game.warpLeft(0)).toBe(Game.MAP_W - 1);
    expect(Game.warpLeft(5)).toBe(4);
    expect(Game.warpRight(Game.MAP_W - 1)).toBe(0);
    expect(Game.warpRight(5)).toBe(6);
  });

  it("grid renders 12x8 with flag, start, and walls", () => {
    const rows = Game.grid().split("\n");
    expect(rows).toHaveLength(Game.MAP_H);
    for (const r of rows) expect(r.length).toBe(Game.MAP_W);
    expect(rows[Game.FLAG_Y]?.[Game.FLAG_X]).toBe("F");
    expect(rows[Game.START_Y]?.[Game.START_X]).toBe("P");
    expect(rows[0]?.[3]).toBe("#");
    expect(rows[3]?.[0]).toBe("#");
    expect(rows[7]?.[0]).toBe("#");
    expect(rows[0]?.[11]).toBe("#");
    expect(rows[5]?.[5]).toBe(".");
  });
});

describe("Game steps", () => {
  it("starts unwon at the start cell", () => {
    const s = Game.init();
    expect(s.x).toBe(8);
    expect(s.y).toBe(5);
    expect(Game.isWon(s)).toBe(false);
  });

  it("plain steps move, walls block", () => {
    const s = Game.init();
    expect(Game.step(s, "Left").x).toBe(7);
    expect(Game.step(s, "Up").y).toBe(4);
    // walk into the east wall from (4,1): stays put
    const at = new Game.Game({ x: 4, y: 1, won: false });
    expect(Game.step(at, "Left")).toEqual(at);
  });

  it("grab wins only on the flag cell", () => {
    const on = new Game.Game({ x: 1, y: 1, won: false });
    expect(Game.isWon(Game.step(on, "Grab"))).toBe(true);
    const off = Game.init();
    expect(Game.isWon(Game.step(off, "Grab"))).toBe(false);
  });

  it("apply folds a sequence deterministically", () => {
    const end = Game.apply(Game.init(), ["Left", "Left", "Up", "Grab"]);
    expect(Game.isWon(end)).toBe(false);
    expect(end.x).toBe(6);
    expect(end.y).toBe(4);
  });

  it("decodes valid states and rejects garbage", () => {
    expect(Game.decodeGame({ x: 1, y: 2, won: false }).x).toBe(1);
    expect(() => Game.decodeGame({ x: 99, y: 2, won: false })).toThrow();
    expect(Game.decodeMove("Grab")).toBe("Grab");
    expect(() => Game.decodeMove("Fly")).toThrow();
  });
});
