# Chess Webapp

## Overview
Chess Webapp is a feature-rich online chess platform that allows users to play chess in single-player and multiplayer modes. It includes a visually appealing interface, sound effects, and customizable themes. The server-side implementation supports real-time multiplayer functionality.

## Features
- **Singleplayer Mode**: Play against AI.
- **Multiplayer Mode**: Play against other users in real-time.
- **Customizable Themes**: Choose from different chessboards and chess pieces.
- **Sound Effects**: Includes sound effects for moves, captures, and other game events.
- **Preloaded Assets**: Optimized for faster loading.

## Project Structure
```
chess-webapp/
  client/
    audio/          # Sound effects for chess moves and events
    game/           # Game interface files (HTML, CSS, JS)
    img/            # Images for chessboards, pieces, and icons
    menu/           # Menu interface files (HTML, CSS, JS)
  server/
    config.js       # Server configuration
    io.js           # Socket.IO setup for real-time communication
    lobbyManager.js # Manages multiplayer lobbies
    routes.js       # API routes
    server.js       # Main server file
    database/       # Database schema and connection
```

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chess-webapp.git
   ```
2. Navigate to the server directory:
   ```bash
   cd chess-webapp/server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Usage
- Open the `index.html` file in the `client/game/` directory to play singleplayer mode.
- Access the multiplayer mode by navigating to the appropriate menu in the web interface.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.