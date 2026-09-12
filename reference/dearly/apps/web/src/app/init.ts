import { Match } from "effect";
import { Command } from "foldkit";
import { loadEntries, loadSession } from "../calendar/command";
import type { CalendarMessage } from "../calendar/message";
import { loadImages, loadStickers } from "../media/command";
import type { MediaMessage } from "../media/message";
import { loadSpaces, previewInvite } from "../space/command";
import type { SpaceMessage } from "../space/message";
import { loadDraft, loadEntry } from "../entry/command";
import type { EntryMessage } from "../entry/message";
import {
  GotCalendarMessage,
  GotEntryMessage,
  GotMediaMessage,
  GotSpaceMessage,
  type AppMessage,
} from "./message";
import type { Model } from "./model";

export const init = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<AppMessage>>] => {
  const activeSpaceId = model.space.activeSpaceId;
  const isEntry = Match.value(model.route).pipe(
    Match.tagsExhaustive({
      EntryRoute: () => true as const,
      CalendarRoute: () => false as const,
      JoinRoute: () => false as const,
      NotFoundRoute: () => false as const,
    }),
  );
  // An invite link is usually opened cold, so init has to answer it too:
  // ChangedRoute only fires when the route changes inside a running app.
  const inviteCode = model.route._tag === "JoinRoute" ? model.route.code : null;
  return [
    {
      ...model,
      calendar: { ...model.calendar, loadState: "loading" },
      entry: isEntry ? { ...model.entry, loadState: "loading" } : model.entry,
    },
    [
      ...mapCalendar([
        loadSession(),
        loadEntries({ month: model.calendar.month, spaceId: activeSpaceId }),
      ]),
      ...mapMedia([
        loadStickers({ spaceId: activeSpaceId }),
        loadImages({ spaceId: activeSpaceId }),
      ]),
      ...mapSpace(
        inviteCode === null ? [loadSpaces()] : [loadSpaces(), previewInvite({ code: inviteCode })],
      ),
      ...(isEntry
        ? mapEntry([
            loadEntry({ date: model.calendar.selectedDate, spaceId: activeSpaceId }),
            loadDraft({ date: model.calendar.selectedDate }),
          ])
        : []),
    ],
  ];
};

const mapCalendar = (commands: ReadonlyArray<Command.Command<CalendarMessage>>) =>
  Command.mapMessages(commands, (message) => GotCalendarMessage({ message }));
const mapEntry = (commands: ReadonlyArray<Command.Command<EntryMessage>>) =>
  Command.mapMessages(commands, (message) => GotEntryMessage({ message }));
const mapMedia = (commands: ReadonlyArray<Command.Command<MediaMessage>>) =>
  Command.mapMessages(commands, (message) => GotMediaMessage({ message }));
const mapSpace = (commands: ReadonlyArray<Command.Command<SpaceMessage>>) =>
  Command.mapMessages(commands, (message) => GotSpaceMessage({ message }));
