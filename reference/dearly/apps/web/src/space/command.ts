import { SpaceId } from "@dearly/domain";
import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import * as rpc from "../rpc";
import {
  CopiedInvite,
  FailedToLoadInvite,
  FailedToLoadMembers,
  FailedToLoadSpaces,
  JoinedSpace,
  LeftSpace,
  LoadedInvite,
  LoadedMembers,
  LoadedSpaces,
  MemberRemoved,
  SpaceActionFailed,
} from "./message";

export const loadSpaces = Command.define(
  "loadSpaces",
  LoadedSpaces,
  FailedToLoadSpaces,
)(
  rpc.listSpaces.pipe(
    Effect.map((spaces) => LoadedSpaces({ spaces })),
    Effect.tapError((error) => Effect.logError("[loadSpaces] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToLoadSpaces())),
  ),
);

export const previewInvite = Command.define(
  "previewInvite",
  { code: Schema.String },
  LoadedInvite,
  FailedToLoadInvite,
)(({ code }) =>
  rpc.previewInviteByCode(code).pipe(
    Effect.map((summary) => LoadedInvite({ code, summary })),
    Effect.tapError((error) => Effect.logError("[previewInvite] Failed", error)),
    Effect.catch((error) => Effect.succeed(FailedToLoadInvite({ message: error.message }))),
  ),
);

export const joinSpaceByCode = Command.define(
  "joinSpaceByCode",
  { code: Schema.String },
  JoinedSpace,
  SpaceActionFailed,
)(({ code }) =>
  rpc.joinSpaceByCode(code).pipe(
    Effect.map((summary) => JoinedSpace({ summary })),
    Effect.tapError((error) => Effect.logError("[joinSpace] Failed", error)),
    // The server already phrases these for the user ("This invite link is not
    // valid"), so show that instead of one generic notification for everything.
    Effect.catch((error) => Effect.succeed(SpaceActionFailed({ message: error.message }))),
  ),
);

export const copyInviteLink = Command.define(
  "copyInviteLink",
  { url: Schema.String },
  CopiedInvite,
  SpaceActionFailed,
)(({ url }) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: (error) => error,
  }).pipe(
    Effect.as(CopiedInvite()),
    Effect.tapError((error) => Effect.logError("[copyInviteLink] Failed", error)),
    Effect.catch(() =>
      Effect.succeed(SpaceActionFailed({ message: "Could not copy the invite link" })),
    ),
  ),
);

export const leaveSpaceById = Command.define(
  "leaveSpaceById",
  { spaceId: SpaceId },
  LeftSpace,
  SpaceActionFailed,
)(({ spaceId }) =>
  rpc.leaveSpaceById(spaceId).pipe(
    Effect.map(() => LeftSpace({ spaceId })),
    Effect.tapError((error) => Effect.logError("[leaveSpace] Failed", error)),
    Effect.catch((error) => Effect.succeed(SpaceActionFailed({ message: error.message }))),
  ),
);

export const loadMembers = Command.define(
  "loadMembers",
  { spaceId: SpaceId },
  LoadedMembers,
  FailedToLoadMembers,
)(({ spaceId }) =>
  rpc.listMembersBySpaceId(spaceId).pipe(
    Effect.map((members) => LoadedMembers({ members })),
    Effect.tapError((error) => Effect.logError("[loadMembers] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToLoadMembers())),
  ),
);

export const removeMemberFromSpace = Command.define(
  "removeMemberFromSpace",
  { spaceId: SpaceId, memberOwnerId: Schema.String },
  MemberRemoved,
  SpaceActionFailed,
)(({ spaceId, memberOwnerId }) =>
  rpc.removeMemberById(spaceId, memberOwnerId).pipe(
    Effect.map(() => MemberRemoved({ memberOwnerId })),
    Effect.tapError((error) => Effect.logError("[removeMember] Failed", error)),
    Effect.catch((error) => Effect.succeed(SpaceActionFailed({ message: error.message }))),
  ),
);
