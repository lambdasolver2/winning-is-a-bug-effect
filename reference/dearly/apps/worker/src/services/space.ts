import type {
  DatabaseError,
  Forbidden,
  InvalidInviteCode,
  NotSpaceMember,
  SpaceId,
  SpaceMember,
  SpaceSummary,
  Unauthorized,
} from "@dearly/domain";
import {
  Forbidden as ForbiddenError,
  InvalidInviteCode as InvalidInviteCodeError,
  NotSpaceMember as NotSpaceMemberError,
} from "@dearly/domain";
import { Context, Effect, Layer, Option } from "effect";
import { requireOwner } from "../session";
import { DatabaseService } from "./database";
import type { ConfigService } from "./config";
import type { RequestService } from "./appLayer";

export interface SpaceServiceShape {
  readonly listSpaces: () => Effect.Effect<
    ReadonlyArray<SpaceSummary>,
    Unauthorized | DatabaseError,
    ConfigService | RequestService
  >;
  readonly previewInvite: (
    inviteCode: string,
  ) => Effect.Effect<
    SpaceSummary,
    Unauthorized | DatabaseError | InvalidInviteCode,
    ConfigService | RequestService
  >;
  readonly joinSpace: (
    inviteCode: string,
  ) => Effect.Effect<
    SpaceSummary,
    Unauthorized | DatabaseError | InvalidInviteCode,
    ConfigService | RequestService
  >;
  readonly leaveSpace: (
    spaceId: SpaceId,
  ) => Effect.Effect<
    void,
    Unauthorized | DatabaseError | Forbidden,
    ConfigService | RequestService
  >;
  readonly removeMember: (
    spaceId: SpaceId,
    memberOwnerId: string,
  ) => Effect.Effect<
    void,
    Unauthorized | DatabaseError | Forbidden | NotSpaceMember,
    ConfigService | RequestService
  >;
  readonly listMembers: (
    spaceId: SpaceId,
  ) => Effect.Effect<
    ReadonlyArray<SpaceMember>,
    Unauthorized | DatabaseError | Forbidden,
    ConfigService | RequestService
  >;
}

export class SpaceService extends Context.Service<SpaceService, SpaceServiceShape>()(
  "SpaceService",
) {}

export const SpaceLive = Layer.effect(
  SpaceService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Every SpaceSummary leaves through here, so the owner name is attached in
    // exactly one place.
    const withOwnerNames = Effect.fn("SpaceService.withOwnerNames")(function* (
      summaries: ReadonlyArray<SpaceSummary>,
    ) {
      const names = yield* db.listOwnerNames(summaries.map((summary) => summary.space.ownerId));
      return summaries.map((summary) => ({
        ...summary,
        ownerName: names.get(summary.space.ownerId) ?? null,
      }));
    });

    const oneSummary = Effect.fn("SpaceService.oneSummary")(function* (summary: SpaceSummary) {
      const [withName] = yield* withOwnerNames([summary]);
      return withName!;
    });

    const resolveInvite = Effect.fn("SpaceService.resolveInvite")(function* (inviteCode: string) {
      const found = yield* db.findSpaceByInviteCode(inviteCode.trim());
      return yield* Option.match(found, {
        onNone: () =>
          Effect.fail(new InvalidInviteCodeError({ message: "This invite link is not valid" })),
        onSome: Effect.succeed,
      });
    });

    const requireOwnedSpace = Effect.fn("SpaceService.requireOwnedSpace")(function* (
      spaceId: SpaceId,
      action: string,
    ) {
      const owner = yield* requireOwner;
      const spaces = yield* db.listSpacesForOwner(owner);
      const owned = spaces.find(
        (summary) => summary.space.id === spaceId && summary.role === "owner",
      );
      return yield* owned === undefined
        ? Effect.fail(new ForbiddenError({ message: `Only the space owner can ${action}` }))
        : Effect.succeed(owned);
    });

    return SpaceService.of({
      listSpaces: Effect.fn("SpaceService.listSpaces")(function* () {
        const owner = yield* requireOwner;
        // The app calls this on every boot, which makes it the natural place to
        // keep the owner's email fresh without writing on every request.
        yield* db.rememberOwner(owner);
        yield* db.getOrCreateDefaultSpace(owner);
        return yield* withOwnerNames(yield* db.listSpacesForOwner(owner));
      }),

      // What the invite leads to, without joining: the confirmation dialog needs
      // the space name and the role before the reader decides.
      previewInvite: Effect.fn("SpaceService.previewInvite")(function* (inviteCode: string) {
        const owner = yield* requireOwner;
        const invite = yield* resolveInvite(inviteCode);
        return yield* oneSummary({
          space: invite.space,
          role: invite.space.ownerId === owner.ownerId ? ("owner" as const) : invite.role,
          ownerName: null,
        });
      }),

      joinSpace: Effect.fn("SpaceService.joinSpace")(function* (inviteCode: string) {
        const owner = yield* requireOwner;
        const invite = yield* resolveInvite(inviteCode);
        if (invite.space.ownerId === owner.ownerId) {
          return yield* oneSummary({ space: invite.space, role: "owner", ownerName: null });
        }
        yield* db.rememberOwner(owner);
        yield* db.joinSpace(owner, invite.space, invite.role);
        return yield* oneSummary({ space: invite.space, role: invite.role, ownerName: null });
      }),

      leaveSpace: Effect.fn("SpaceService.leaveSpace")(function* (spaceId: SpaceId) {
        const owner = yield* requireOwner;
        const membership = yield* db.findMembership(owner, spaceId);
        if (Option.isNone(membership)) {
          return;
        }
        if (membership.value === "owner") {
          return yield* Effect.fail(
            new ForbiddenError({ message: "Owners cannot leave their own space" }),
          );
        }
        return yield* db.leaveSpace(owner, spaceId);
      }),

      removeMember: Effect.fn("SpaceService.removeMember")(function* (
        spaceId: SpaceId,
        memberOwnerId: string,
      ) {
        const owned = yield* requireOwnedSpace(spaceId, "remove members");
        if (owned.space.ownerId === memberOwnerId) {
          return yield* Effect.fail(new ForbiddenError({ message: "Cannot remove the owner" }));
        }
        const members = yield* db.listMembers(spaceId);
        const isMember = members.some((member) => member.ownerId === memberOwnerId);
        if (!isMember) {
          return yield* Effect.fail(
            new NotSpaceMemberError({ spaceId, message: "Not a member of this space" }),
          );
        }
        return yield* db.removeMember(spaceId, memberOwnerId);
      }),

      listMembers: Effect.fn("SpaceService.listMembers")(function* (spaceId: SpaceId) {
        yield* requireOwnedSpace(spaceId, "view members");
        const members = yield* db.listMembers(spaceId);
        const names = yield* db.listOwnerNames(members.map((member) => member.ownerId));
        return members.map((member) => ({
          ...member,
          displayName: names.get(member.ownerId) ?? null,
        }));
      }),
    });
  }),
);
