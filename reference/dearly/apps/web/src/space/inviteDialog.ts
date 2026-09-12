import { Button, Dialog } from "@foldkit/ui";
import { Html } from "foldkit";
import type { AppMessage } from "../app/message";
import { GotSpaceMessage } from "../app/message";
import { AcceptedInvite, DeclinedInvite, GotInviteDialogMessage } from "./message";
import type { Model } from "./model";

type HtmlFactory = ReturnType<typeof Html.html<AppMessage>>;

const roleBlurb = (role: string) =>
  role === "editor"
    ? "Editors can write entries, add photos, and change what's already there."
    : "Viewers can read every entry, but nothing they do changes the diary.";

export const InviteDialog = (h: HtmlFactory, model: Model): ReturnType<HtmlFactory["submodel"]> =>
  h.submodel({
    slotId: "join-space",
    model: model.inviteDialog,
    view: Dialog.view,
    toParentMessage: (message) => GotSpaceMessage({ message: GotInviteDialogMessage({ message }) }),
    viewInputs: {
      toView: ({ dialog, backdrop, panel, title, description, closeButton, isVisible }) => {
        const pending = model.pendingInvite;
        // The owner opened their own link: there is nothing to accept.
        const isOwn = pending !== null && pending.summary.role === "owner";

        return h.dialog(
          [...dialog],
          [
            isVisible && pending !== null
              ? h.div(
                  [],
                  [
                    h.div([...backdrop, h.Class("fixed inset-0 bg-ink/30")], []),
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          "fixed top-1/2 left-1/2 w-[min(90vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-line bg-paper p-6 shadow-[var(--shadow)]",
                        ),
                      ],
                      [
                        h.p(
                          [h.Class("font-note text-[10px] tracking-[.18em] text-wine uppercase")],
                          [isOwn ? "YOUR OWN SPACE" : "SHARED DIARY"],
                        ),
                        h.h2(
                          [...title, h.Class("mt-2 font-display text-3xl leading-tight")],
                          [
                            isOwn
                              ? `“${pending.summary.space.name}” is yours`
                              : `Join “${pending.summary.space.name}”?`,
                          ],
                        ),
                        isOwn
                          ? h.p(
                              [...description, h.Class("mt-3 text-sm leading-6 text-muted")],
                              ["This is the link you share with other people, so keep it handy."],
                            )
                          : h.div(
                              [...description, h.Class("mt-3")],
                              [
                                h.p(
                                  [h.Class("text-sm leading-6 text-muted")],
                                  [
                                    pending.summary.ownerName === null
                                      ? "You've been invited as "
                                      : `${pending.summary.ownerName} invited you as `,
                                    h.span(
                                      [h.Class("font-medium text-ink")],
                                      [pending.summary.role],
                                    ),
                                    ".",
                                  ],
                                ),
                                h.p(
                                  [h.Class("mt-1 text-sm leading-6 text-muted")],
                                  [roleBlurb(pending.summary.role)],
                                ),
                              ],
                            ),
                        h.div(
                          [h.Class("mt-6 flex justify-end gap-3")],
                          [
                            h.button(
                              [
                                ...closeButton,
                                h.OnClick(GotSpaceMessage({ message: DeclinedInvite() })),
                                h.Class("px-3 py-2 text-sm hover:text-wine"),
                              ],
                              [isOwn ? "Close" : "No thanks"],
                            ),
                            isOwn
                              ? h.span([], [])
                              : Button.view<AppMessage>({
                                  onClick: GotSpaceMessage({ message: AcceptedInvite() }),
                                  toView: ({ button }) =>
                                    h.button(
                                      [
                                        ...button,
                                        h.Class(
                                          "rounded-[var(--radius)] bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-85",
                                        ),
                                      ],
                                      ["Join space"],
                                    ),
                                }),
                          ],
                        ),
                      ],
                    ),
                  ],
                )
              : null,
          ],
        );
      },
    },
  });
