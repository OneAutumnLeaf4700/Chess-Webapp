//Import required dependencies
const lobbyManager = require('./lobbyManager');
const { Chess } = require('./chess.js-0.13.4/chess.js-0.13.4/chess.js');


// ---------------------------------
// Game Lobbies
// --------------------------------

const gamePlayers = {}; // Maps gameId -> { white: socketId, black: socketId }


module.exports = (io) => {
    
    
    // ---------------------------------
    // Server functions
    // --------------------------------
    
    function createMultiplayerGame(userId) {
        const gameId = lobbyManager.createMultiplayerGame(userId);
        return gameId;
    };

    // Update the player board
    async function updatePlayerBoard(socket, gameId) {
        const game = await lobbyManager.getGame(gameId);
        socket.emit('updateBoard', game.gameState.fen);
    }

    // Handle player assignment and send turn assignment notification to user
    async function getPlayerTeam(socket, userId, gameId) {
        console.log('Getting player team');
        console.log('User ID:', userId);
        console.log('Game ID:', gameId);
        const team = await lobbyManager.getPlayerTeam(userId, gameId);
        console.log('Player team:', team);
        socket.emit('teamAssignment', team);
    }
    
    // New function to handle player assignment and turn notification
    async function getCurrentTurn(socket, gameId) {
        const turn = await lobbyManager.getCurrentTurn(gameId);
        socket.emit('currentTurn', turn);
    }

    // Emit the current turn to both players in a game
    async function broadcastCurrentTurn(gameId) {
        const turn = await lobbyManager.getCurrentTurn(gameId);
        const players = gamePlayers[gameId] || {};
        const bothPlayersJoined = players.white && players.black;
        
        if (players.white) io.to(players.white).emit('currentTurn', turn, bothPlayersJoined);
        if (players.black) io.to(players.black).emit('currentTurn', turn, bothPlayersJoined);
    }

    // Sync Boards: send current server game state to this socket
    async function syncBoard(socket, gameId) {
        try {
            const game = await lobbyManager.getGame(gameId);
            if (game && game.gameState) {
                console.log(`Syncing board for game ${gameId}:`, game.gameState);
                socket.emit('syncBoard', game.gameState);
            }
        } catch (e) {
            console.error('Error syncing board:', e);
            // no-op if game missing
        }
    }

    // Handle the connection (or Reconnection) of a new player 
    async function handleConnection(socket, userId, gameId) {
        try {
            console.log(`Handling connection for user ${userId} to game ${gameId}`);
            
            // Verify game exists
            const game = await lobbyManager.getGame(gameId);
            if (!game) {
                socket.emit('error', 'Game not found');
                return;
            }
            
            // Check if player is already in this game
            const existingTeam = await lobbyManager.getPlayerTeam(userId, gameId);
            if (existingTeam) {
                console.log(`Player ${userId} already in game ${gameId} as ${existingTeam}`);
                
                // Update socket mapping
                if (!gamePlayers[gameId]) {
                    gamePlayers[gameId] = {};
                }
                gamePlayers[gameId][existingTeam] = socket.id;
                
                // Send existing data to client
                socket.emit('teamAssignment', existingTeam);
                await syncBoard(socket, gameId);
                await broadcastCurrentTurn(gameId);
                
                console.log(`Player ${userId} reconnected as ${existingTeam} to game ${gameId}`);
                return;
            }
            
            // Player not in game, add them
            const team = await lobbyManager.joinGame(userId, gameId);
            if (!team) {
                socket.emit('error', 'Failed to join game');
                return;
            }
            
            // Store Player in gamePlayers map
            if (!gamePlayers[gameId]) {
                gamePlayers[gameId] = {};
            }
            gamePlayers[gameId][team] = socket.id;
            
            // Send all necessary data to client
            socket.emit('teamAssignment', team);
            await syncBoard(socket, gameId);
            await broadcastCurrentTurn(gameId);
            
            // Force a board sync to ensure latest position is loaded
            setTimeout(async () => {
                await syncBoard(socket, gameId);
            }, 100);
            
            console.log(`Player ${userId} joined as ${team} to game ${gameId}`);
        } catch (error) {
            console.error('Error in handleConnection:', error);
            socket.emit('error', 'Failed to connect to game');
        }
    }

    // Make the move on the remaining client sides
    function makeMoveOnClientSide(socket, move) {
        socket.broadcast.emit('opponentMove', move)
    };
    
    // Making a move
    async function handleMove(io, socket, gameId, gameState) {
        //Save new data
        const game = await lobbyManager.updateGameState(gameId, gameState);
        console.log('Game state updated:', game);

        // Make the move on the remaining client sides
        makeMoveOnClientSide(socket, gameState.move);

        //Update the turn on the client side for both players
        broadcastCurrentTurn(gameId);
    }

    // ---------------------------------
    // Socket.io events
    // --------------------------------

    // Listen for connections
    io.on('connection', socket => {
        let currentUserId = null;
        let currentGameId = null;
        
        // Store user info in socket
        socket.on('setUserInfo', (userId, gameId) => {
            currentUserId = userId;
            currentGameId = gameId;
            socket.userId = userId;
            socket.gameId = gameId;
        });
        
        // ---------------------------------
        // Multiplayer events
        // --------------------------------
        
        socket.on('userConnected', async (userId, gameId) => {
            try {
                currentUserId = userId;
                currentGameId = gameId;
                socket.userId = userId;
                socket.gameId = gameId;
                
                if (gamePlayers[gameId] && (gamePlayers[gameId].white === socket.id || gamePlayers[gameId].black === socket.id)) {
                    console.log(`Player ${userId} reconnected to game ${gameId}`);
                    // Re-sync the board for reconnected player
                    await syncBoard(socket, gameId);
                } else {
                    await handleConnection(socket, userId, gameId);
                }
            } catch (error) {
                console.error('Error in userConnected:', error);
                socket.emit('error', 'Failed to connect to game');
            }
        });
        

        // Creating a new multiplayer game
        socket.on('newMultiplayerGameRequested', async (userId) => {
            try {
                console.log('Creating new multiplayer game for userId:', userId);
                const gameId = await createMultiplayerGame(userId); // Get the game ID of the created game
                console.log('Game created successfully with ID:', gameId);
                socket.emit('newMultiplayerGameCreated', gameId); // Emit the game ID to the client
            } catch (error) {
                console.error('Error creating multiplayer game:', error);
                socket.emit('error', 'Failed to create game. Please try again.');
            }
        });

        // Joining an existing multiplayer game
        socket.on('joinGameRequested', async (userId, gameId) => {
            try {
              // Call the joinGame function and await the result
              const joinedGameId = await lobbyManager.joinGame(userId, gameId);
          
              // Emit the joined game ID back to the client
              socket.emit('joinGameReplied', (joinedGameId));
            }
            catch (error) {
              console.error('Error joining game:', error.message);
          
              // Emit the error to the client
              socket.emit('joinGameReplied', (null));
            }
          });
        
        // Sync Boards
        socket.on('syncBoard', (gameId) => {
            syncBoard(socket, gameId);
        });

        //Request Board Sync
        socket.on('requestBoardSync', (gameId) => {
            syncBoard(socket, gameId);
        });

        // Making a move
        socket.on('move', async (gameId, gameState) => {
            try {
                // Validate that the user is in this game
                if (!currentUserId || !currentGameId || currentGameId !== gameId) {
                    socket.emit('error', 'Invalid game access');
                    return;
                }
                
                // Validate game state
                if (!gameState || !gameState.fen || !gameState.pgn) {
                    socket.emit('error', 'Invalid move data');
                    return;
                }
                
                await handleMove(io, socket, gameId, gameState);
            } catch (error) {
                console.error('Error handling move:', error);
                socket.emit('error', 'Failed to make move');
            }
        });

        // Offer draw
        socket.on('offerDraw', async (gameId) => {
            try {
                if (!currentUserId || !currentGameId || currentGameId !== gameId) {
                    socket.emit('error', 'Invalid game access');
                    return;
                }
                
                const players = gamePlayers[gameId] || {};
                const opponentId = (players.white === socket.id) ? players.black : players.white;
                if (opponentId) {
                    io.to(opponentId).emit('drawOffered');
                    console.log(`Draw offered in game ${gameId} by ${currentUserId}`);
                }
            } catch (error) {
                console.error('Error offering draw:', error);
                socket.emit('error', 'Failed to offer draw');
            }
        });

        // Respond to draw
        socket.on('respondDraw', async (gameId, accepted) => {
            try {
                if (!currentUserId || !currentGameId || currentGameId !== gameId) {
                    socket.emit('error', 'Invalid game access');
                    return;
                }
                
                const players = gamePlayers[gameId] || {};
                const opponentId = (players.white === socket.id) ? players.black : players.white;
                
                if (accepted) {
                    // Set outcome to draw
                    const game = await lobbyManager.getGame(gameId);
                    const updated = {
                        turn: game.gameState.turn,
                        fen: game.gameState.fen,
                        pgn: game.gameState.pgn,
                        outcome: 'draw'
                    };
                    await lobbyManager.updateGameState(gameId, updated);
                    
                    if (players.white) io.to(players.white).emit('gameDrawn');
                    if (players.black) io.to(players.black).emit('gameDrawn');
                    console.log(`Game ${gameId} ended in draw`);
                } else if (opponentId) {
                    io.to(opponentId).emit('drawDeclined');
                    console.log(`Draw declined in game ${gameId} by ${currentUserId}`);
                }
            } catch (error) {
                console.error('Error responding to draw:', error);
                socket.emit('error', 'Failed to respond to draw');
            }
        });

        // Resign
        socket.on('resign', async (gameId) => {
            try {
                if (!currentUserId || !currentGameId || currentGameId !== gameId) {
                    socket.emit('error', 'Invalid game access');
                    return;
                }
                
                const players = gamePlayers[gameId] || {};
                const opponentId = (players.white === socket.id) ? players.black : players.white;
                
                // Get the resigning player's color
                const resigningPlayerColor = (players.white === socket.id) ? 'white' : 'black';
                
                // Mark outcome as checkmate (opponent wins)
                const game = await lobbyManager.getGame(gameId);
                const updated = {
                    turn: game.gameState.turn,
                    fen: game.gameState.fen,
                    pgn: game.gameState.pgn,
                    outcome: 'checkmate'
                };
                await lobbyManager.updateGameState(gameId, updated);
                
                // Send resign message to both players
                if (opponentId) {
                    io.to(opponentId).emit('opponentResigned', resigningPlayerColor);
                }
                socket.emit('youResigned', resigningPlayerColor);
                
                // Also broadcast to all players in the game to ensure message is received
                if (players.white) io.to(players.white).emit('gameEnded', 'resignation', resigningPlayerColor);
                if (players.black) io.to(players.black).emit('gameEnded', 'resignation', resigningPlayerColor);
                console.log(`Player ${currentUserId} (${resigningPlayerColor}) resigned in game ${gameId}`);
            } catch (error) {
                console.error('Error handling resignation:', error);
                socket.emit('error', 'Failed to resign');
            }
        });

        // Handle disconnecting player
        socket.on('disconnect', async () => {
            try {
                const disconnectedPlayerId = socket.id;
                console.log(`Player ${currentUserId} disconnected from socket ${disconnectedPlayerId}`);
                
                // Find which game the player was in
                for (const gameId in gamePlayers) {
                    const players = gamePlayers[gameId];
                    
                    if (players.white === disconnectedPlayerId || players.black === disconnectedPlayerId) {
                        const opponentId = players.white === disconnectedPlayerId ? players.black : players.white;
            
                        // Notify only the opponent, not all users
                        if (opponentId) {
                            io.to(opponentId).emit('opponentDisconnected');
                            console.log(`Notified opponent in game ${gameId} of disconnection`);
                        }
            
                        // Remove player from tracking but keep game alive for reconnection
                        // Only delete if both players are gone
                        if (!opponentId) {
                            delete gamePlayers[gameId];
                            console.log(`Game ${gameId} deleted - no players remaining`);
                        } else {
                            // Remove only the disconnected player
                            if (players.white === disconnectedPlayerId) {
                                delete players.white;
                            } else {
                                delete players.black;
                            }
                            console.log(`Player removed from game ${gameId}, game remains active`);
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
        
    });
};


