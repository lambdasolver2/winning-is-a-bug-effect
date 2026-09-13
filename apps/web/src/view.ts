/**
 * Game view: foldcn layout over a declarative foldkit canvas board
 * (Dearly: `view.ts`). Everything on screen is a pure function of `(model, h)`.
 *
 * @since 0.1.0
 */
import { Option, Stream } from "effect";
import { Canvas } from "foldkit";
import type { Document, HtmlBuilder } from "foldkit/html";
import { fromEventFilterMap } from "foldkit/subscription";
import { Game } from "@wib/domain";
import { badge } from "./components/ui/badge.js";
import { button } from "./components/ui/button.js";
import { Card } from "./components/ui/card.js";
import {
  closeButton,
  description as dialogDescription,
  footer as dialogFooter,
  header as dialogHeader,
  title as dialogTitle,
  view as dialogView,
} from "./components/ui/dialog.js";
import { Kbd } from "./components/ui/kbd.js";
import { separator } from "./components/ui/separator.js";
import type { AppMessage } from "./app/message.js";
import { FrameTick, GotProofDialogMessage, GotToastMessage, PressedMove } from "./app/message.js";
import type { Model } from "./app/model.js";
import { BOARD_H, BOARD_W, scene } from "./board/scene.js";
import { GameToast } from "./board/toast.js";

/** Key → move mapping (arrows / WASD / space). @category View @since 0.1.0 */
const KEYS: Record<string, Game.Move> = {
  ArrowUp: "Up",
  w: "Up",
  ArrowDown: "Down",
  s: "Down",
  ArrowLeft: "Left",
  a: "Left",
  ArrowRight: "Right",
  d: "Right",
  " ": "Grab",
};

const keyOf = (key: string): Option.Option<Game.Move> => Option.fromNullishOr(KEYS[key]);

const keyStream: Stream.Stream<AppMessage> = fromEventFilterMap<KeyboardEvent, AppMessage>({
  target: typeof document === "undefined" ? new EventTarget() : document,
  type: "keydown",
  toMessage: (event): Option.Option<AppMessage> =>
    Option.map(keyOf(event.key), (move) => {
      event.preventDefault();
      return new PressedMove({ move });
    }),
});

/**
 * Root-node lifecycle stream: document keyboard plus animation-frame ticks.
 * One mount, one merged stream, cleaned up on unmount.
 *
 * @category View
 * @since 0.1.0
 */
export const fxStream: Stream.Stream<AppMessage> = Stream.mergeAll({ concurrency: "unbounded" })([
  keyStream,
  Stream.tick("16 millis").pipe(Stream.map(() => new FrameTick({ deltaTime: 16 }))),
]);

const padButton = (h: HtmlBuilder<AppMessage>, label: string, move: Game.Move) =>
  button(
    {
      onClick: new PressedMove({ move }),
      size: "lg",
      variant: move === "Grab" ? "secondary" : "default",
    },
    label,
    h,
  );

const proofDialog = (
  h: HtmlBuilder<AppMessage>,
  model: Model,
): ReturnType<HtmlBuilder<AppMessage>["div"]> =>
  h.submodel({
    slotId: "proof-dialog",
    model: model.proofDialog,
    view: dialogView,
    toParentMessage: (message) => new GotProofDialogMessage({ message }),
    viewInputs: {
      toView: (render) =>
        h.dialog(
          [...render.dialog],
          [
            h.div([...render.backdrop, h.Class("fixed inset-0 bg-black/60")]),
            h.div(
              [
                ...render.panel,
                h.Class(
                  "fixed left-1/2 top-1/2 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-6",
                ),
              ],
              [
                dialogHeader(
                  {},
                  [
                    dialogTitle({ attributes: render.title }, ["YOU WON?!"], h),
                    dialogDescription(
                      { attributes: render.description },
                      [
                        "Please file a bug: this is mathematically impossible. The certificate holds for every reachable state.",
                      ],
                      h,
                    ),
                  ],
                  h,
                ),
                dialogFooter(
                  {},
                  [closeButton({ attributes: render.closeButton }, ["Keep trying"], h)],
                  h,
                ),
              ],
            ),
          ],
        ),
    },
  });

export const view = (model: Model, h: HtmlBuilder<AppMessage>): Document => {
  const won = Game.isWon(model.board);
  return {
    title: "Winning Is A Bug (Effect-TS)",
    body: h.div(
      [
        h.OnMount({ name: "game-fx", f: () => fxStream }),
        h.Class(
          "flex min-h-screen flex-col items-center gap-5 bg-background px-3 py-6 font-mono text-foreground",
        ),
      ],
      [
        Card<AppMessage>(
          { className: "w-full max-w-[640px] gap-4 border border-border py-4" },
          [
            Card.header<AppMessage>(
              { className: "px-4" },
              [
                Card.title<AppMessage>(
                  {
                    className:
                      "text-[22px] sm:text-[28px] tracking-[4px] text-[#ffd25e] [text-shadow:0_0_18px_rgba(255,210,94,0.35)]",
                  },
                  ["WINNING IS A BUG"],
                  h,
                ),
                Card.description<AppMessage>(
                  {},
                  [
                    "Grab the flag to win. The map wraps around. The room has only two walls. There is a catch: this game ships with a formal proof that winning is impossible. Try anyway.",
                  ],
                  h,
                ),
              ],
              h,
            ),
            Card.content<AppMessage>(
              { className: "px-4" },
              [
                Canvas.view(
                  {
                    width: BOARD_W,
                    height: BOARD_H,
                    shapes: scene(model),
                    className:
                      "mx-auto block h-auto w-full max-w-[528px] rounded-lg border border-border [box-shadow:0_0_40px_rgba(0,0,0,0.5)] [image-rendering:pixelated]",
                  },
                  h,
                ),
              ],
              h,
            ),
            Card.footer<AppMessage>(
              { className: "flex-wrap gap-2" },
              [
                badge({ variant: "outline" }, [`moves ${model.moves}`], h),
                badge({ variant: "outline" }, [`grabs ${model.grabs}`], h),
                badge(
                  { variant: won ? "destructive" : "secondary" },
                  [won ? "YOU WON?!" : "STILL NOT WON"],
                  h,
                ),
                badge(
                  { variant: "outline" },
                  [model.api === null ? "local Effect rules" : `server rules: ${model.api}`],
                  h,
                ),
              ],
              h,
            ),
          ],
          h,
        ),
        separator({ className: "w-full max-w-[640px]" }, h),
        h.div(
          [h.Class("text-xs text-muted-foreground")],
          [
            Kbd({}, ["←", "↑", "↓", "→"], h),
            " / ",
            Kbd({}, ["W", "A", "S", "D"], h),
            " to move · ",
            Kbd({}, ["Space"], h),
            " to grab",
          ],
        ),
        h.div(
          [h.Class("hidden gap-2 [@media(hover:none)]:flex")],
          [
            padButton(h, "←", "Left"),
            padButton(h, "↑", "Up"),
            padButton(h, "↓", "Down"),
            padButton(h, "→", "Right"),
            padButton(h, "GRAB", "Grab"),
          ],
        ),
        h.submodel({
          slotId: model.toasts.id,
          model: model.toasts,
          view: GameToast.view,
          viewInputs: GameToast.styledViewInputs(
            model.toasts,
            {
              position: "TopCenter",
              toContent: (entry, inner) => [inner.p([], [entry.payload.title])],
            },
            h,
          ),
          toParentMessage: (message) => new GotToastMessage({ message }),
        }),
        proofDialog(h, model),
        h.div(
          [h.Class("text-center text-[11px] text-muted-foreground")],
          [
            "the rules run as Effect-TS · the law is winning_is_a_bug · local api: ?api=http://localhost:3000",
            h.br([]),
            "original Bend game by ",
            h.a(
              [
                h.Href("https://github.com/VictorTaelin/winning_is_a_bug"),
                h.Target("_blank"),
                h.Rel("noopener noreferrer"),
              ],
              ["Victor Taelin"],
            ),
          ],
        ),
      ],
    ),
  };
};
