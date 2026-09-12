import { EntryNotFound, MediaNotFound } from "@dearly/domain";
import { DearlyRpc } from "@dearly/rpc";
import { Effect, Layer, Option } from "effect";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import type { ConfigService } from "./services/config";
import type { RequestService } from "./services/appLayer";
import { EntryService } from "./services/entry";
import { MediaService } from "./services/media";
import { SpaceService } from "./services/space";
import { StickerService } from "./services/sticker";
import { getSession } from "./session";

export const rpc = Effect.fn("rpc")(function* (request: Request) {
  // Name the services the handlers need so providing them actually discharges
  // the requirement instead of being asserted away.
  const ctx = yield* Effect.context<
    ConfigService | RequestService | EntryService | MediaService | SpaceService | StickerService
  >();
  const rpcEffect = Effect.flatten(
    Effect.provide(
      RpcServer.toHttpEffect(DearlyRpc),
      Layer.mergeAll(RpcHandlerLayer, RpcSerialization.layerNdjson),
    ),
  ).pipe(Effect.provide(ctx));
  const handler = HttpEffect.toWebHandler(rpcEffect);
  return yield* Effect.promise(() => handler(request));
});

const RpcHandlerLayer = DearlyRpc.toLayer({
  getSession: () =>
    getSession.pipe(
      Effect.map(
        Option.match({
          onNone: () => null,
          onSome: (session) => session,
        }),
      ),
    ),
  listMonthEntries: ({ month, spaceId }) =>
    Effect.gen(function* () {
      const entry = yield* EntryService;
      return yield* entry.listMonthEntries(month, spaceId);
    }),
  getEntryByDate: ({ date, spaceId }) =>
    Effect.gen(function* () {
      const entry = yield* EntryService;
      const result = yield* entry.getEntryByDate(date, spaceId);
      return yield* Option.match(result, {
        onNone: () => Effect.fail(new EntryNotFound({ date, message: "Entry not found" })),
        onSome: Effect.succeed,
      });
    }),
  saveEntry: ({ entry, spaceId }) =>
    Effect.gen(function* () {
      const service = yield* EntryService;
      return yield* service.saveEntry(entry, spaceId);
    }),
  discardServerEntry: ({ date, spaceId }) =>
    Effect.gen(function* () {
      const entry = yield* EntryService;
      return yield* entry.discardServerEntry(date, spaceId);
    }),
  createMediaUpload: ({ input, spaceId }) =>
    Effect.gen(function* () {
      const media = yield* MediaService;
      return yield* media.createMediaUpload(input, spaceId);
    }),
  getMediaObject: ({ mediaObjectId }) =>
    Effect.gen(function* () {
      const media = yield* MediaService;
      const result = yield* media.getMediaObject(mediaObjectId);
      return yield* Option.match(result, {
        onNone: () => Effect.fail(new MediaNotFound({ mediaObjectId, message: "Media not found" })),
        onSome: Effect.succeed,
      });
    }),
  listImages: ({ spaceId }) =>
    Effect.gen(function* () {
      const media = yield* MediaService;
      return yield* media.listImages(spaceId);
    }),
  listStickers: ({ spaceId }) =>
    Effect.gen(function* () {
      const sticker = yield* StickerService;
      return yield* sticker.listStickers(spaceId);
    }),
  createSticker: ({ mediaObjectId, label, spaceId }) =>
    Effect.gen(function* () {
      const sticker = yield* StickerService;
      return yield* sticker.createSticker(mediaObjectId, label, spaceId);
    }),
  deleteStickerFromPicker: ({ stickerId, spaceId }) =>
    Effect.gen(function* () {
      const sticker = yield* StickerService;
      return yield* sticker.deleteStickerFromPicker(stickerId, spaceId);
    }),
  listSpaces: () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.listSpaces();
    }),
  previewInvite: ({ inviteCode }) =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.previewInvite(inviteCode);
    }),
  joinSpace: ({ inviteCode }) =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.joinSpace(inviteCode);
    }),
  leaveSpace: ({ spaceId }) =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.leaveSpace(spaceId);
    }),
  removeMember: ({ spaceId, memberOwnerId }) =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.removeMember(spaceId, memberOwnerId);
    }),
  listMembers: ({ spaceId }) =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      return yield* space.listMembers(spaceId);
    }),
});
