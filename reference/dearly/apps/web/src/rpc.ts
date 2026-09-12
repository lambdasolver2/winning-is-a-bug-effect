import { DearlyRpc } from "@dearly/rpc";
import type { CanvasElement, SpaceId } from "@dearly/domain";
import { UploadFailed } from "@dearly/domain";
import { Effect, Layer } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpBody from "effect/unstable/http/HttpBody";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { HttpClientLive } from "./http";

const RpcClientLive = RpcClient.layerProtocolHttp({ url: "/rpc" }).pipe(
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(HttpClientLive),
);

const client = Effect.gen(function* () {
  return yield* RpcClient.make(DearlyRpc);
}).pipe(Effect.provide(RpcClientLive));

export const getSession = client.pipe(
  Effect.flatMap((rpc) => rpc.getSession()),
  Effect.scoped,
);

export const listMonthEntries = (month: string, spaceId?: SpaceId | null) =>
  client.pipe(
    Effect.flatMap((rpc) =>
      rpc.listMonthEntries({ month: month as never, spaceId: spaceId ?? undefined }),
    ),
    Effect.scoped,
  );

export const listStickers = (spaceId?: SpaceId | null) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.listStickers({ spaceId: spaceId ?? undefined })),
    Effect.scoped,
  );

export const listImages = (spaceId?: SpaceId | null) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.listImages({ spaceId: spaceId ?? undefined })),
    Effect.scoped,
  );

const uploadMedia = (file: File, kind: "image" | "thumbnail", spaceId?: SpaceId | null) =>
  Effect.gen(function* () {
    const rpc = yield* RpcClient.make(DearlyRpc);
    const httpClient = yield* HttpClient.HttpClient;

    const upload = yield* rpc.createMediaUpload({
      input: {
        kind,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      spaceId: spaceId ?? undefined,
    });

    yield* httpClient.post(upload.uploadUrl, {
      headers: { "content-type": file.type },
      body: HttpBody.raw(file),
    });

    return upload.mediaObjectId;
  }).pipe(
    Effect.scoped,
    Effect.provide(RpcClientLive),
    Effect.provide(HttpClientLive),
    Effect.catchTag("HttpClientError", (error) =>
      Effect.logError(`[uploadMedia] HTTP upload failed`, error).pipe(
        Effect.flatMap(() =>
          Effect.fail(new UploadFailed({ message: `Upload failed: ${error.message}` })),
        ),
      ),
    ),
  );

export const uploadImage = (file: File, spaceId?: SpaceId | null) =>
  uploadMedia(file, "image", spaceId);
export const uploadThumbnail = (file: File, spaceId?: SpaceId | null) =>
  uploadMedia(file, "thumbnail", spaceId);

export const createSticker = (mediaObjectId: string, label: string, spaceId?: SpaceId | null) =>
  client.pipe(
    Effect.flatMap((rpc) =>
      rpc.createSticker({
        mediaObjectId: mediaObjectId as never,
        label,
        spaceId: spaceId ?? undefined,
      }),
    ),
    Effect.scoped,
  );

export const getEntryByDate = (date: string, spaceId?: SpaceId | null) =>
  client.pipe(
    Effect.flatMap((rpc) =>
      rpc.getEntryByDate({ date: date as never, spaceId: spaceId ?? undefined }),
    ),
    Effect.scoped,
  );

export const saveEntry = (
  date: string,
  text: string,
  elements: ReadonlyArray<CanvasElement>,
  thumbnailMediaObjectId: string,
  spaceId?: SpaceId | null,
) =>
  client.pipe(
    Effect.flatMap((rpc) =>
      rpc.saveEntry({
        entry: {
          date: date as never,
          document: {
            version: 1,
            logicalWidth: 1000,
            logicalHeight: 1400,
            elements,
          },
          preview: {
            date: date as never,
            snippet: text.trim().slice(0, 180) || undefined,
            thumbnailMediaObjectId: thumbnailMediaObjectId as never,
            hasSavedEntry: true,
            hasDraft: false,
          },
        },
        spaceId: spaceId ?? undefined,
      }),
    ),
    Effect.scoped,
  );

export const listSpaces = client.pipe(
  Effect.flatMap((rpc) => rpc.listSpaces()),
  Effect.scoped,
);

export const previewInviteByCode = (inviteCode: string) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.previewInvite({ inviteCode })),
    Effect.scoped,
  );

export const joinSpaceByCode = (inviteCode: string) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.joinSpace({ inviteCode })),
    Effect.scoped,
  );

export const leaveSpaceById = (spaceId: SpaceId) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.leaveSpace({ spaceId })),
    Effect.scoped,
  );

export const removeMemberById = (spaceId: SpaceId, memberOwnerId: string) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.removeMember({ spaceId, memberOwnerId })),
    Effect.scoped,
  );

export const listMembersBySpaceId = (spaceId: SpaceId) =>
  client.pipe(
    Effect.flatMap((rpc) => rpc.listMembers({ spaceId })),
    Effect.scoped,
  );
