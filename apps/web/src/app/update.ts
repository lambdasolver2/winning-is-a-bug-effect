/**
 * Game UI update: one exhaustive function over every message
 * (Dearly: `app/update.ts` with `Match.tagsExhaustive`).
 *
 * @since 0.1.0
 */
import { Match } from "effect";
import { Command } from "foldkit";
import { Game } from "@wib/domain";
import {
  open as openProofDialog,
  update as updateProofDialog,
  type Message as DialogMessage,
} from "../components/ui/dialog.js";
import { GameToast, type ToastMessage } from "../board/toast.js";
import { ApplyRemoteMove } from "./command.js";
import { GotProofDialogMessage, GotToastMessage, type AppMessage } from "./message.js";
import type { Model } from "./model.js";

type UpdateResult = {
  readonly model: Model;
  readonly commands?: ReadonlyArray<Command.Command<AppMessage>>;
};

const mapDialog = (
  commands: ReadonlyArray<Command.Command<DialogMessage>>,
): ReadonlyArray<Command.Command<AppMessage>> =>
  Command.mapMessages(commands, (msg) => new GotProofDialogMessage({ message: msg }));

const showToast = (model: Model, title: string): UpdateResult => {
  const result = GameToast.show(model.toasts, { payload: { title } });
  return {
    model: { ...model, toasts: result.model },
    commands: Command.mapMessages(
      result.commands ?? [],
      (msg) => new GotToastMessage({ message: msg }),
    ),
  };
};

const delegateToToasts = (model: Model, message: ToastMessage): UpdateResult => {
  const result = GameToast.update(model.toasts, message);
  return {
    model: { ...model, toasts: result.model },
    commands: Command.mapMessages(
      result.commands ?? [],
      (msg) => new GotToastMessage({ message: msg }),
    ),
  };
};

const settled = (model: Model, board: Game.Game, move: Game.Move): UpdateResult => {
  const stepped =
    move === "Grab"
      ? { board, moves: model.moves, grabs: model.grabs + 1 }
      : { board, moves: model.moves + 1, grabs: model.grabs };
  const dx = board.x - model.board.x;
  const dy = board.y - model.board.y;
  const moved = dx !== 0 || dy !== 0;
  const adjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
  const next: Model = {
    ...model,
    ...stepped,
    slide:
      move === "Grab" || !moved || !adjacent
        ? null
        : { fx: model.board.x, fy: model.board.y, tx: board.x, ty: board.y, t0: model.now },
    bump:
      move === "Grab" || moved
        ? null
        : {
            dx: move === "Up" ? 0 : move === "Down" ? 0 : move === "Left" ? -1 : 1,
            dy: move === "Up" ? -1 : move === "Down" ? 1 : 0,
            t0: model.now,
          },
  };
  if (Game.isWon(board)) {
    const opened = openProofDialog(next.proofDialog);
    return {
      model: { ...next, proofDialog: opened.model },
      commands: mapDialog(opened.commands ?? []),
    };
  }
  if (move === "Grab" && !Game.isWon(board)) return showToast(next, "nothing to grab here");
  return { model: next };
};

const delegateToDialog = (model: Model, message: DialogMessage): UpdateResult => {
  const result = updateProofDialog(model.proofDialog, message);
  return {
    model: { ...model, proofDialog: result.model },
    commands: mapDialog(result.commands ?? []),
  };
};

export const update = (model: Model, message: AppMessage): UpdateResult =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      PressedMove: ({ move }): UpdateResult =>
        model.api === null
          ? settled(model, Game.step(model.board, move), move)
          : {
              model,
              commands: [ApplyRemoteMove({ api: model.api, board: model.board, move })],
            },
      ReceivedRemoteBoard: ({ board, move }): UpdateResult => settled(model, board, move),
      RemoteMoveFailed: ({ reason }): UpdateResult => showToast(model, reason),
      GotToastMessage: ({ message: child }): UpdateResult => delegateToToasts(model, child),
      FrameTick: ({ deltaTime }): UpdateResult => {
        const now = model.now + Math.min(deltaTime, 32);
        const slideDone = model.slide === null || now - model.slide.t0 >= 90;
        const bumpDone = model.bump === null || now - model.bump.t0 >= 120;
        return {
          model: {
            ...model,
            now,
            slide: slideDone ? null : model.slide,
            bump: bumpDone ? null : model.bump,
          },
        };
      },
      GotProofDialogMessage: ({ message: child }): UpdateResult => delegateToDialog(model, child),
    }),
  );
