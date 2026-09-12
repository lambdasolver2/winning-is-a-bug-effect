import {
  BadRequest,
  CalendarDate,
  CalendarMonth,
  CreateMediaUploadPayload,
  DatabaseError,
  DiaryEntry,
  DraftConflict,
  EntryNotFound,
  EntryPreview,
  Forbidden,
  InvalidInviteCode,
  MediaNotFound,
  MediaObject,
  MediaObjectId,
  MediaTooLarge,
  MediaUpload,
  NotSpaceMember,
  OwnerSession,
  SaveEntryPayload,
  NotFound,
  SpaceId,
  SpaceMember,
  SpaceSummary,
  StorageError,
  Sticker,
  StickerId,
  StickerNotFound,
  Unauthorized,
  UnsupportedMediaType,
} from "@dearly/domain";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { Schema } from "effect";

export const DearlyErrors = Schema.Union([
  Unauthorized,
  BadRequest,
  NotFound,
  EntryNotFound,
  MediaNotFound,
  StickerNotFound,
  MediaTooLarge,
  UnsupportedMediaType,
  DraftConflict,
  DatabaseError,
  StorageError,
  NotSpaceMember,
  Forbidden,
  InvalidInviteCode,
]);

const optionalSpace = Schema.optional(SpaceId);

export class DearlyRpc extends RpcGroup.make(
  Rpc.make("getSession", {
    success: Schema.NullOr(OwnerSession),
    error: DearlyErrors,
  }),
  Rpc.make("listMonthEntries", {
    payload: { month: CalendarMonth, spaceId: optionalSpace },
    success: Schema.Array(EntryPreview),
    error: DearlyErrors,
  }),
  Rpc.make("getEntryByDate", {
    payload: { date: CalendarDate, spaceId: optionalSpace },
    success: DiaryEntry,
    error: DearlyErrors,
  }),
  Rpc.make("saveEntry", {
    payload: { entry: SaveEntryPayload, spaceId: optionalSpace },
    success: DiaryEntry,
    error: DearlyErrors,
  }),
  Rpc.make("discardServerEntry", {
    payload: { date: CalendarDate, spaceId: optionalSpace },
    success: Schema.Void,
    error: DearlyErrors,
  }),
  Rpc.make("createMediaUpload", {
    payload: { input: CreateMediaUploadPayload, spaceId: optionalSpace },
    success: MediaUpload,
    error: DearlyErrors,
  }),
  Rpc.make("getMediaObject", {
    payload: { mediaObjectId: MediaObjectId },
    success: MediaObject,
    error: DearlyErrors,
  }),
  Rpc.make("listImages", {
    payload: { spaceId: optionalSpace },
    success: Schema.Array(MediaObject),
    error: DearlyErrors,
  }),
  Rpc.make("listStickers", {
    payload: { spaceId: optionalSpace },
    success: Schema.Array(Sticker),
    error: DearlyErrors,
  }),
  Rpc.make("createSticker", {
    payload: { mediaObjectId: MediaObjectId, label: Schema.String, spaceId: optionalSpace },
    success: Sticker,
    error: DearlyErrors,
  }),
  Rpc.make("deleteStickerFromPicker", {
    payload: { stickerId: StickerId, spaceId: optionalSpace },
    success: Schema.Void,
    error: DearlyErrors,
  }),
  Rpc.make("listSpaces", {
    success: Schema.Array(SpaceSummary),
    error: DearlyErrors,
  }),
  Rpc.make("previewInvite", {
    payload: { inviteCode: Schema.String },
    success: SpaceSummary,
    error: DearlyErrors,
  }),
  Rpc.make("joinSpace", {
    payload: { inviteCode: Schema.String },
    success: SpaceSummary,
    error: DearlyErrors,
  }),
  Rpc.make("leaveSpace", {
    payload: { spaceId: SpaceId },
    success: Schema.Void,
    error: DearlyErrors,
  }),
  Rpc.make("removeMember", {
    payload: { spaceId: SpaceId, memberOwnerId: Schema.String },
    success: Schema.Void,
    error: DearlyErrors,
  }),
  Rpc.make("listMembers", {
    payload: { spaceId: SpaceId },
    success: Schema.Array(SpaceMember),
    error: DearlyErrors,
  }),
) {}
