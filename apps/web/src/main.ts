/**
 * Game application wiring (Dearly: `main.ts`): pure definitions only —
 * no runtime boot here, so tests import this without side effects.
 *
 * @since 0.1.0
 */
import { Runtime } from "foldkit";
import { init } from "./app/init.js";
import { Model } from "./app/model.js";
import { update } from "./app/update.js";
import { view } from "./view.js";

export const application = Runtime.makeApplication({
  Model,
  init: () => init(),
  update,
  view,
  container: typeof document === "undefined" ? null : document.getElementById("root"),
});
