import {
  DatabaseError,
  DiaryEntry,
  EntryPreview,
  MediaObject,
  Space,
  SpaceMember,
  SpaceRole,
  SpaceSummary,
  Sticker,
  type OwnerSession,
  type CalendarDate,
  type CalendarMonth,
  type CreateMediaUploadPayload,
  type MediaObjectId,
  type SaveEntryPayload,
  type SpaceId,
  type StickerId,
} from "@dearly/domain";
import { drizzle } from "drizzle-orm/d1";
import { and, between, desc, eq, inArray, or } from "drizzle-orm";
import { Context, DateTime, Effect, Layer, Match, Option, Schema } from "effect";
import * as schema from "../database/schema";
import type { Scope } from "./scope";

type DRow = typeof schema.diaryEntries.$inferSelect;
type MRow = typeof schema.mediaObjects.$inferSelect;
type SRow = typeof schema.stickers.$inferSelect;
type SpaceRow = typeof schema.spaces.$inferSelect;

export interface DatabaseServiceShape {
  readonly listMonthEntries: (
    scope: Scope,
    month: CalendarMonth,
  ) => Effect.Effect<ReadonlyArray<EntryPreview>, DatabaseError>;
  readonly findEntryByDate: (
    scope: Scope,
    date: CalendarDate,
  ) => Effect.Effect<Option.Option<DiaryEntry>, DatabaseError>;
  readonly saveEntry: (
    owner: OwnerSession,
    scope: Scope,
    payload: SaveEntryPayload,
  ) => Effect.Effect<DiaryEntry, DatabaseError>;
  readonly deleteEntryByDate: (
    scope: Scope,
    date: CalendarDate,
  ) => Effect.Effect<void, DatabaseError>;
  readonly insertMedia: (
    owner: OwnerSession,
    scope: Scope,
    params: CreateMediaUploadPayload,
  ) => Effect.Effect<MediaObject, DatabaseError>;
  readonly findMediaByIdAny: (
    id: MediaObjectId,
  ) => Effect.Effect<Option.Option<MediaObject>, DatabaseError>;
  readonly listImages: (scope: Scope) => Effect.Effect<ReadonlyArray<MediaObject>, DatabaseError>;
  readonly listStickers: (scope: Scope) => Effect.Effect<ReadonlyArray<Sticker>, DatabaseError>;
  readonly insertSticker: (
    owner: OwnerSession,
    scope: Scope,
    mediaObjectId: MediaObjectId,
    label: string,
  ) => Effect.Effect<Sticker, DatabaseError>;
  readonly deleteSticker: (
    scope: Scope,
    stickerId: StickerId,
  ) => Effect.Effect<void, DatabaseError>;
  readonly rememberOwner: (owner: OwnerSession) => Effect.Effect<void, DatabaseError>;
  readonly listOwnerNames: (
    ownerIds: ReadonlyArray<string>,
  ) => Effect.Effect<ReadonlyMap<string, string>, DatabaseError>;
  readonly getOrCreateDefaultSpace: (owner: OwnerSession) => Effect.Effect<Space, DatabaseError>;
  readonly findMembership: (
    owner: OwnerSession,
    spaceId: SpaceId,
  ) => Effect.Effect<Option.Option<SpaceRole>, DatabaseError>;
  readonly listSpacesForOwner: (
    owner: OwnerSession,
  ) => Effect.Effect<ReadonlyArray<SpaceSummary>, DatabaseError>;
  readonly listMembers: (
    spaceId: SpaceId,
  ) => Effect.Effect<ReadonlyArray<SpaceMember>, DatabaseError>;
  readonly findSpaceByInviteCode: (
    code: string,
  ) => Effect.Effect<
    Option.Option<{ readonly space: Space; readonly role: "editor" | "viewer" }>,
    DatabaseError
  >;
  readonly joinSpace: (
    owner: OwnerSession,
    space: Space,
    role: SpaceRole,
  ) => Effect.Effect<void, DatabaseError>;
  readonly leaveSpace: (
    owner: OwnerSession,
    spaceId: SpaceId,
  ) => Effect.Effect<void, DatabaseError>;
  readonly removeMember: (
    spaceId: SpaceId,
    memberOwnerId: string,
  ) => Effect.Effect<void, DatabaseError>;
}

export class DatabaseService extends Context.Service<DatabaseService, DatabaseServiceShape>()(
  "DatabaseService",
) {}

const dbTry = <A>(fn: () => Promise<A>): Effect.Effect<A, DatabaseError> =>
  Effect.tryPromise({
    try: fn,
    catch: (error) => new DatabaseError({ message: String(error) }),
  });

const randomInviteCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 11);
};

const monthRange = (month: CalendarMonth) => ({ start: `${month}-01`, end: `${month}-31` });

// Only the part before the "@" ever leaves the worker: enough to recognise a
// person, without handing their address to whoever holds an invite link.
const localPart = (email: string) => email.split("@")[0] ?? email;

// A row we just wrote that will not decode means the schema and the table have
// drifted apart: a real failure the caller can report, not a defect.
const decoded = <A>(row: Option.Option<A>, what: string): Effect.Effect<A, DatabaseError> =>
  Option.match(row, {
    onNone: () => Effect.fail(new DatabaseError({ message: `Failed to decode ${what}` })),
    onSome: Effect.succeed,
  });

const decodeRole = (role: string): SpaceRole =>
  role === "editor" ? "editor" : role === "viewer" ? "viewer" : "owner";

// displayName is resolved separately, from the owners table.
const toMember = (row: typeof schema.spaceMembers.$inferSelect): SpaceMember => ({
  spaceId: row.spaceId as SpaceMember["spaceId"],
  ownerId: row.ownerId as SpaceMember["ownerId"],
  role: decodeRole(row.role),
  joinedAt: DateTime.makeUnsafe(row.joinedAt),
  displayName: null,
});

const toSpace = (row: SpaceRow): Space => ({
  id: row.id as Space["id"],
  name: row.name,
  ownerId: row.ownerId as Space["ownerId"],
  viewerInviteCode: row.viewerInviteCode,
  editorInviteCode: row.editorInviteCode,
  createdAt: DateTime.makeUnsafe(row.createdAt),
});

const toPreview = (row: DRow) =>
  Schema.decodeUnknownOption(EntryPreview)({
    date: row.entryDate,
    snippet: row.previewSnippet ?? undefined,
    thumbnailMediaObjectId: row.previewThumbnailMediaObjectId ?? undefined,
    hasSavedEntry: true,
    hasDraft: false,
  });

const toEntry = (row: DRow) =>
  Option.flatMap(toPreview(row), (preview) =>
    Schema.decodeUnknownOption(DiaryEntry)({
      id: row.id,
      ownerId: row.ownerId,
      date: row.entryDate,
      document: row.documentJson,
      preview,
      updatedAt: DateTime.makeUnsafe(row.updatedAt),
    }),
  );

const toMediaObject = (row: MRow | undefined) =>
  Match.value(row).pipe(
    Match.when(
      (v) => v !== undefined,
      (mediaRow) =>
        Schema.decodeUnknownOption(MediaObject)({
          id: mediaRow.id,
          ownerId: mediaRow.ownerId,
          spaceId: mediaRow.spaceId,
          kind: mediaRow.kind,
          r2Key: mediaRow.r2Key,
          name: mediaRow.name,
          mimeType: mediaRow.mimeType,
          sizeBytes: mediaRow.sizeBytes,
          createdAt: DateTime.makeUnsafe(mediaRow.createdAt),
        }),
    ),
    Match.orElse(() => Option.none()),
  );

const toSticker = (row: SRow) =>
  Schema.decodeUnknownOption(Sticker)({
    id: row.id,
    ownerId: row.ownerId,
    mediaObjectId: row.mediaObjectId,
    label: row.label,
    createdAt: DateTime.makeUnsafe(row.createdAt),
  });

export const DatabaseLive = (d1Binding: D1Database) =>
  Layer.sync(DatabaseService, function () {
    const db = drizzle(d1Binding, { schema });

    return DatabaseService.of({
      listMonthEntries: Effect.fn("DatabaseService.listMonthEntries")(function* (
        scope: Scope,
        month: CalendarMonth,
      ) {
        const { start, end } = monthRange(month);
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.diaryEntries)
            .where(
              and(
                eq(schema.diaryEntries.spaceId, scope.spaceId),
                between(schema.diaryEntries.entryDate, start, end),
              ),
            )
            .orderBy(schema.diaryEntries.entryDate),
        );
        return rows.flatMap((row) => Option.toArray(toPreview(row)));
      }),

      findEntryByDate: Effect.fn("DatabaseService.findEntryByDate")(function* (
        scope: Scope,
        date: CalendarDate,
      ) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.diaryEntries)
            .where(
              and(
                eq(schema.diaryEntries.spaceId, scope.spaceId),
                eq(schema.diaryEntries.entryDate, date),
              ),
            )
            .limit(1),
        );
        return rows.length === 0 ? Option.none() : toEntry(rows[0]!);
      }),

      saveEntry: Effect.fn("DatabaseService.saveEntry")(function* (
        owner: OwnerSession,
        scope: Scope,
        payload: SaveEntryPayload,
      ) {
        const now = yield* DateTime.now;
        const updatedAt = DateTime.formatIso(now);

        // One entry per date per space; ownerId records who last wrote it.
        const values = {
          id: crypto.randomUUID(),
          ownerId: owner.ownerId,
          spaceId: scope.spaceId,
          entryDate: payload.date,
          documentJson: payload.document,
          previewSnippet: payload.preview.snippet ?? null,
          previewThumbnailMediaObjectId: payload.preview.thumbnailMediaObjectId ?? null,
          updatedAt,
        };
        const rows = yield* dbTry(() =>
          db
            .insert(schema.diaryEntries)
            .values(values)
            .onConflictDoUpdate({
              target: [schema.diaryEntries.spaceId, schema.diaryEntries.entryDate],
              set: {
                documentJson: values.documentJson,
                previewSnippet: values.previewSnippet,
                previewThumbnailMediaObjectId: values.previewThumbnailMediaObjectId,
                updatedAt,
              },
            })
            .returning(),
        );

        return yield* decoded(toEntry(rows[0]!), "the saved entry");
      }),

      deleteEntryByDate: Effect.fn("DatabaseService.deleteEntryByDate")(function* (
        scope: Scope,
        date: CalendarDate,
      ) {
        yield* dbTry(() =>
          db
            .delete(schema.diaryEntries)
            .where(
              and(
                eq(schema.diaryEntries.spaceId, scope.spaceId),
                eq(schema.diaryEntries.entryDate, date),
              ),
            ),
        );
      }),

      insertMedia: Effect.fn("DatabaseService.insertMedia")(function* (
        owner: OwnerSession,
        scope: Scope,
        params: CreateMediaUploadPayload,
      ) {
        const now = yield* DateTime.now;
        const id = crypto.randomUUID();
        const r2Key = `${scope.spaceId}/${id}`;
        const createdAt = DateTime.formatIso(now);
        const rows = yield* dbTry(() =>
          db
            .insert(schema.mediaObjects)
            .values({
              id,
              ownerId: owner.ownerId,
              spaceId: scope.spaceId,
              kind: params.kind,
              r2Key,
              name: params.name,
              mimeType: params.mimeType,
              sizeBytes: params.sizeBytes,
              createdAt,
            })
            .returning(),
        );
        return yield* decoded(toMediaObject(rows[0]!), "the inserted media object");
      }),

      findMediaByIdAny: Effect.fn("DatabaseService.findMediaByIdAny")(function* (
        id: MediaObjectId,
      ) {
        const rows = yield* dbTry(() =>
          db.select().from(schema.mediaObjects).where(eq(schema.mediaObjects.id, id)).limit(1),
        );
        return rows[0] === undefined ? Option.none() : toMediaObject(rows[0]);
      }),

      listImages: Effect.fn("DatabaseService.listImages")(function* (scope: Scope) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.mediaObjects)
            .where(
              and(
                eq(schema.mediaObjects.spaceId, scope.spaceId),
                eq(schema.mediaObjects.kind, "image"),
              ),
            )
            .orderBy(desc(schema.mediaObjects.createdAt)),
        );
        return rows.flatMap((row) => Option.toArray(toMediaObject(row)));
      }),

      listStickers: Effect.fn("DatabaseService.listStickers")(function* (scope: Scope) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.stickers)
            .where(eq(schema.stickers.spaceId, scope.spaceId))
            .orderBy(schema.stickers.createdAt),
        );
        return rows.flatMap((row) => Option.toArray(toSticker(row)));
      }),

      insertSticker: Effect.fn("DatabaseService.insertSticker")(function* (
        owner: OwnerSession,
        scope: Scope,
        mediaObjectId: MediaObjectId,
        label: string,
      ) {
        const now = yield* DateTime.now;
        const createdAt = DateTime.formatIso(now);

        const rows = yield* dbTry(() =>
          db
            .insert(schema.stickers)
            .values({
              id: crypto.randomUUID(),
              ownerId: owner.ownerId,
              spaceId: scope.spaceId,
              mediaObjectId,
              label,
              createdAt,
            })
            .returning(),
        );

        return yield* decoded(toSticker(rows[0]!), "the inserted sticker");
      }),

      deleteSticker: Effect.fn("DatabaseService.deleteSticker")(function* (
        scope: Scope,
        stickerId: StickerId,
      ) {
        yield* dbTry(() =>
          db
            .delete(schema.stickers)
            .where(
              and(eq(schema.stickers.spaceId, scope.spaceId), eq(schema.stickers.id, stickerId)),
            ),
        );
      }),

      rememberOwner: Effect.fn("DatabaseService.rememberOwner")(function* (owner: OwnerSession) {
        if (owner.email === null) return;
        const now = yield* DateTime.now;
        const updatedAt = DateTime.formatIso(now);
        yield* dbTry(() =>
          db
            .insert(schema.owners)
            .values({ id: owner.ownerId, email: owner.email, updatedAt })
            .onConflictDoUpdate({
              target: schema.owners.id,
              set: { email: owner.email, updatedAt },
            }),
        );
      }),

      listOwnerNames: Effect.fn("DatabaseService.listOwnerNames")(function* (
        ownerIds: ReadonlyArray<string>,
      ) {
        if (ownerIds.length === 0) return new Map<string, string>();
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.owners)
            .where(inArray(schema.owners.id, [...new Set(ownerIds)])),
        );
        return new Map(
          rows.flatMap((row) =>
            row.email === null ? [] : [[row.id, localPart(row.email)] as const],
          ),
        );
      }),

      getOrCreateDefaultSpace: Effect.fn("DatabaseService.getOrCreateDefaultSpace")(function* (
        owner: OwnerSession,
      ) {
        const selectOne = () =>
          db.select().from(schema.spaces).where(eq(schema.spaces.ownerId, owner.ownerId)).limit(1);

        const existing = yield* dbTry(selectOne);
        if (existing[0] !== undefined) return toSpace(existing[0]);

        const now = yield* DateTime.now;
        const createdAt = DateTime.formatIso(now);
        const values = {
          id: crypto.randomUUID(),
          name: "My diary",
          ownerId: owner.ownerId,
          viewerInviteCode: randomInviteCode(),
          editorInviteCode: randomInviteCode(),
          createdAt,
        };

        const created = yield* dbTry(() =>
          db.batch([
            db.insert(schema.spaces).values(values).returning(),
            db.insert(schema.spaceMembers).values({
              id: crypto.randomUUID(),
              spaceId: values.id,
              ownerId: owner.ownerId,
              role: "owner",
              joinedAt: createdAt,
            }),
          ] as const),
        ).pipe(
          Effect.map(([spaceRows]) => spaceRows[0]),
          Effect.catch((insertError) =>
            // A concurrent request may have won the insert; re-read before surfacing the error.
            dbTry(selectOne).pipe(
              Effect.flatMap((raced) =>
                raced[0] === undefined ? Effect.fail(insertError) : Effect.succeed(raced[0]),
              ),
            ),
          ),
        );
        if (created === undefined) {
          return yield* Effect.fail(
            new DatabaseError({ message: "Default space insert returned no row" }),
          );
        }
        return toSpace(created);
      }),

      findMembership: Effect.fn("DatabaseService.findMembership")(function* (
        owner: OwnerSession,
        spaceId: SpaceId,
      ) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.spaceMembers)
            .where(
              and(
                eq(schema.spaceMembers.spaceId, spaceId),
                eq(schema.spaceMembers.ownerId, owner.ownerId),
              ),
            )
            .limit(1),
        );
        return rows[0] === undefined ? Option.none() : Option.some(decodeRole(rows[0].role));
      }),

      listSpacesForOwner: Effect.fn("DatabaseService.listSpacesForOwner")(function* (
        owner: OwnerSession,
      ) {
        const rows = yield* dbTry(() =>
          db
            .select({ member: schema.spaceMembers, space: schema.spaces })
            .from(schema.spaceMembers)
            .innerJoin(schema.spaces, eq(schema.spaceMembers.spaceId, schema.spaces.id))
            .where(eq(schema.spaceMembers.ownerId, owner.ownerId)),
        );
        return rows.map((row) => ({
          space: toSpace(row.space),
          role: decodeRole(row.member.role),
          ownerName: null,
        }));
      }),

      listMembers: Effect.fn("DatabaseService.listMembers")(function* (spaceId: SpaceId) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.spaceMembers)
            .where(eq(schema.spaceMembers.spaceId, spaceId))
            .orderBy(schema.spaceMembers.joinedAt),
        );
        return rows.map(toMember);
      }),

      findSpaceByInviteCode: Effect.fn("DatabaseService.findSpaceByInviteCode")(function* (
        code: string,
      ) {
        const rows = yield* dbTry(() =>
          db
            .select()
            .from(schema.spaces)
            .where(
              or(
                eq(schema.spaces.viewerInviteCode, code),
                eq(schema.spaces.editorInviteCode, code),
              ),
            )
            .limit(1),
        );
        return rows[0] === undefined
          ? Option.none()
          : Option.some({
              space: toSpace(rows[0]),
              role: rows[0].editorInviteCode === code ? ("editor" as const) : ("viewer" as const),
            });
      }),

      joinSpace: Effect.fn("DatabaseService.joinSpace")(function* (
        owner: OwnerSession,
        space: Space,
        role: SpaceRole,
      ) {
        const now = yield* DateTime.now;
        yield* dbTry(() =>
          db
            .insert(schema.spaceMembers)
            .values({
              id: crypto.randomUUID(),
              spaceId: space.id,
              ownerId: owner.ownerId,
              role,
              joinedAt: DateTime.formatIso(now),
            })
            .onConflictDoNothing(),
        );
      }),

      leaveSpace: Effect.fn("DatabaseService.leaveSpace")(function* (
        owner: OwnerSession,
        spaceId: SpaceId,
      ) {
        yield* dbTry(() =>
          db
            .delete(schema.spaceMembers)
            .where(
              and(
                eq(schema.spaceMembers.spaceId, spaceId),
                eq(schema.spaceMembers.ownerId, owner.ownerId),
              ),
            ),
        );
      }),

      removeMember: Effect.fn("DatabaseService.removeMember")(function* (
        spaceId: SpaceId,
        memberOwnerId: string,
      ) {
        yield* dbTry(() =>
          db
            .delete(schema.spaceMembers)
            .where(
              and(
                eq(schema.spaceMembers.spaceId, spaceId),
                eq(schema.spaceMembers.ownerId, memberOwnerId),
              ),
            ),
        );
      }),
    });
  });
