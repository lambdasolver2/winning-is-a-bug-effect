import { Schema } from "effect";
import { OwnerId } from "./ids";

export const OwnerSession = Schema.Struct({
  ownerId: OwnerId,
  // From the Cloudflare Access token; absent in development.
  email: Schema.NullOr(Schema.String),
});
export type OwnerSession = typeof OwnerSession.Type;
