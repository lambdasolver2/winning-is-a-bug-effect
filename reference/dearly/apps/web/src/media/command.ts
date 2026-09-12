import { SpaceId } from "@dearly/domain";
import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import * as rpc from "../rpc";
import {
  FailedToLoadMedia,
  FailedToUpload,
  LoadedImages,
  LoadedStickers,
  UploadedImage,
  UploadedSticker,
} from "./message";

export const loadStickers = Command.define(
  "loadStickers",
  { spaceId: Schema.NullOr(SpaceId) },
  LoadedStickers,
  FailedToLoadMedia,
)(({ spaceId }) =>
  rpc.listStickers(spaceId).pipe(
    Effect.map((stickers) => LoadedStickers({ stickers })),
    Effect.tapError((error) => Effect.logError("[loadStickers] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToLoadMedia())),
  ),
);

export const loadImages = Command.define(
  "loadImages",
  { spaceId: Schema.NullOr(SpaceId) },
  LoadedImages,
  FailedToLoadMedia,
)(({ spaceId }) =>
  rpc.listImages(spaceId).pipe(
    Effect.map((images) => LoadedImages({ images })),
    Effect.tapError((error) => Effect.logError("[loadImages] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToLoadMedia())),
  ),
);

export const uploadImage = Command.define(
  "uploadImage",
  { file: Schema.Any, title: Schema.String, spaceId: Schema.NullOr(SpaceId) },
  UploadedImage,
  FailedToUpload,
)(({ file, title, spaceId }) =>
  rpc.uploadImage(file as File, spaceId).pipe(
    Effect.map((mediaObjectId) => UploadedImage({ mediaObjectId, title })),
    Effect.tapError((error) => Effect.logError("[uploadImage] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToUpload())),
  ),
);

export const uploadSticker = Command.define(
  "uploadSticker",
  { file: Schema.Any, title: Schema.String, spaceId: Schema.NullOr(SpaceId) },
  UploadedSticker,
  FailedToUpload,
)(({ file, title, spaceId }) =>
  rpc.uploadImage(file as File, spaceId).pipe(
    Effect.flatMap((mediaObjectId) => rpc.createSticker(mediaObjectId, title, spaceId)),
    Effect.map((sticker) => UploadedSticker({ sticker })),
    Effect.tapError((error) => Effect.logError("[uploadSticker] Failed", error)),
    Effect.catch(() => Effect.succeed(FailedToUpload())),
  ),
);
