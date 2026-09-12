/**
 * Game UI commands: explicit side effects as values (Dearly: `app/command.ts`).
 *
 * @since 0.1.0
 */
import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { Game } from "@wib/domain";
import { ReceivedRemoteBoard, RemoteMoveFailed } from "./message.js";

/** Decode a remote board payload through the verified schema. @category Commands @since 0.1.0 */
const decodeRemoteBoard = Schema.decodeUnknownSync(Game.Game);

const postBoard = (api: string, board: Game.Game, move: Game.Move): Promise<Game.Game> =>
  fetch(`${api}/api/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      state: { x: board.x, y: board.y, won: board.won },
      moves: [move],
    }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`server responded ${res.status}`);
    return decodeRemoteBoard(await res.json());
  });

/**
 * Apply one move on the remote rules server (`POST /api/apply`).
 * The response is decoded through `Game.Game`, so a misbehaving server
 * becomes a typed `RemoteMoveFailed`, never a corrupt board.
 *
 * @category Commands
 * @since 0.1.0
 */
export const ApplyRemoteMove = Command.define("ApplyRemoteMove", {
  args: {
    api: Schema.String,
    board: Game.Game,
    move: Game.Move,
  },
  messages: [ReceivedRemoteBoard, RemoteMoveFailed],
  execute: ({ api, board, move }) =>
    Effect.tryPromise(() => postBoard(api, board, move)).pipe(
      Effect.map((next) => new ReceivedRemoteBoard({ board: next, move })),
      Effect.orElseSucceed(
        () => new RemoteMoveFailed({ reason: "server unreachable — restart npm run server" }),
      ),
    ),
});
