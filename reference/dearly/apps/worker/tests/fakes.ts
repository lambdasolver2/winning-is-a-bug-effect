import { TestClock } from "effect/testing";
import type { D1Binding, D1PreparedStatement, R2Binding } from "../src/types";

export const ownerId = "development-owner";
export const otherOwnerId = "other-owner";
export const spaceId = "00000000-0000-4000-8000-000000000001";
export const otherSpaceId = "00000000-0000-4000-8000-000000000002";
export const inviteCode = "invite00001";
export const editorInviteCode = "editor00001";
export const mediaId = "00000000-0000-4000-8000-000000000003";
export const stickerId = "00000000-0000-4000-8000-000000000004";
export const now = "2026-07-12T00:00:00.000Z";
export const document = { version: 1, logicalWidth: 1000, logicalHeight: 1000, elements: [] };

// Column order follows src/database/schema.ts declaration order.
export const spaceRow = (owner: string, id: string, code: string): unknown[] => [
  id,
  "My diary",
  owner,
  code,
  editorInviteCode,
  now,
];
export const memberRow = (space: string, owner: string, role: string): unknown[] => [
  `member-${space}-${owner}`,
  space,
  owner,
  role,
  now,
];
export const ownSpaceRow = spaceRow(ownerId, spaceId, inviteCode);
export const ownMemberRow = memberRow(spaceId, ownerId, "owner");
export const otherSpaceRow = spaceRow(otherOwnerId, otherSpaceId, "invite00002");

export const mediaRow = [
  mediaId,
  ownerId,
  spaceId,
  "image",
  "media/image.png",
  "image.png",
  "image/png",
  4,
  now,
];

export interface DbState {
  media?: unknown[] | null;
  entry?: unknown[];
  sticker?: unknown[] | null;
  spaces?: unknown[][];
  members?: unknown[][];
  owners?: unknown[][];
}

export const fakeDb = (
  state: DbState = {
    media: mediaRow,
    spaces: [ownSpaceRow],
    members: [ownMemberRow],
  },
): D1Binding => ({
  prepare: (sql) => statement(sql, state),
  batch: async (statements) => {
    const results = [];
    for (const stmt of statements) {
      results.push({ results: await stmt.raw(), success: true, meta: {} });
    }
    return results;
  },
});

const statement = (
  sql: string,
  state: DbState,
  params: ReadonlyArray<unknown> = [],
): D1PreparedStatement =>
  ({
    bind: (...values) => statement(sql, state, values),
    first: async () => null,
    all: async () => ({ results: [] }),
    run: async () => {
      await raw(sql, state, params)();
      return {};
    },
    raw: raw(sql, state, params),
  }) as D1PreparedStatement;

const raw = (sql: string, state: DbState, params: ReadonlyArray<unknown>) => async () => {
  state.spaces ??= [ownSpaceRow];
  state.members ??= [ownMemberRow];
  state.owners ??= [];

  if (sql.includes('insert into "media_objects"')) {
    // params: id, ownerId, spaceId, kind, r2Key, name, mimeType, sizeBytes
    const row = [...params, now];
    state.media = row;
    return [row];
  }

  if (sql.includes('from "media_objects"')) {
    return state.media === null ? [] : [state.media ?? mediaRow];
  }

  if (sql.includes('insert into "stickers"')) {
    // params: id, ownerId, spaceId, mediaObjectId, label
    const row = [...params, now];
    state.sticker = row;
    return [row];
  }

  if (sql.includes('delete from "stickers"')) {
    state.sticker = null;
    return [];
  }

  if (sql.includes('from "stickers"')) {
    return state.sticker === null
      ? []
      : [state.sticker ?? [stickerId, ownerId, spaceId, mediaId, "heart", now]];
  }

  if (sql.includes('delete from "diary_entries"')) {
    state.entry = undefined;
    return [];
  }

  if (sql.includes('insert into "diary_entries"')) {
    // Upsert binds the 8 insert values first, then the update set; the row is
    // the insert values in schema order.
    const row = params.slice(0, 8);
    state.entry = row;
    return [row];
  }

  if (sql.includes('from "diary_entries"')) {
    return state.entry === undefined ? [] : [state.entry];
  }

  if (sql.includes('insert into "space_members"')) {
    state.members.push([...params]);
    return [];
  }

  if (sql.includes('delete from "space_members"')) {
    // params: spaceId, ownerId
    state.members = state.members.filter((row) => !(row[1] === params[0] && row[2] === params[1]));
    return [];
  }

  if (sql.includes('"space_members" inner join "spaces"')) {
    // params: ownerId; result rows are member columns followed by space columns
    return state.members
      .filter((row) => row[2] === params[0])
      .map((row) => [...row, ...(state.spaces!.find((space) => space[0] === row[1]) ?? [])]);
  }

  if (sql.includes('from "space_members"')) {
    // findMembership passes [spaceId, ownerId]; listMembers passes [spaceId]
    return state.members.filter(
      (row) =>
        (params[0] === undefined || row[1] === params[0]) &&
        (params[1] === undefined || row[2] === params[1]),
    );
  }

  if (sql.includes('insert into "owners"')) {
    // params: id, email, updatedAt
    state.owners = [
      ...state.owners.filter((row) => row[0] !== params[0]),
      [params[0], params[1], now],
    ];
    return [];
  }

  if (sql.includes('from "owners"')) {
    // listOwnerNames binds one id per placeholder
    return state.owners.filter((row) => params.includes(row[0]));
  }

  if (sql.includes('insert into "spaces"')) {
    const row = [...params];
    state.spaces.push(row);
    return [row];
  }

  if (sql.includes('from "spaces"')) {
    // find-by-invite-code passes the code; get-or-create-default passes the owner id
    if (params.length > 0) {
      const key = params[0];
      return state.spaces.filter(
        (space) => space[3] === key || space[4] === key || space[2] === key,
      );
    }
    return state.spaces;
  }

  return [];
};

export const fakeR2 = (value = "png") =>
  ({
    get: async () => ({
      body: new Response(value).body,
      arrayBuffer: async () => new TextEncoder().encode(value).buffer,
    }),
    put: async () => ({}),
  }) satisfies R2Binding;

export const request = (path: string, init?: RequestInit) =>
  new Request(`https://dearly.test${path}`, init);

export const testEnv = (state?: DbState) => ({
  APP_ENV: "test",
  DEV_OWNER_ID: ownerId,
  DB: fakeDb(state),
  MEDIA: fakeR2(),
});

export const testRequest = request("/");

import { ConfigLive } from "../src/services/config";
import { DatabaseLive } from "../src/services/database";
import { EntryLive } from "../src/services/entry";
import { MediaLive } from "../src/services/media";
import { MediaStorageLive } from "../src/services/mediaStorage";
import { SpaceLive } from "../src/services/space";
import { StickerLive } from "../src/services/sticker";
import { RequestService } from "../src/services/appLayer";
import { Layer } from "effect";

export const testLayer = (state?: DbState) => {
  const env = testEnv(state);
  const DatabaseServiceLive = DatabaseLive(env.DB);
  const MediaStorageServiceLive = MediaStorageLive(env.MEDIA);
  const EntryServiceLive = Layer.provideMerge(EntryLive, DatabaseServiceLive);
  const MediaServiceLive = Layer.provideMerge(
    MediaLive,
    Layer.merge(DatabaseServiceLive, MediaStorageServiceLive),
  );
  const StickerServiceLive = Layer.provideMerge(StickerLive, DatabaseServiceLive);
  const SpaceServiceLive = Layer.provideMerge(SpaceLive, DatabaseServiceLive);

  return Layer.mergeAll(
    TestClock.layer(),
    ConfigLive(env),
    DatabaseServiceLive,
    MediaStorageServiceLive,
    EntryServiceLive,
    MediaServiceLive,
    StickerServiceLive,
    SpaceServiceLive,
    Layer.succeed(RequestService, testRequest),
  );
};

export const setTestTime = TestClock.setTime(new Date(now).getTime());

export const savePayload = {
  date: "2026-07-12",
  document,
  preview: { date: "2026-07-12", snippet: "hello", hasSavedEntry: true, hasDraft: false },
};
