import { SpaceId, SpaceMember, SpaceSummary } from "@dearly/domain";
import { Dialog, Popover } from "@foldkit/ui";
import { Option, Schema } from "effect";

const STORAGE_KEY = "dearly.activeSpaceId";

// Anything but a SpaceId in storage (hand-edited, or left by an older build)
// is treated as "no active space" rather than sent to the server.
export const readStoredSpaceId = (): SpaceId | null => {
  try {
    return Option.getOrNull(Schema.decodeUnknownOption(SpaceId)(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return null;
  }
};

export const persistActiveSpaceId = (spaceId: SpaceId | null): void => {
  try {
    if (spaceId === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, spaceId);
  } catch {
    // Private browsing etc. — switching just won't survive a reload.
  }
};

export const Model = Schema.Struct({
  spaces: Schema.Array(SpaceSummary),
  members: Schema.Array(SpaceMember),
  activeSpaceId: Schema.NullOr(SpaceId),
  settingsPopover: Popover.Model,
  inviteTab: Schema.Literals(["viewer", "editor"]),
  // An invite link that has been opened but not answered yet.
  pendingInvite: Schema.NullOr(Schema.Struct({ code: Schema.String, summary: SpaceSummary })),
  inviteDialog: Dialog.Model,
});
export type Model = Schema.Schema.Type<typeof Model>;

export const initialModel = (): Model => ({
  spaces: [],
  members: [],
  activeSpaceId: readStoredSpaceId(),
  settingsPopover: Popover.init({ id: "space-settings" }),
  inviteTab: "viewer",
  pendingInvite: null,
  inviteDialog: Dialog.init({ id: "join-space" }),
});

// The active space; a null activeSpaceId means the owner's own space.
export const activeSummary = (model: Model): SpaceSummary | undefined =>
  model.activeSpaceId === null
    ? model.spaces.find((summary) => summary.role === "owner")
    : model.spaces.find((summary) => summary.space.id === model.activeSpaceId);

export const isOwnedActive = (model: Model): boolean => activeRole(model) === "owner";

export const activeRole = (model: Model): string | null => activeSummary(model)?.role ?? null;
