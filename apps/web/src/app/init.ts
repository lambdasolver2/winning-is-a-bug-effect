/**
 * App init (Dearly: `app/init.ts`): answer the cold-open URL once.
 *
 * @since 0.1.0
 */
import type { Command } from "foldkit";
import type { AppMessage } from "./message.js";
import { initialModel, type Model } from "./model.js";

/** `?api=` base URL for remote-rules mode, if present. @category Init @since 0.1.0 */
export const readApiBase = (): string | null => {
  if (typeof window === "undefined") return null;
  const api = new URLSearchParams(window.location.search).get("api");
  return api === null || api === "" ? null : api;
};

export const init = (): {
  readonly model: Model;
  readonly commands?: ReadonlyArray<Command.Command<AppMessage>>;
} => {
  const model = initialModel(null);
  return { model: { ...model, api: readApiBase() } };
};
