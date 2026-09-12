import type {
  CalendarDate,
  CalendarMonth,
  DatabaseError,
  DiaryEntry,
  EntryPreview,
  Forbidden,
  NotSpaceMember,
  SaveEntryPayload,
  SpaceId,
  Unauthorized,
} from "@dearly/domain";
import { Context, Effect, Layer, Option } from "effect";
import { requireOwner } from "../session";
import { DatabaseService } from "./database";
import type { ConfigService } from "./config";
import type { RequestService } from "./appLayer";
import { requireWriter, resolveScope } from "./scope";

interface EntryServiceShape {
  readonly listMonthEntries: (
    month: CalendarMonth,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    ReadonlyArray<EntryPreview>,
    Unauthorized | DatabaseError | NotSpaceMember,
    ConfigService | RequestService
  >;
  readonly getEntryByDate: (
    date: CalendarDate,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    Option.Option<DiaryEntry>,
    Unauthorized | DatabaseError | NotSpaceMember,
    ConfigService | RequestService
  >;
  readonly saveEntry: (
    payload: SaveEntryPayload,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    DiaryEntry,
    Unauthorized | DatabaseError | NotSpaceMember | Forbidden,
    ConfigService | RequestService
  >;
  readonly discardServerEntry: (
    date: CalendarDate,
    spaceId?: SpaceId,
  ) => Effect.Effect<
    void,
    Unauthorized | DatabaseError | NotSpaceMember | Forbidden,
    ConfigService | RequestService
  >;
}

export class EntryService extends Context.Service<EntryService, EntryServiceShape>()(
  "EntryService",
) {}

export const EntryLive = Layer.effect(
  EntryService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return EntryService.of({
      listMonthEntries: Effect.fn("EntryService.listMonthEntries")(function* (
        month: CalendarMonth,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        return yield* db.listMonthEntries(scope, month);
      }),
      getEntryByDate: Effect.fn("EntryService.getEntryByDate")(function* (
        date: CalendarDate,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        return yield* db.findEntryByDate(scope, date);
      }),
      saveEntry: Effect.fn("EntryService.saveEntry")(function* (
        payload: SaveEntryPayload,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        yield* requireWriter(scope);
        return yield* db.saveEntry(owner, scope, payload);
      }),
      discardServerEntry: Effect.fn("EntryService.discardServerEntry")(function* (
        date: CalendarDate,
        spaceId?: SpaceId,
      ) {
        const owner = yield* requireOwner;
        const scope = yield* resolveScope(db, owner, spaceId);
        yield* requireWriter(scope);
        return yield* db.deleteEntryByDate(scope, date);
      }),
    });
  }),
);
