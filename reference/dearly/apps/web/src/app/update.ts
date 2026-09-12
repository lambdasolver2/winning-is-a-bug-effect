import { Match } from "effect";
import { Command } from "foldkit";
import { toString as urlToString } from "foldkit/url";
import { loadEntries } from "../calendar/command";
import type { CalendarMessage } from "../calendar/message";
import * as Calendar from "../calendar/update";
import type { CanvasMessage } from "../canvas/message";
import * as Canvas from "../canvas/update";
import { loadDraft, loadEntry, saveEntry } from "../entry/command";
import { TextChanged, type EntryMessage } from "../entry/message";
import * as Entry from "../entry/update";
import { RequestedUpload, type MediaMessage } from "../media/message";
import { loadImages, loadStickers } from "../media/command";
import * as Media from "../media/update";
import { loadMembers, previewInvite } from "../space/command";
import { SwitchedSpace, type SpaceMessage } from "../space/message";
import * as Space from "../space/update";
import { CalendarRoute } from "../route";
import { LoadExternal, Logout, NavigateInternal } from "./command";
import {
  GotCalendarMessage,
  GotCanvasMessage,
  GotEntryMessage,
  GotMediaMessage,
  GotSpaceMessage,
  type AppMessage,
} from "./message";
import type { Model } from "./model";

type UpdateResult = readonly [Model, ReadonlyArray<Command.Command<AppMessage>>];

export const update = (model: Model, message: AppMessage): UpdateResult =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      Navigated: ({ request }): UpdateResult =>
        Match.value(request).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            Internal: ({ url }) => [model, [NavigateInternal({ url: urlToString(url) })]],
            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),
      CompletedNavigateInternal: (): UpdateResult => [model, []],
      CompletedLoadExternal: (): UpdateResult => [model, []],
      RequestedLogout: (): UpdateResult => [model, [Logout()]],
      CompletedLogout: (): UpdateResult => [model, []],
      DismissedNotification: ({ id }): UpdateResult => [
        { ...model, notifications: model.notifications.filter((item) => item.id !== id) },
        [],
      ],
      ChangedRoute: ({ route }): UpdateResult =>
        Match.value(route).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            EntryRoute: ({ date }) => {
              const month = date.slice(0, 7);
              const activeSpaceId = model.space.activeSpaceId;
              return [
                {
                  ...model,
                  route,
                  calendar: { ...model.calendar, selectedDate: date, month, loadState: "loading" },
                  entry: Entry.reset(model.entry),
                  canvas: { ...Canvas.loadElements(model.canvas, []), elements: [] },
                },
                [
                  ...mapCalendar([loadEntries({ month, spaceId: activeSpaceId })]),
                  ...mapEntry([loadEntry({ date, spaceId: activeSpaceId }), loadDraft({ date })]),
                ],
              ];
            },
            CalendarRoute: () => [{ ...model, route }, []],
            JoinRoute: ({ code }): UpdateResult => [
              { ...model, route },
              mapSpace([previewInvite({ code })]),
            ],
            NotFoundRoute: () => [{ ...model, route }, []],
          }),
        ),
      GotSpaceMessage: ({ message: child }): UpdateResult =>
        Match.value(child).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            JoinedSpace: ({ summary }) => {
              const [space, commands] = Space.update(model.space, child);
              const next = notify({ ...model, space }, "success", `Joined “${summary.space.name}”`);
              return [
                next,
                [
                  ...mapSpace(commands),
                  NavigateInternal({ url: "/" }),
                  ...mapCalendar([
                    loadEntries({
                      month: model.calendar.month,
                      spaceId: summary.space.id,
                    }),
                  ]),
                  ...mapMedia([
                    loadStickers({ spaceId: summary.space.id }),
                    loadImages({ spaceId: summary.space.id }),
                  ]),
                ],
              ];
            },
            LeftSpace: () => {
              const [space, commands] = Space.update(model.space, child);
              return [
                notify({ ...model, space }, "success", "Left the shared space"),
                [
                  ...mapSpace(commands),
                  ...mapCalendar([loadEntries({ month: model.calendar.month, spaceId: null })]),
                  ...mapMedia([loadStickers({ spaceId: null }), loadImages({ spaceId: null })]),
                ],
              ];
            },
            SwitchedSpace: ({ spaceId }) => {
              const [space, commands] = Space.update(model.space, child);
              return [
                { ...model, space },
                [
                  ...mapSpace(commands),
                  ...mapCalendar([loadEntries({ month: model.calendar.month, spaceId })]),
                  ...mapMedia([loadStickers({ spaceId }), loadImages({ spaceId })]),
                ],
              ];
            },
            CopiedInvite: () => {
              const [space, commands] = Space.update(model.space, child);
              return [
                notify({ ...model, space }, "success", "Invite link copied"),
                mapSpace(commands),
              ];
            },
            SpaceActionFailed: ({ message }) => {
              const [space, commands] = Space.update(model.space, child);
              return [notify({ ...model, space }, "error", message), mapSpace(commands)];
            },
            LoadedSpaces: ({ spaces }) => {
              const [space, commands] = Space.update(model.space, child);
              const owned = spaces.find((summary) => summary.role === "owner");
              const memberCommands =
                owned === undefined ? [] : [loadMembers({ spaceId: owned.space.id })];

              const activeStillValid =
                space.activeSpaceId === null ||
                spaces.some((summary) => summary.space.id === space.activeSpaceId);
              if (activeStillValid) {
                return [{ ...model, space }, [...mapSpace(commands), ...mapSpace(memberCommands)]];
              }

              const [fellBack, switchCommands] = Space.update(
                space,
                SwitchedSpace({ spaceId: null }),
              );
              return [
                { ...model, space: fellBack },
                [
                  ...mapSpace(commands),
                  ...mapSpace(memberCommands),
                  ...mapSpace(switchCommands),
                  ...mapCalendar([loadEntries({ month: model.calendar.month, spaceId: null })]),
                  ...mapMedia([loadStickers({ spaceId: null }), loadImages({ spaceId: null })]),
                ],
              ];
            },
            LoadedInvite: () => delegateToSpace(model, child),
            GotInviteDialogMessage: () => delegateToSpace(model, child),
            AcceptedInvite: () => delegateToSpace(model, child),
            DeclinedInvite: () => {
              const [space, commands] = Space.update(model.space, child);
              return [{ ...model, space }, [...mapSpace(commands), NavigateInternal({ url: "/" })]];
            },
            FailedToLoadInvite: ({ message }) => {
              const [space, commands] = Space.update(model.space, child);
              return [
                notify({ ...model, space }, "error", message),
                [...mapSpace(commands), NavigateInternal({ url: "/" })],
              ];
            },
            FailedToLoadSpaces: () => delegateToSpace(model, child),
            RequestedLeaveSpace: () => delegateToSpace(model, child),
            LoadedMembers: () => delegateToSpace(model, child),
            FailedToLoadMembers: () => delegateToSpace(model, child),
            RequestedRemoveMember: () => delegateToSpace(model, child),
            MemberRemoved: () => {
              const [space, commands] = Space.update(model.space, child);
              return [notify({ ...model, space }, "success", "Member removed"), mapSpace(commands)];
            },
            RequestedCopyInvite: () => delegateToSpace(model, child),
            GotSettingsPopoverMessage: () => delegateToSpace(model, child),
            SwitchedInviteTab: () => delegateToSpace(model, child),
          }),
        ),
      GotCalendarMessage: ({ message: child }): UpdateResult =>
        Match.value(child).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            PreviewedDate: () => delegateToCalendar(model, child),
            ToggledPicker: () => delegateToCalendar(model, child),
            ClosedPicker: () => delegateToCalendar(model, child),
            PickedYear: () => delegateToCalendar(model, child),
            ChangedMonth: () => delegateToCalendar(model, child),
            WentToday: () => delegateToCalendar(model, child),
            OpenedPhotoPreview: () => delegateToCalendar(model, child),
            ClosedPhotoPreview: () => delegateToCalendar(model, child),
            LoadedSession: () => delegateToCalendar(model, child),
            LoadedEntries: () => delegateToCalendar(model, child),
            CalendarFailedToLoad: () => delegateToCalendar(model, child),
          }),
        ),
      GotCanvasMessage: ({ message: child }): UpdateResult =>
        Match.value(child).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            CanvasRequestedUpload: ({ file }) =>
              update(
                model,
                GotMediaMessage({
                  message: RequestedUpload({ file, kind: "image" }),
                }),
              ),
            ChangedText: ({ text }) => {
              const [canvas, commands] = Canvas.update(model.canvas, child);
              const [entry, entryCommands] = Entry.update(
                model.entry,
                TextChanged({ text }),
                model.calendar.selectedDate,
              );
              return [
                { ...model, canvas, entry },
                [...mapCanvas(commands), ...mapEntry(entryCommands)],
              ];
            },
            UpdatedTextDocument: () => delegateToCanvas(model, child),
            StartedTextSession: () => delegateToCanvas(model, child),
            CommittedTextSession: () => delegateToCanvas(model, child),
            ChangedImageTitle: () => delegateToCanvas(model, child),
            AddedTextCanvasElement: () => delegateToCanvas(model, child),
            PastedCanvasText: () => delegateToCanvas(model, child),

            CutCanvasElement: () => delegateToCanvas(model, child),
            PastedCanvasElement: () => delegateToCanvas(model, child),
            SelectedCanvasElement: () => delegateToCanvas(model, child),
            DeselectedCanvasElement: () => delegateToCanvas(model, child),
            StartedCanvasTransform: () => delegateToCanvas(model, child),
            FinishedCanvasTransform: () => delegateToCanvas(model, child),
            UndidCanvas: () => delegateToCanvas(model, child),
            RedidCanvas: () => delegateToCanvas(model, child),
            TransformedCanvasElement: () => delegateToCanvas(model, child),
            RequestedDelete: () => delegateToCanvas(model, child),
            DeletedCanvasElement: () => delegateToCanvas(model, child),
            RotatedCanvasElement: () => delegateToCanvas(model, child),
            ChangedCanvasElementLayer: () => delegateToCanvas(model, child),
            MovedCanvasElementLayer: () => delegateToCanvas(model, child),
            ReorderedCanvasElements: () => delegateToCanvas(model, child),
            ToggledLayersPanel: () => delegateToCanvas(model, child),
            GotDeleteDialogMessage: () => delegateToCanvas(model, child),
            MovedCanvasElement: () => delegateToCanvas(model, child),
            StartedResize: () => delegateToCanvas(model, child),
            ResizedCanvasElement: () => delegateToCanvas(model, child),
            FinishedResize: () => delegateToCanvas(model, child),
            ToggledToolbarMenu: () => delegateToCanvas(model, child),
            ClosedToolbarMenu: () => delegateToCanvas(model, child),
            ChangedTextFormat: () => delegateToCanvas(model, child),
            ToggledShapePicker: () => delegateToCanvas(model, child),
            ChangedShapeColor: () => delegateToCanvas(model, child),
            OpenedContextMenu: () => delegateToCanvas(model, child),
            ClosedContextMenu: () => delegateToCanvas(model, child),
            ClipboardWritten: () => delegateToCanvas(model, child),
            RequestedLayerCopy: () => delegateToCanvas(model, child),
            RequestedLayerCut: () => delegateToCanvas(model, child),
            AddedShape: () => delegateToCanvas(model, child),
          }),
        ),
      GotEntryMessage: ({ message: child }): UpdateResult =>
        Match.value(child).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            DiscardedDraft: () => {
              const [entry, commands] = Entry.update(
                model.entry,
                child,
                model.calendar.selectedDate,
              );
              return [
                {
                  ...model,
                  route: CalendarRoute(),
                  entry,
                  canvas: { ...Canvas.loadElements(model.canvas, []), elements: [] },
                },
                mapEntry(commands),
              ];
            },
            LoadedEntry: ({ entry: loadedEntry }) => {
              const [entry, commands] = Entry.update(
                model.entry,
                child,
                model.calendar.selectedDate,
              );
              return [
                {
                  ...model,
                  entry,
                  canvas: Canvas.loadElements(
                    model.canvas,
                    loadedEntry === null ? [] : loadedEntry.document.elements,
                  ),
                },
                mapEntry(commands),
              ];
            },
            SaveRequested: () => {
              const [entry, commands] = Entry.update(
                model.entry,
                child,
                model.calendar.selectedDate,
              );
              return [
                { ...model, entry },
                [
                  ...mapEntry(commands),
                  ...mapEntry([
                    saveEntry({
                      date: model.calendar.selectedDate,
                      text: model.entry.text,
                      elements: model.canvas.elements,
                      spaceId: model.space.activeSpaceId,
                    }),
                  ]),
                ],
              ];
            },
            SavedEntry: ({ entry: savedEntry }) => {
              const [entry, commands] = Entry.update(
                model.entry,
                child,
                model.calendar.selectedDate,
              );
              return [
                notify({ ...model, entry }, "success", "Diary entry saved"),
                [
                  ...mapEntry(commands),
                  ...mapCalendar([
                    loadEntries({
                      month: savedEntry.date.slice(0, 7),
                      spaceId: model.space.activeSpaceId,
                    }),
                  ]),
                ],
              ];
            },
            FailedToSave: () => {
              const [entry, commands] = Entry.update(
                model.entry,
                child,
                model.calendar.selectedDate,
              );
              return [
                notify({ ...model, entry }, "error", "Could not save diary entry"),
                mapEntry(commands),
              ];
            },
            LoadedDraft: () => delegateToEntry(model, child),
            EntryTextChanged: () => delegateToEntry(model, child),
            StoredDraft: () => delegateToEntry(model, child),
            EntryFailedToLoad: () => delegateToEntry(model, child),
            RequestedDiscard: () => delegateToEntry(model, child),
            GotDiscardDialogMessage: () => delegateToEntry(model, child),
          }),
        ),
      GotMediaMessage: ({ message: child }): UpdateResult =>
        Match.value(child).pipe(
          Match.withReturnType<UpdateResult>(),
          Match.tagsExhaustive({
            SelectedStoredImage: ({ mediaObjectId }) => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              return [
                { ...model, media, canvas: Canvas.addImage(model.canvas, mediaObjectId) },
                mapMedia(commands),
              ];
            },
            UploadedImage: ({ mediaObjectId, title }) => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              const next = {
                ...model,
                media,
                canvas: Canvas.addImage(model.canvas, mediaObjectId, title),
              };
              return [notify(next, "success", "Image added to canvas"), mapMedia(commands)];
            },
            SelectedSticker: ({ sticker }) => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              return [
                { ...model, media, canvas: Canvas.addSticker(model.canvas, sticker) },
                mapMedia(commands),
              ];
            },
            SelectedEmoji: ({ emoji }) => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              return [
                { ...model, media, canvas: Canvas.addEmoji(model.canvas, emoji) },
                mapMedia(commands),
              ];
            },
            UploadedSticker: () => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              return [
                notify({ ...model, media }, "success", "Sticker uploaded"),
                mapMedia(commands),
              ];
            },
            FailedToUploadImage: () => {
              const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
              return [
                notify({ ...model, media }, "error", "Image upload failed"),
                mapMedia(commands),
              ];
            },
            SelectedImage: () => delegateToMedia(model, child),
            FailedToLoadMedia: () => delegateToMedia(model, child),
            GotStickerFileDropMessage: () => delegateToMedia(model, child),
            GotImagePopoverMessage: () => delegateToMedia(model, child),
            LoadedImages: () => delegateToMedia(model, child),
            GotStickerPopoverMessage: () => delegateToMedia(model, child),
            LoadedStickers: () => delegateToMedia(model, child),
            SelectedStickerTab: () => delegateToMedia(model, child),
            ChangedImageSearch: () => delegateToMedia(model, child),
            ChangedStickerSearch: () => delegateToMedia(model, child),
            ChangedEmojiSearch: () => delegateToMedia(model, child),
            GotEmojiListMessage: () => delegateToMedia(model, child),
            GotUploadDialogMessage: () => delegateToMedia(model, child),
            RequestedUpload: () => delegateToMedia(model, child),
            ChangedUploadTitle: () => delegateToMedia(model, child),
            ConfirmedUpload: () => delegateToMedia(model, child),
            GotFileDropMessage: () => delegateToMedia(model, child),
          }),
        ),
    }),
  );

const notify = (model: Model, kind: "success" | "error" | "loading", message: string): Model => ({
  ...model,
  notifications: [...model.notifications.slice(-2), { id: crypto.randomUUID(), kind, message }],
});
const delegateToCalendar = (model: Model, child: CalendarMessage): UpdateResult => {
  const [calendar, commands] = Calendar.update(model.calendar, child, model.space.activeSpaceId);
  return [{ ...model, calendar }, mapCalendar(commands)];
};
const delegateToCanvas = (model: Model, child: CanvasMessage): UpdateResult => {
  const [canvas, commands] = Canvas.update(model.canvas, child);
  return [{ ...model, canvas }, mapCanvas(commands)];
};
const delegateToEntry = (model: Model, child: EntryMessage): UpdateResult => {
  const [entry, commands] = Entry.update(model.entry, child, model.calendar.selectedDate);
  return [{ ...model, entry }, mapEntry(commands)];
};
const delegateToMedia = (model: Model, child: MediaMessage): UpdateResult => {
  const [media, commands] = Media.update(model.media, child, model.space.activeSpaceId);
  return [{ ...model, media }, mapMedia(commands)];
};
const delegateToSpace = (model: Model, child: SpaceMessage): UpdateResult => {
  const [space, commands] = Space.update(model.space, child);
  return [{ ...model, space }, mapSpace(commands)];
};

const mapCalendar = (commands: ReadonlyArray<Command.Command<CalendarMessage>>) =>
  Command.mapMessages(commands, (message) => GotCalendarMessage({ message }));
const mapEntry = (commands: ReadonlyArray<Command.Command<EntryMessage>>) =>
  Command.mapMessages(commands, (message) => GotEntryMessage({ message }));
const mapCanvas = (commands: ReadonlyArray<Command.Command<CanvasMessage>>) =>
  Command.mapMessages(commands, (message) => GotCanvasMessage({ message }));
const mapMedia = (commands: ReadonlyArray<Command.Command<MediaMessage>>) =>
  Command.mapMessages(commands, (message) => GotMediaMessage({ message }));
const mapSpace = (commands: ReadonlyArray<Command.Command<SpaceMessage>>) =>
  Command.mapMessages(commands, (message) => GotSpaceMessage({ message }));
