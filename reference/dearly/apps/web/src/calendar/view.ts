import { Html } from "foldkit";
import { monthDays } from "../date";
import type { AppMessage } from "../app/message";
import type { Model as AppModel } from "../app/model";
import { Notifications } from "../notification/view";
import { InviteDialog } from "../space/inviteDialog";
import { SettingsPopover } from "../space/view";
import { dateCard, miniCalendar, monthHeader, previewFor, weekdays } from "./components";

export const calendarPage = (model: AppModel): Html.Document => {
  const h = Html.html<AppMessage>();
  const calendar = model.calendar;
  const { month, selectedDate } = calendar;

  return {
    title: "Dearly — calendar",
    body: h.main(
      [h.Class("paper-grain min-h-screen bg-paper px-5 py-7 text-ink sm:px-10 lg:px-16")],
      [
        h.header(
          [h.Class("mx-auto flex max-w-6xl items-end justify-between border-b border-line pb-7")],
          [
            h.div(
              [],
              [
                h.p(
                  [h.Class("font-note text-[10px] tracking-[.18em] text-wine uppercase")],
                  ["PRIVATE DIARY"],
                ),
                h.h1(
                  [h.Class("mt-2 font-display text-5xl leading-none tracking-tight sm:text-6xl")],
                  ["Dearly"],
                ),
              ],
            ),
            h.div(
              [h.Class("flex flex-col items-end gap-2")],
              [
                h.p(
                  [h.Class("max-w-48 text-right text-sm leading-5 text-muted")],
                  ["A quiet record of days worth keeping."],
                ),
                SettingsPopover(h, model.space),
              ],
            ),
          ],
        ),
        h.section(
          [h.Class("mx-auto max-w-6xl pt-9")],
          [
            h.div(
              [h.Class("grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]")],
              [
                miniCalendar(
                  h,
                  month,
                  selectedDate,
                  calendar.entries,
                  calendar.pickerOpen,
                  calendar.pickerYear,
                  calendar.photoPreviewOpen,
                ),
                h.div(
                  [h.Class("min-w-0")],
                  [
                    monthHeader(h, month, selectedDate),
                    h.div(
                      [
                        h.Class(
                          "mt-8 grid grid-cols-7 overflow-hidden rounded-[var(--radius)] border border-line [&>*:nth-child(7n)]:border-r-0",
                        ),
                      ],
                      [
                        ...weekdays.map((weekday, index) =>
                          h.div(
                            [
                              h.Class(
                                `border-r border-b border-line px-2 py-3 font-note text-[10px] tracking-[.12em] text-foreground uppercase ${index < 2 ? "bg-primary/25" : index < 5 ? "bg-accent/45" : "bg-secondary/25"}`,
                              ),
                            ],
                            [weekday],
                          ),
                        ),
                        ...monthDays(month).map((date) =>
                          dateCard(h, date, selectedDate, previewFor(calendar.entries, date)),
                        ),
                      ],
                    ),
                    h.footer(
                      [
                        h.Class(
                          "mt-7 flex items-center justify-between font-note text-[10px] tracking-[.1em] text-muted uppercase",
                        ),
                      ],
                      [
                        h.span(
                          [],
                          [
                            calendar.loadState === "loading"
                              ? "Refreshing the month"
                              : "One page for every day",
                          ],
                        ),
                        h.span(
                          [],
                          [calendar.session === null ? "Access check pending" : "Private archive"],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        InviteDialog(h, model.space),
        Notifications(h, model.notifications),
      ],
    ),
  };
};
