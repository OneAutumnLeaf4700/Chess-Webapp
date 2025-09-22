# Chess Webapp

Modern, real-time chess playable in the browser. Supports multiplayer lobbies, robust board sync, resign/draw flows, theme switching, and sound. Built with Socket.IO, Express, and Chess.js/Chessboard.js.

## Highlights
- **Multiplayer lobbies** with unique game IDs
- **Move gating**: First player cannot move until both players have joined
- **Instant board sync** on join, reconnect, piece-set change, and page reload
- **Clear end-of-game UX** for resign/draw, shown to both players
- **Theme and piece-set switching** without losing board position
- **Resilient DB handling**: Works with MongoDB when available; falls back to in-memory store when not

## Architecture
- `server/` Express + Socket.IO backend
  - Serves static `client/` assets
  - Manages lobbies, teams, turns, and authoritative game state (FEN/PGN/outcome)
  - Emits sync/turn/outcome events to clients
- `client/` Static HTML/CSS/JS
  - Game UI (`client/game/`)
  - Menus (`client/menu/`)
  - Assets: images and sounds

## Key Gameplay Behaviors
- **Joining**
  - Create: Main menu → Multiplayer → Create Game
  - Join: Use game ID via modal, or go directly to `/game/{gameId}`
- **Move gating**
  - The player who joins first cannot make any moves until the opponent joins. Attempting to move will show an error.
- **Board sync**
  - On join/reconnect, server sends authoritative game state (`fen`, `pgn`, `turn`, `outcome`)
  - On piece-set changes, client restores the same position
  - On page reloads, client immediately resyncs from server
- **Resign / Draw**
  - Resign messages clearly indicate who resigned (White/Black)
  - Resign and draw outcomes are shown to both players

## Project Structure
```
client/
  audio/
  game/
    index.html
    script.js
    styles.css
  img/
  menu/
    mainmenu/
    multiplayer/
    singleplayer/
server/
  database/
    db.js
    dbschema.js
  chess.js-0.13.4/
  config.js
  io.js
  lobbyManager.js
  routes.js
  server.js
```

## Prerequisites
- Node.js 18+
- npm 9+
- Optional: MongoDB (local or hosted). If not present, the server uses an in-memory store.

## Setup & Run (Local)
```
git clone https://github.com/OneAutumnLeaf4700/Chess-Webapp.git
cd Chess-Webapp/server
npm install

# Optional: set Mongo connection
# set MONGODB_URI=mongodb://127.0.0.1:27017/chessGames   (Windows cmd)
# export MONGODB_URI=mongodb://127.0.0.1:27017/chessGames (bash/zsh)

npm start
```
Server will run at `http://localhost:3000` and serve the client.

## Using the App
- Open `http://localhost:3000/` → Main menu
- Singleplayer: `http://localhost:3000/singleplayer`
- Multiplayer: `http://localhost:3000/multiplayer`
- Shareable game URL: `http://localhost:3000/game/{gameId}`

## Important Socket Events
- Server → Client
  - `teamAssignment(team)` → "white" or "black"
  - `currentTurn(turn, bothPlayersJoined)` → `turn`: "w" | "b"
  - `syncBoard({ turn, fen, pgn, outcome })` → authoritative state
  - `opponentMove(move)` → apply move, update board
  - `opponentResigned(color)` / `youResigned(color)`
  - `gameDrawn` / `drawOffered` / `drawDeclined`
  - `gameEnded('resignation', color)` → broadcast for early resigns
- Client → Server
  - `newMultiplayerGameRequested(userId)` → creates lobby, returns gameId
  - `userConnected(userId, gameId)` → join or reconnect to a lobby
  - `move(gameId, gameState)` → only succeeds if both players joined
  - `requestBoardSync(gameId)`
  - `offerDraw(gameId)` / `respondDraw(gameId, accepted)`
  - `resign(gameId)`

## Configuration
- `PORT` (optional): defaults to `3000`
- `MONGODB_URI` (optional): if unset or DB is unavailable, server uses in-memory storage

## Deploying
- The server statically serves `client/` assets
- Ensure environment variables are set (`PORT`, optional `MONGODB_URI`)
- Socket.IO CORS in `server.js` is permissive by default; scope as needed

## Development Notes
- Client computes and renders locally, but the server remains the source of truth
- Board state updates and turn changes are persisted on the server (DB or memory)
- Piece-set/theme changes do not alter the game state

## License
MIT