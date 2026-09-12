/**
 * Foldkit update tests: pure transitions, no runtime boot.
 */
import { describe, expect, it } from "vitest";
import { Game } from "@wib/domain";
import * as Arr from "effect/Array";
import { initialModel } from "../src/app/model.js";
import {
  FrameTick,
  ReceivedRemoteBoard,
  PressedMove,
  RemoteMoveFailed,
} from "../src/app/message.js";
import { update } from "../src/app/update.js";

describe("update", () => {
  it("local Left steps and counts the move", () => {
    const result = update(initialModel(null), new PressedMove({ move: "Left" }));
    expect(result.model.board.x).toBe(Game.START_X - 1);
    expect(result.model.moves).toBe(1);
    expect(result.commands ?? []).toHaveLength(0);
  });

  it("grab off the flag shows a toast", () => {
    const result = update(initialModel(null), new PressedMove({ move: "Grab" }));
    expect(result.model.board.won).toBe(false);
    expect(result.model.grabs).toBe(1);
    expect(result.model.toasts.toast.entries).toHaveLength(1);
  });

  it("grab on the flag wins and opens the proof dialog", () => {
    const onFlag = {
      ...initialModel(null),
      board: new Game.Game({ x: Game.FLAG_X, y: Game.FLAG_Y, won: false }),
    };
    const result = update(onFlag, new PressedMove({ move: "Grab" }));
    expect(result.model.board.won).toBe(true);
    expect(result.model.proofDialog.isOpen).toBe(true);
  });

  it("remote mode issues a command and waits", () => {
    const result = update(initialModel("http://localhost:3000"), new PressedMove({ move: "Up" }));
    expect(result.model.board).toEqual(initialModel(null).board);
    expect(result.commands ?? []).toHaveLength(1);
  });

  it("remote answer settles like a local step", () => {
    const base = initialModel("http://localhost:3000");
    const board = new Game.Game({ x: 7, y: 5, won: false });
    const result = update(base, new ReceivedRemoteBoard({ board, move: "Left" }));
    expect(result.model.board.x).toBe(7);
    expect(result.model.moves).toBe(1);
  });

  it("remote failure toasts the reason", () => {
    const result = update(
      initialModel("http://localhost:3000"),
      new RemoteMoveFailed({ reason: "down" }),
    );
    expect(result.model.toasts.toast.entries).toHaveLength(1);
  });

  it("frame ticks advance the animation clock, capped per frame", () => {
    const first = update(initialModel(null), new FrameTick({ deltaTime: 16 }));
    expect(first.model.now).toBe(16);
    const capped = update(initialModel(null), new FrameTick({ deltaTime: 5000 }));
    expect(capped.model.now).toBe(32);
  });
});

describe("animations", () => {
  it("plain step starts a slide", () => {
    const result = update(initialModel(null), new PressedMove({ move: "Left" }));
    expect(result.model.slide).not.toBe(null);
    expect(result.model.slide?.tx).toBe(Game.START_X - 1);
    expect(result.model.bump).toBe(null);
  });

  it("wall hit starts a bump instead", () => {
    const against = {
      ...initialModel(null),
      board: new Game.Game({ x: 4, y: 1, won: false }),
    };
    const result = update(against, new PressedMove({ move: "Left" }));
    expect(result.model.board.x).toBe(4);
    expect(result.model.slide).toBe(null);
    expect(result.model.bump).not.toBe(null);
  });

  it("finished animations clear on tick", () => {
    const moving = update(initialModel(null), new PressedMove({ move: "Left" }));
    const done = Arr.reduce(
      Arr.makeBy(5, (i) => i),
      moving.model,
      (model) => update(model, new FrameTick({ deltaTime: 5000 })).model,
    );
    expect(done.slide).toBe(null);
    expect(done.bump).toBe(null);
  });
});
