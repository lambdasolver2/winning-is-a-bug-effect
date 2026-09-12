import { Dialog, Popover } from "@foldkit/ui";
import { Match } from "effect";
import { Command } from "foldkit";
import { copyInviteLink, joinSpaceByCode, leaveSpaceById, removeMemberFromSpace } from "./command";
import { persistActiveSpaceId } from "./model";
import { GotInviteDialogMessage, GotSettingsPopoverMessage, type SpaceMessage } from "./message";
import type { Model } from "./model";

type UpdateResult = readonly [Model, ReadonlyArray<Command.Command<SpaceMessage>>];

const mapPopover = (commands: ReadonlyArray<Command.Command<Popover.Message>>) =>
  Command.mapMessages(commands, (message) => GotSettingsPopoverMessage({ message }));

const mapInviteDialog = (commands: ReadonlyArray<Command.Command<Dialog.Message>>) =>
  Command.mapMessages(commands, (message) => GotInviteDialogMessage({ message }));

export const update = (model: Model, message: SpaceMessage): UpdateResult =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      GotSettingsPopoverMessage: ({ message: popoverMessage }): UpdateResult => {
        const [settingsPopover, commands] = Popover.update(model.settingsPopover, popoverMessage);
        return [{ ...model, settingsPopover }, mapPopover(commands)];
      },
      GotInviteDialogMessage: ({ message: dialogMessage }): UpdateResult => {
        const [inviteDialog, commands] = Dialog.update(model.inviteDialog, dialogMessage);
        return [{ ...model, inviteDialog }, mapInviteDialog(commands)];
      },
      LoadedInvite: ({ code, summary }): UpdateResult => {
        const [inviteDialog, commands] = Dialog.open(model.inviteDialog);
        return [
          { ...model, inviteDialog, pendingInvite: { code, summary } },
          mapInviteDialog(commands),
        ];
      },
      FailedToLoadInvite: (): UpdateResult => {
        const [inviteDialog, commands] = Dialog.close(model.inviteDialog);
        return [{ ...model, inviteDialog, pendingInvite: null }, mapInviteDialog(commands)];
      },
      AcceptedInvite: (): UpdateResult => {
        const [inviteDialog, commands] = Dialog.close(model.inviteDialog);
        const pending = model.pendingInvite;
        return [
          { ...model, inviteDialog },
          [
            ...mapInviteDialog(commands),
            ...(pending === null ? [] : [joinSpaceByCode({ code: pending.code })]),
          ],
        ];
      },
      DeclinedInvite: (): UpdateResult => {
        const [inviteDialog, commands] = Dialog.close(model.inviteDialog);
        return [{ ...model, inviteDialog, pendingInvite: null }, mapInviteDialog(commands)];
      },
      LoadedSpaces: ({ spaces }): UpdateResult => [{ ...model, spaces }, []],
      FailedToLoadSpaces: (): UpdateResult => [model, []],
      SwitchedSpace: ({ spaceId }): UpdateResult => {
        persistActiveSpaceId(spaceId);
        const [settingsPopover, commands] = Popover.close(model.settingsPopover);
        return [{ ...model, activeSpaceId: spaceId, settingsPopover }, mapPopover(commands)];
      },
      CopiedInvite: (): UpdateResult => [model, []],
      SpaceActionFailed: (): UpdateResult => [model, []],
      JoinedSpace: ({ summary }): UpdateResult => {
        persistActiveSpaceId(summary.space.id);
        const spaces = model.spaces.some((item) => item.space.id === summary.space.id)
          ? model.spaces
          : [...model.spaces, summary];
        return [{ ...model, spaces, activeSpaceId: summary.space.id, pendingInvite: null }, []];
      },
      LeftSpace: ({ spaceId }): UpdateResult => {
        const next = model.spaces.filter((item) => item.space.id !== spaceId);
        const isActive = model.activeSpaceId === spaceId;
        if (isActive) persistActiveSpaceId(null);
        return [
          { ...model, spaces: next, activeSpaceId: isActive ? null : model.activeSpaceId },
          [],
        ];
      },
      RequestedCopyInvite: ({ url }): UpdateResult => [model, [copyInviteLink({ url })]],
      RequestedLeaveSpace: ({ spaceId }): UpdateResult => [model, [leaveSpaceById({ spaceId })]],
      LoadedMembers: ({ members }): UpdateResult => [{ ...model, members }, []],
      FailedToLoadMembers: (): UpdateResult => [model, []],
      RequestedRemoveMember: ({ memberOwnerId }): UpdateResult => {
        const owned = model.spaces.find((item) => item.role === "owner");
        return owned === undefined
          ? [model, []]
          : [model, [removeMemberFromSpace({ spaceId: owned.space.id, memberOwnerId })]];
      },
      MemberRemoved: ({ memberOwnerId }): UpdateResult => [
        { ...model, members: model.members.filter((item) => item.ownerId !== memberOwnerId) },
        [],
      ],
      SwitchedInviteTab: ({ tab }): UpdateResult => [{ ...model, inviteTab: tab }, []],
    }),
  );
