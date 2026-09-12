/**
 * Game UI model (foldkit): one Schema-defined Model as the single source
 * of truth. The board itself reuses the verified `Game` schema, so the UI
 * can never represent an illegal position.
 *
 * @since 0.1.0
 */
import { Schema } from "effect";
import { Game } from "@wib/domain";
import { init as ProofDialogInit, Model as ProofDialogModel } from "../components/ui/dialog.js";
import { GameToast } from "../board/toast.js";

/** Non-negative counter. @category Model @since 0.1.0 */
const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).annotate({
  identifier: "Count",
  description: "Non-negative HUD counter.",
});

/**
 * Entire UI state: verified board, HUD counters, toast, animation clock,
 * slide/bump animation state, optional remote-rules server (`?api=`),
 * and the proof dialog.
 *
 * @category Model
 * @since 0.1.0
 */
/** Player slide animation (from/to cells plus start time). @category Model @since 0.1.0 */
export class Slide extends Schema.Class<Slide>("Slide")({
  fx: Schema.Number,
  fy: Schema.Number,
  tx: Schema.Number,
  ty: Schema.Number,
  t0: Schema.Number,
}) {}

/** Wall bump animation (direction plus start time). @category Model @since 0.1.0 */
export class Bump extends Schema.Class<Bump>("Bump")({
  dx: Schema.Number,
  dy: Schema.Number,
  t0: Schema.Number,
}) {}

export class Model extends Schema.Class<Model>("Model")({
  board: Game.Game,
  moves: Count,
  grabs: Count,
  toasts: GameToast.Model,
  now: Schema.Number,
  slide: Schema.Union([Schema.Null, Slide]),
  bump: Schema.Union([Schema.Null, Bump]),
  api: Schema.Union([Schema.Null, Schema.String]),
  proofDialog: ProofDialogModel,
}) {}

/**
 * Initial model: verified start state, zeroed HUD, no toast, closed dialog.
 *
 * @category Model
 * @since 0.1.0
 */
export const initialModel = (api: string | null): Model => ({
  board: Game.init(),
  moves: 0,
  grabs: 0,
  toasts: GameToast.init({ id: "game-toasts" }),
  now: 0,
  slide: null,
  bump: null,
  api,
  proofDialog: ProofDialogInit({ id: "proof-dialog" }),
});
