import { Match } from "effect";
import type { Html } from "foldkit";
import type { Model } from "./app/model";
import { calendarPage } from "./calendar/view";
import { entryPage } from "./entry/view";

export const view = (model: Model): Html.Document =>
  Match.value(model.route).pipe(
    Match.withReturnType<Html.Document>(),
    Match.tagsExhaustive({
      CalendarRoute: () => calendarPage(model),
      EntryRoute: () => entryPage(model),
      JoinRoute: () => calendarPage(model),
      NotFoundRoute: () => calendarPage(model),
    }),
  );
