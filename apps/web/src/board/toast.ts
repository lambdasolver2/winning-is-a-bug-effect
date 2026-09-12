/**
 * Game toast stack: foldcn Toast submodel bound to a title payload.
 * Replaces any hand-rolled toast div — auto-dismiss, hover-pause and
 * stacking come from the component, not from custom commands.
 *
 * @since 0.1.0
 */
import { Schema } from "effect";
import { make as makeToast } from "../components/ui/toast.js";

/** Title-only toast payload. @category Toast @since 0.1.0 */
export class ToastPayload extends Schema.Class<ToastPayload>("ToastPayload")({
  title: Schema.String,
}) {}

/** Bound toast submodel module. @category Toast @since 0.1.0 */
export const GameToast = makeToast(ToastPayload);

/** Toast stack model type. @category Toast @since 0.1.0 */
export type ToastModel = typeof GameToast.Model.Type;
/** Toast stack message type. @category Toast @since 0.1.0 */
export type ToastMessage = typeof GameToast.Message.Type;
