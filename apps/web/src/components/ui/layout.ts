/**
 * Typed layout primitives: the only hand-rolled builders allowed.
 * Responsive-correct defaults are encoded in the classes, so composing
 * them cannot reproduce the clipping bugs raw divs allowed (unwrapped
 * rows, unpadded full-bleed columns). Same `(config, children, h)` shape
 * as foldcn builders.
 *
 * @since 0.1.0
 */
import type { Html, HtmlBuilder } from "foldkit/html";

import { cn } from "@/lib/utils";

type Child = Html | string;

type SpacingConfig = Readonly<{
  className?: string;
  gap?: "none" | "sm" | "md" | "lg";
}>;

const gapClass = (gap: SpacingConfig["gap"]): string => {
  if (gap === "none") return "";
  if (gap === "sm") return "gap-2";
  if (gap === "lg") return "gap-6";
  return "gap-4";
};

/** Page column: centered, padded, max width. Replaces ad-hoc wrappers. */
export const page = <M>(
  config: SpacingConfig,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(
        cn(
          "mx-auto flex min-h-screen w-full max-w-[640px] flex-col items-center px-3 py-6",
          gapClass(config.gap),
          config.className,
        ),
      ),
      h.DataAttribute("slot", "page"),
    ],
    children,
  );

/** Horizontal row. Wraps by default so pills never clip on narrow screens. */
export const row = <M>(
  config: SpacingConfig & Readonly<{ align?: "center" | "start" | "end" }>,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(
        cn(
          "flex flex-row flex-wrap",
          config.align === "start"
            ? "items-start"
            : config.align === "end"
              ? "items-end"
              : "items-center",
          gapClass(config.gap),
          config.className,
        ),
      ),
      h.DataAttribute("slot", "row"),
    ],
    children,
  );

/** Vertical stack. */
export const column = <M>(
  config: SpacingConfig & Readonly<{ align?: "center" | "start" | "stretch" }>,
  children: ReadonlyArray<Child>,
  h: HtmlBuilder<M>,
): Html =>
  h.div(
    [
      h.Class(
        cn(
          "flex flex-col",
          config.align === "start"
            ? "items-start"
            : config.align === "stretch"
              ? "items-stretch"
              : "items-center",
          gapClass(config.gap),
          config.className,
        ),
      ),
      h.DataAttribute("slot", "column"),
    ],
    children,
  );
