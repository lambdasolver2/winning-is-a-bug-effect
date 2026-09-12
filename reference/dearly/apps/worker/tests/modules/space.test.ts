import { describe, expect, it } from "@effect/vitest";
import { Effect, Result } from "effect";
import { Forbidden } from "@dearly/domain";
import { EntryService } from "../../src/services/entry";
import { SpaceService } from "../../src/services/space";
import type { DbState } from "../fakes";
import {
  inviteCode,
  otherOwnerId,
  otherSpaceId,
  ownerId,
  ownMemberRow,
  ownSpaceRow,
  savePayload,
  setTestTime,
  spaceId,
  testLayer,
} from "../fakes";

const errorTag = <A>(result: Result.Result<A, { _tag: string }>): string | undefined => {
  if (!Result.isFailure(result)) return undefined;
  const failure = result.failure as unknown as { _tag?: string };
  return failure._tag;
};

describe("space permissions", () => {
  it.effect("viewer cannot save entries in a joined space", () =>
    Effect.gen(function* () {
      yield* setTestTime;
      const entry = yield* EntryService;
      const result = yield* Effect.result(
        entry.saveEntry(savePayload as never, otherSpaceId as never),
      );

      expect(errorTag(result)).toBe("Forbidden");
      if (Result.isFailure(result)) {
        expect(result.failure instanceof Forbidden).toBe(true);
      }
    }).pipe(
      Effect.provide(
        testLayer({
          spaces: [],
          members: [
            ["member-x", otherSpaceId, "development-owner", "viewer", "2026-07-12T00:00:00.000Z"],
          ],
        }),
      ),
    ),
  );

  it.effect("non-members cannot read a space", () =>
    Effect.gen(function* () {
      const entry = yield* EntryService;
      const result = yield* Effect.result(
        entry.getEntryByDate("2026-07-12" as never, otherSpaceId as never),
      );

      expect(errorTag(result)).toBe("NotSpaceMember");
    }).pipe(Effect.provide(testLayer({ spaces: [], members: [] }))),
  );

  it.effect("absent spaceId resolves to the owner default space", () =>
    Effect.gen(function* () {
      const entry = yield* EntryService;
      const previews = yield* entry.listMonthEntries("2026-07" as never);
      expect(previews).toEqual([]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("an owner's own diary is written into their space so members can read it", () => {
    const state: DbState = { spaces: [ownSpaceRow], members: [ownMemberRow] };
    return Effect.gen(function* () {
      yield* setTestTime;
      const entry = yield* EntryService;
      // No spaceId means "my diary". It still has to land on the owner's space
      // row, otherwise invited members would only ever see an empty space.
      yield* entry.saveEntry(savePayload as never);

      expect(state.entry?.[2]).toBe(spaceId);
    }).pipe(Effect.provide(testLayer(state)));
  });

  it.effect("a member reads the same rows the owner writes", () =>
    Effect.gen(function* () {
      yield* setTestTime;
      const entry = yield* EntryService;
      // The owner saves without a spaceId; the editor reads the space by id.
      yield* entry.saveEntry(savePayload as never);
      const previews = yield* entry.listMonthEntries("2026-07" as never, spaceId as never);

      expect(previews).toMatchObject([{ date: "2026-07-12", snippet: "hello" }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("listSpaces creates the default space for a new user", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const spaces = yield* space.listSpaces();

      expect(spaces).toMatchObject([{ role: "owner", space: { ownerId } }]);
      expect(spaces[0]!.space.viewerInviteCode.length).toBeGreaterThan(0);
      expect(spaces[0]!.space.editorInviteCode.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(testLayer({ spaces: [], members: [] }))),
  );

  it.effect("joining with an unknown code fails", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const result = yield* Effect.result(space.joinSpace("nope"));

      expect(errorTag(result)).toBe("InvalidInviteCode");
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("previewing an invite reports the role without joining", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const preview = yield* space.previewInvite("editor00001");

      expect(preview.role).toBe("editor");
      expect(preview.space.ownerId).toBe(otherOwnerId);

      // Nothing was joined: the space is still not in the caller's list.
      const spaces = yield* space.listSpaces();
      expect(spaces.map((summary) => summary.space.id)).not.toContain(otherSpaceId);
    }).pipe(
      Effect.provide(
        testLayer({
          spaces: [
            [
              otherSpaceId,
              "Shared",
              otherOwnerId,
              "invite00002",
              "editor00001",
              "2026-07-12T00:00:00.000Z",
            ],
          ],
          members: [],
        }),
      ),
    ),
  );

  it.effect("previewing your own invite reports you as the owner", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const preview = yield* space.previewInvite(inviteCode);

      expect(preview.role).toBe("owner");
      expect(preview.space.ownerId).toBe(ownerId);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("previewing an unknown code fails", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const result = yield* Effect.result(space.previewInvite("nope"));

      expect(errorTag(result)).toBe("InvalidInviteCode");
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("joining a valid code grants the invite role and lists the space", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const joined = yield* space.joinSpace("editor00001");

      expect(joined.role).toBe("editor");
      expect(joined.space.ownerId).toBe(otherOwnerId);

      const spaces = yield* space.listSpaces();
      expect(spaces.map((summary) => summary.space.id)).toContain(otherSpaceId);
    }).pipe(
      Effect.provide(
        testLayer({
          spaces: [
            [
              otherSpaceId,
              "Shared",
              otherOwnerId,
              "invite00002",
              "editor00001",
              "2026-07-12T00:00:00.000Z",
            ],
          ],
          members: [],
        }),
      ),
    ),
  );

  it.effect("owners cannot leave their own space", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const result = yield* Effect.result(space.leaveSpace(spaceId as never));

      expect(errorTag(result)).toBe("Forbidden");
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("members can leave a joined space", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      yield* space.leaveSpace(otherSpaceId as never);
      const spaces = yield* space.listSpaces();

      expect(spaces.map((summary) => summary.space.id)).not.toContain(otherSpaceId);
    }).pipe(
      Effect.provide(
        testLayer({
          spaces: [
            [
              otherSpaceId,
              "Shared",
              otherOwnerId,
              "invite00002",
              "editor",
              "2026-07-12T00:00:00.000Z",
            ],
          ],
          members: [["member-x", otherSpaceId, ownerId, "editor", "2026-07-12T00:00:00.000Z"]],
        }),
      ),
    ),
  );

  it.effect("only the space owner can remove members", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      // dev owner does not own otherSpaceId here
      const denied = yield* Effect.result(
        space.removeMember(otherSpaceId as never, "someone-else"),
      );
      expect(errorTag(denied)).toBe("Forbidden");

      // owner removes a member of their own space
      yield* space.removeMember(spaceId as never, otherOwnerId);
    }).pipe(
      Effect.provide(
        testLayer({
          members: [
            ["member-o", spaceId, ownerId, "owner", "2026-07-12T00:00:00.000Z"],
            ["member-a", spaceId, otherOwnerId, "editor", "2026-07-12T00:00:00.000Z"],
            ["member-b", otherSpaceId, "someone-else", "editor", "2026-07-12T00:00:00.000Z"],
          ],
        }),
      ),
    ),
  );

  it.effect("removing someone who isn't a member fails", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const result = yield* Effect.result(space.removeMember(spaceId as never, "not-a-member"));

      expect(errorTag(result)).toBe("NotSpaceMember");
    }).pipe(
      Effect.provide(
        testLayer({
          members: [["member-o", spaceId, ownerId, "owner", "2026-07-12T00:00:00.000Z"]],
        }),
      ),
    ),
  );

  it.effect("members are shown by the local part of their email", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const members = yield* space.listMembers(spaceId as never);

      expect(members.map((member) => member.displayName)).toEqual(["dev.owner", null]);
    }).pipe(
      Effect.provide(
        testLayer({
          members: [
            ["member-o", spaceId, ownerId, "owner", "2026-07-12T00:00:00.000Z"],
            ["member-a", spaceId, otherOwnerId, "editor", "2026-07-12T00:00:01.000Z"],
          ],
          // otherOwnerId has never opened the app, so it has no row here.
          owners: [[ownerId, "dev.owner@example.test", "2026-07-12T00:00:00.000Z"]],
        }),
      ),
    ),
  );

  it.effect("a shared space reports who it belongs to", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const preview = yield* space.previewInvite("editor00001");

      expect(preview.ownerName).toBe("other.owner");
    }).pipe(
      Effect.provide(
        testLayer({
          spaces: [
            [
              otherSpaceId,
              "Shared",
              otherOwnerId,
              "invite00002",
              "editor00001",
              "2026-07-12T00:00:00.000Z",
            ],
          ],
          members: [],
          owners: [[otherOwnerId, "other.owner@example.test", "2026-07-12T00:00:00.000Z"]],
        }),
      ),
    ),
  );

  it.effect("only the space owner can list members", () =>
    Effect.gen(function* () {
      const space = yield* SpaceService;
      const denied = yield* Effect.result(space.listMembers(otherSpaceId as never));
      expect(errorTag(denied)).toBe("Forbidden");

      const members = yield* space.listMembers(spaceId as never);
      expect(members.map((member) => member.ownerId)).toEqual([ownerId, otherOwnerId]);
    }).pipe(
      Effect.provide(
        testLayer({
          members: [
            ["member-o", spaceId, ownerId, "owner", "2026-07-12T00:00:00.000Z"],
            ["member-a", spaceId, otherOwnerId, "editor", "2026-07-12T00:00:01.000Z"],
            ["member-b", otherSpaceId, "someone-else", "editor", "2026-07-12T00:00:00.000Z"],
          ],
        }),
      ),
    ),
  );

  it.effect(
    "default space creation is atomic: the owner is always a member of their own space",
    () =>
      Effect.gen(function* () {
        const space = yield* SpaceService;
        const spaces = yield* space.listSpaces();

        expect(spaces).toHaveLength(1);
        const members = yield* space.listMembers(spaces[0]!.space.id);
        expect(members).toMatchObject([{ ownerId, role: "owner" }]);
      }).pipe(Effect.provide(testLayer({ spaces: [], members: [] }))),
  );
});
