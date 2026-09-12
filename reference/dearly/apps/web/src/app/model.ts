import { Schema } from "effect";
import { today } from "../date";
import { CalendarRoute, EntryRoute, JoinRoute, NotFoundRoute, type AppRoute } from "../route";
import * as Calendar from "../calendar/model";
import * as Canvas from "../canvas/model";
import * as Entry from "../entry/model";
import * as Media from "../media/model";
import * as Notification from "../notification/model";
import * as Space from "../space/model";

export const Model = Schema.Struct({
  route: Schema.Union([CalendarRoute, EntryRoute, JoinRoute, NotFoundRoute]),
  calendar: Calendar.Model,
  entry: Entry.Model,
  canvas: Canvas.Model,
  media: Media.Model,
  space: Space.Model,
  notifications: Schema.Array(Notification.Model),
});
export type Model = Schema.Schema.Type<typeof Model>;

export const initialModel = (route: AppRoute): Model => {
  const selectedDate = "date" in route ? route.date : today();
  return {
    route,
    calendar: Calendar.initialModel(selectedDate),
    entry: Entry.initialModel(),
    canvas: Canvas.initialModel(),
    media: Media.initialModel(),
    space: Space.initialModel(),
    notifications: [],
  };
};
