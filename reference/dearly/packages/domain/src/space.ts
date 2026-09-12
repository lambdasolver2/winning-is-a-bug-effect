import { Schema } from "effect";
import { OwnerId, SpaceId } from "./ids";

export const SpaceRole = Schema.Literals(["owner", "editor", "viewer"]);
export type SpaceRole = typeof SpaceRole.Type;

export const Space = Schema.Struct({
  id: SpaceId,
  name: Schema.String,
  ownerId: OwnerId,
  viewerInviteCode: Schema.String,
  editorInviteCode: Schema.String,
  createdAt: Schema.DateTimeUtc,
});
export type Space = typeof Space.Type;

export const SpaceMember = Schema.Struct({
  spaceId: SpaceId,
  ownerId: OwnerId,
  role: SpaceRole,
  joinedAt: Schema.DateTimeUtc,
  // The part of the member's email before the "@", or null until they have
  // opened the app once. Never the full address.
  displayName: Schema.NullOr(Schema.String),
});
export type SpaceMember = typeof SpaceMember.Type;

export const SpaceSummary = Schema.Struct({
  space: Space,
  role: SpaceRole,
  // Who the space belongs to, shown when it is not yours.
  ownerName: Schema.NullOr(Schema.String),
});
export type SpaceSummary = typeof SpaceSummary.Type;
