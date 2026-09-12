import { SpaceId, SpaceMember, SpaceSummary } from "@dearly/domain";
import { Dialog, Popover } from "@foldkit/ui";
import { Schema } from "effect";
import { Message } from "foldkit";

export const GotSettingsPopoverMessage = Message.m("GotSettingsPopoverMessage", {
  message: Popover.Message,
});
export const GotInviteDialogMessage = Message.m("GotInviteDialogMessage", {
  message: Dialog.Message,
});
export const LoadedInvite = Message.m("LoadedInvite", {
  code: Schema.String,
  summary: SpaceSummary,
});
export const FailedToLoadInvite = Message.m("FailedToLoadInvite", { message: Schema.String });
export const AcceptedInvite = Message.m("AcceptedInvite");
export const DeclinedInvite = Message.m("DeclinedInvite");
export const LoadedSpaces = Message.m("LoadedSpaces", { spaces: Schema.Array(SpaceSummary) });
export const FailedToLoadSpaces = Message.m("FailedToLoadSpaces");
export const SwitchedSpace = Message.m("SwitchedSpace", {
  spaceId: Schema.NullOr(SpaceId),
});
export const CopiedInvite = Message.m("CopiedInvite");
export const SpaceActionFailed = Message.m("SpaceActionFailed", { message: Schema.String });
export const JoinedSpace = Message.m("JoinedSpace", { summary: SpaceSummary });
export const LeftSpace = Message.m("LeftSpace", { spaceId: SpaceId });
export const RequestedCopyInvite = Message.m("RequestedCopyInvite", { url: Schema.String });
export const RequestedLeaveSpace = Message.m("RequestedLeaveSpace", { spaceId: SpaceId });
export const LoadedMembers = Message.m("LoadedMembers", { members: Schema.Array(SpaceMember) });
export const FailedToLoadMembers = Message.m("FailedToLoadMembers");
export const RequestedRemoveMember = Message.m("RequestedRemoveMember", {
  memberOwnerId: Schema.String,
});
export const MemberRemoved = Message.m("MemberRemoved", { memberOwnerId: Schema.String });
export const SwitchedInviteTab = Message.m("SwitchedInviteTab", {
  tab: Schema.Literals(["viewer", "editor"]),
});

export const SpaceMessage = Schema.Union([
  GotSettingsPopoverMessage,
  GotInviteDialogMessage,
  LoadedInvite,
  FailedToLoadInvite,
  AcceptedInvite,
  DeclinedInvite,
  LoadedSpaces,
  FailedToLoadSpaces,
  SwitchedSpace,
  CopiedInvite,
  SpaceActionFailed,
  JoinedSpace,
  LeftSpace,
  RequestedCopyInvite,
  RequestedLeaveSpace,
  LoadedMembers,
  FailedToLoadMembers,
  RequestedRemoveMember,
  MemberRemoved,
  SwitchedInviteTab,
]);
export type SpaceMessage = Schema.Schema.Type<typeof SpaceMessage>;
