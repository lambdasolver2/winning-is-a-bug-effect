/**
 * The laws. The human states them; `Cert.ts` must prove them.
 *
 * HUMAN FILE — do not edit without review. `Cert.ts` (the machine's file)
 * must discharge every claim below; `npm run check` is the whole
 * verification and it fails the moment a law stops holding.
 *
 * Law (port of `laws.bend`):
 *   For any sequence of moves, applying it to the initial game state
 *   doesn't result in victory.
 *
 * @since 0.1.0
 */
import * as Game from "./game.js";

/** Law identifier, pinned so Cert and tests reference one wall. @category Laws @since 0.1.0 */
export const WINNING_IS_A_BUG = "winning_is_a_bug" as const;

/** Human-readable statement of the law. @category Laws @since 0.1.0 */
export const WINNING_IS_A_BUG_STATEMENT =
  "For any sequence of moves, applying it to the initial game state doesn't result in victory." as const;

/**
 * The claim, as a runtime check for one move sequence: the final board
 * must not be won.
 *
 * @category Laws
 * @since 0.1.0
 */
export const winningIsABug = (moves: ReadonlyArray<Game.Move>): boolean =>
  !Game.isWon(Game.apply(Game.init(), moves));

/**
 * Seal marker: Laws.ts exports no constructors or mutators — only the
 * predicate above. The module object is frozen to make accidental
 * tampering loud instead of silent.
 *
 * @category Laws
 * @since 0.1.0
 */
export const LAWS = Object.freeze({
  id: WINNING_IS_A_BUG,
  statement: WINNING_IS_A_BUG_STATEMENT,
  check: winningIsABug,
} as const);
