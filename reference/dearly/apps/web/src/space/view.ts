import type { SpaceMember, SpaceSummary } from "@dearly/domain";
import { Popover } from "@foldkit/ui";
import { Html } from "foldkit";
import { Copy, LogOut, Settings, X } from "lucide";
import type { AppMessage } from "../app/message";
import { GotSpaceMessage, RequestedLogout } from "../app/message";
import { icon } from "../components/icon";
import { activeSummary, isOwnedActive, type Model } from "./model";
import {
  GotSettingsPopoverMessage,
  RequestedCopyInvite,
  RequestedLeaveSpace,
  RequestedRemoveMember,
  SpaceMessage,
  SwitchedInviteTab,
  SwitchedSpace,
} from "./message";

type HtmlFactory = ReturnType<typeof Html.html<AppMessage>>;

const space = (message: SpaceMessage): AppMessage => GotSpaceMessage({ message });

const shortId = (id: string) => id.slice(0, 8);

const spaceRow = (h: HtmlFactory, summary: SpaceSummary, isActive: boolean) =>
  h.div(
    [
      h.Class(
        `flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isActive ? "border-wine bg-wine/10 text-wine" : "border-line bg-card"}`,
      ),
    ],
    [
      h.button(
        [
          h.OnClick(
            space(SwitchedSpace({ spaceId: summary.role === "owner" ? null : summary.space.id })),
          ),
          h.Class("flex min-w-0 grow items-center justify-between gap-2 text-left"),
        ],
        [
          h.span(
            [h.Class("flex min-w-0 flex-col")],
            [
              h.span([h.Class("truncate")], [summary.space.name]),
              // Everyone's diary is called "My diary", so the owner is what
              // actually tells two rows apart.
              summary.role === "owner"
                ? h.span([], [])
                : h.span(
                    [h.Class("truncate font-note text-[10px] text-muted")],
                    [
                      summary.ownerName === null
                        ? "shared with you"
                        : `${summary.ownerName}'s diary`,
                    ],
                  ),
            ],
          ),
          h.span(
            [h.Class("shrink-0 font-note text-[10px] tracking-[.12em] text-muted uppercase")],
            [summary.role],
          ),
        ],
      ),
      summary.role === "owner"
        ? h.span([], [])
        : h.button(
            [
              h.OnClick(space(RequestedLeaveSpace({ spaceId: summary.space.id }))),
              h.AriaLabel(`Leave ${summary.space.name}`),
              h.Class(
                "flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 font-note text-[10px] uppercase hover:border-wine/40",
              ),
            ],
            [icon(h, LogOut, "Leave")],
          ),
    ],
  );

const memberRow = (h: HtmlFactory, member: SpaceMember) =>
  h.div(
    [h.Class("flex items-center justify-between gap-2 rounded-md bg-card px-2 py-1.5 text-xs")],
    [
      h.span(
        [h.Class(member.displayName === null ? "font-mono text-[11px]" : "truncate text-[12px]")],
        [member.displayName ?? shortId(member.ownerId)],
      ),
      h.div(
        [h.Class("flex items-center gap-2")],
        [
          h.span(
            [h.Class("font-note text-[10px] tracking-[.12em] text-muted uppercase")],
            [member.role],
          ),
          member.role === "owner"
            ? h.span([], [])
            : h.button(
                [
                  h.OnClick(space(RequestedRemoveMember({ memberOwnerId: member.ownerId }))),
                  h.AriaLabel(`Remove ${shortId(member.ownerId)}`),
                  h.Class("rounded-md border border-line p-1 hover:border-wine/40"),
                ],
                [icon(h, X, "Remove")],
              ),
        ],
      ),
    ],
  );

const settingsContent = (h: HtmlFactory, model: Model) => {
  const active = activeSummary(model);
  const owned = model.spaces.find((summary) => summary.role === "owner");
  const inviteUrls =
    owned === undefined
      ? null
      : {
          viewer: `${window.location.origin}/join/${owned.space.viewerInviteCode}`,
          editor: `${window.location.origin}/join/${owned.space.editorInviteCode}`,
        };
  const inviteTabButton = (tab: "viewer" | "editor") =>
    h.button(
      [
        h.OnClick(space(SwitchedInviteTab({ tab }))),
        h.Class(
          `flex-1 rounded-md border px-2 py-1 font-note text-[10px] uppercase ${model.inviteTab === tab ? "border-wine bg-wine/10 text-wine" : "border-line bg-card"}`,
        ),
      ],
      [tab],
    );

  const inviteLink = (url: string) =>
    h.div(
      [h.Class("mt-2 flex min-w-0 items-center gap-2")],
      [
        h.code(
          [h.Attribute("class", "min-w-0 grow truncate rounded-md bg-card px-2 py-1.5 text-xs")],
          [url],
        ),
        h.button(
          [
            h.OnClick(space(RequestedCopyInvite({ url }))),
            h.AriaLabel(`Copy ${model.inviteTab} invite link`),
            h.Class(
              "flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1.5 font-note text-[11px] uppercase hover:border-wine/40",
            ),
          ],
          [icon(h, Copy, "Copy"), "Copy"],
        ),
      ],
    );

  return [
    h.h2([h.Class("border-b border-line pb-3 font-display text-lg")], ["Spaces"]),
    h.div(
      [h.Class("mt-3 flex flex-col gap-2")],
      [
        ...model.spaces.map((summary) =>
          spaceRow(h, summary, summary.space.id === active?.space.id),
        ),
      ],
    ),
    inviteUrls === null
      ? h.p([h.Class("mt-4 font-note text-xs text-muted")], ["Loading your space…"])
      : h.div(
          [h.Class("mt-4 border-t border-line pt-3")],
          [
            h.p(
              [h.Class("font-note text-[10px] tracking-[.12em] text-muted uppercase")],
              [`Invite links · ${owned?.space.name}`],
            ),
            isOwnedActive(model)
              ? h.span([], [])
              : h.p(
                  [h.Class("mt-1 font-note text-[11px] text-muted")],
                  ["This invites people to your own diary."],
                ),
            h.div(
              [h.Class("mt-2 flex gap-1.5")],
              [inviteTabButton("viewer"), inviteTabButton("editor")],
            ),
            inviteLink(model.inviteTab === "viewer" ? inviteUrls.viewer : inviteUrls.editor),
            model.members.length === 0
              ? h.span([], [])
              : h.div(
                  [h.Class("mt-3 flex flex-col gap-1.5")],
                  [
                    h.p(
                      [h.Class("font-note text-[10px] tracking-[.12em] text-muted uppercase")],
                      ["Members"],
                    ),
                    ...model.members.map((member) => memberRow(h, member)),
                  ],
                ),
          ],
        ),
    h.button(
      [
        h.OnClick(RequestedLogout()),
        h.Class(
          "mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 font-note text-[11px] uppercase text-muted hover:border-wine/40 hover:text-wine",
        ),
      ],
      [icon(h, LogOut, "Log out"), "Log out"],
    ),
  ];
};

export const SettingsPopover = (h: HtmlFactory, model: Model): ReturnType<HtmlFactory["div"]> =>
  h.submodel({
    slotId: "space-settings",
    model: model.settingsPopover,
    view: Popover.view,
    toParentMessage: (message) => space(GotSettingsPopoverMessage({ message })),
    viewInputs: {
      anchor: { placement: "bottom-end", gap: 8, padding: 8 },
      ariaLabel: "Open space settings",
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [],
          [
            h.button(
              [
                ...button,
                h.Class(
                  "flex min-h-10 items-center gap-1 rounded-md font-note text-[11px] tracking-[.1em] text-muted uppercase hover:bg-rose/20 hover:text-wine md:min-h-0 md:rounded-none md:bg-transparent",
                ),
              ],
              [icon(h, Settings, "Spaces"), h.span([], ["Spaces"])],
            ),
            isVisible
              ? h.div(
                  [],
                  [
                    h.div([...backdrop, h.Class("fixed inset-0 z-30")], []),
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          "z-40 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-line bg-paper p-4 shadow-[var(--shadow)]",
                        ),
                      ],
                      settingsContent(h, model),
                    ),
                  ],
                )
              : h.span([], []),
          ],
        ),
    },
  });
