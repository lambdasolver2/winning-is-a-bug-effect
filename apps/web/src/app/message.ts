/**
 * Game UI messages: fact-named events flowing into `update`.
 *
 * @since 0.1.0
 */
import { Schema } from "effect";
import { Game } from "@wib/domain";
import { Message as ProofDialogMessage } from "../components/ui/dialog.js";
import { GameToast } from "../board/toast.js";

/** Player pressed a move (keyboard or pad button). @category Messages @since 0.1.0 */
export class PressedMove extends Schema.TaggedClass<PressedMove>()("PressedMove", {
  move: Game.Move,
}) {}
/** Animation frame tick (delta ms, capped by update). @category Messages @since 0.1.0 */
export class FrameTick extends Schema.TaggedClass<FrameTick>()("FrameTick", {
  deltaTime: Schema.Number,
}) {}
/** Remote server answered a move (command result, not a submodel). @category Messages @since 0.1.0 */
export class ReceivedRemoteBoard extends Schema.TaggedClass<ReceivedRemoteBoard>()(
  "ReceivedRemoteBoard",
  {
    board: Game.Game,
    move: Game.Move,
  },
) {}
/** Remote server call failed. @category Messages @since 0.1.0 */
export class RemoteMoveFailed extends Schema.TaggedClass<RemoteMoveFailed>()("RemoteMoveFailed", {
  reason: Schema.String,
}) {}
/** Toast stack submodel message. @category Messages @since 0.1.0 */
export class GotToastMessage extends Schema.TaggedClass<GotToastMessage>()("GotToastMessage", {
  message: GameToast.Message,
}) {}
/** Proof dialog submodel message. @category Messages @since 0.1.0 */
export class GotProofDialogMessage extends Schema.TaggedClass<GotProofDialogMessage>()(
  "GotProofDialogMessage",
  { message: ProofDialogMessage },
) {}

/** Every message the app handles, exhaustively. @category Messages @since 0.1.0 */
export const AppMessage = Schema.Union([
  PressedMove,
  FrameTick,
  ReceivedRemoteBoard,
  RemoteMoveFailed,
  GotToastMessage,
  GotProofDialogMessage,
]);
export type AppMessage = typeof AppMessage.Type;
