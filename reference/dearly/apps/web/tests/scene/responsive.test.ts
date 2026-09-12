import { Scene } from "foldkit";
import { test } from "vitest";
import { initialModel } from "../../src/app/model";
import { GotCalendarMessage } from "../../src/app/message";
import { ClosedPicker } from "../../src/calendar/message";
import { CalendarRoute } from "../../src/route";
import { update } from "../../src/app/update";
import { view } from "../../src/view";

test("calendar keeps the header copy and space control available", () => {
  Scene.scene(
    { update, view },
    Scene.with(initialModel(CalendarRoute())),
    Scene.Mount.resolve(
      { name: "mini-calendar-picker" },
      GotCalendarMessage({ message: ClosedPicker() }),
    ),
    Scene.expect(Scene.role("main")).toHaveClass("px-5"),
    Scene.expect(Scene.text("A quiet record of days worth keeping.")).toHaveClass("max-w-48"),
    Scene.expect(Scene.label("Open space settings")).toHaveClass("flex"),
  );
});

test("calendar does not render the entry canvas", () => {
  Scene.scene(
    { update, view },
    Scene.with(initialModel(CalendarRoute())),
    Scene.Mount.resolve(
      { name: "mini-calendar-picker" },
      GotCalendarMessage({ message: ClosedPicker() }),
    ),
    Scene.expect(Scene.label("Diary entry")).not.toExist(),
  );
});
