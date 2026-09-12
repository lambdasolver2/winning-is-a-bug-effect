import type {
  DatabaseError,
  MediaObjectId,
  Sticker,
  StickerId,
  Unauthorized,
  Forbidden,
  NotSpaceMember,
  SpaceId,
} from "@dearly/domain";
import { Context, Effect, Layer } from "effect";
import { requireOwner } from "../session";
import { DatabaseService } from "./database";
import type { ConfigService } from "./config";
import type { RequestService } from "./appLayer";
import { requireWriter, resolveScope } from "./scope";

export interface StickerServiceShape {
  readonly listStickers: (
    spaceId?: SpaceId,
  ) => Effect.Effect<
    ReadonlyArray<Sticker>,
    Unauthorized | DatabaseError | NotSpaceMember,
    ConfigService | RequestService
  >;
  readonly createSticker: (
    mediaObjectId: MediaObjectId,
    label: string,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    Sticker,
    Unauthorized | DatabaseError | NotSpaceMember | Forbidden,
    ConfigService | RequestService
  >;
  readonly deleteStickerFromPicker: (
    stickerId: StickerId,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    void,
    Unauthorized | DatabaseError | NotSpaceMember | Forbidden,
    ConfigService | RequestService
  >;
}

export class StickerService extends Context.Service<StickerService, StickerServiceShape>()(
  "StickerService",
) {}

export const StickerLive = Layer.effect(
  StickerService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return StickerService.of({
      listStickers: Effect.fn("StickerService.listStickers")(function* (spaceId?: SpaceId) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        return yield* db.listStickers(scope);
      }),
      createSticker: Effect.fn("StickerService.createSticker")(function* (
        mediaObjectId: MediaObjectId,
        label: string,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        yield* requireWriter(scope);
        return yield* db.insertSticker(owner, scope, mediaObjectId, label);
      }),
      deleteStickerFromPicker: Effect.fn("StickerService.deleteStickerFromPicker")(function* (
        stickerId: StickerId,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        yield* requireWriter(scope);
        return yield* db.deleteSticker(scope, stickerId);
      }),
    });
  }),
);
