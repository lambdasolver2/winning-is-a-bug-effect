import type { DatabaseError, OwnerSession, SpaceId, SpaceRole } from "@dearly/domain";
import { Forbidden, NotSpaceMember } from "@dearly/domain";
import { Effect, Option } from "effect";
import type { DatabaseServiceShape } from "./database";

// Every row belongs to exactly one space. An owner's own diary is not a special
// case: it is the space getOrCreateDefaultSpace made for them, which is what
// lets invited members read it.
export interface Scope {
  readonly spaceId: SpaceId;
  readonly role: SpaceRole;
}

export const resolveScope = (
  db: DatabaseServiceShape,
  owner: OwnerSession,
  spaceId?: SpaceId,
): Effect.Effect<Scope, NotSpaceMember | DatabaseError> =>
  spaceId === undefined
    ? Effect.map(db.getOrCreateDefaultSpace(owner), (space) => ({
        spaceId: space.id,
        role: "owner" as const,
      }))
    : Effect.flatMap(db.findMembership(owner, spaceId), (role) =>
        Option.match(role, {
          onNone: () =>
            Effect.fail(new NotSpaceMember({ spaceId, message: "Not a member of this space" })),
          onSome: (value) => Effect.succeed({ spaceId, role: value }),
        }),
      );

export const requireWriter = (scope: Scope): Effect.Effect<Scope, Forbidden> =>
  scope.role === "viewer"
    ? Effect.fail(new Forbidden({ message: "Read-only members cannot modify this space" }))
    : Effect.succeed(scope);
