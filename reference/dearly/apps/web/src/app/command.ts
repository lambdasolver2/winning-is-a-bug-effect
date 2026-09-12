import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { load, pushUrl } from "foldkit/navigation";
import { CompletedLoadExternal, CompletedLogout, CompletedNavigateInternal } from "./message";

export const NavigateInternal = Command.define(
  "NavigateInternal",
  { url: Schema.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())));

export const LoadExternal = Command.define(
  "LoadExternal",
  { href: Schema.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())));

export const Logout = Command.define(
  "Logout",
  CompletedLogout,
)(
  Effect.tryPromise(() => fetch("/cdn-cgi/access/logout", { credentials: "include" })).pipe(
    Effect.ignore,
    Effect.andThen(Effect.sync(() => window.location.assign("/"))),
    Effect.as(CompletedLogout()),
  ),
);
