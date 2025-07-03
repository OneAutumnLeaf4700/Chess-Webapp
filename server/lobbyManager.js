const mongoose = require('mongoose');
const Game = require('./database/dbschema.js');

// Helper function to generate a unique lobby ID
function generateLobbyId() {
  return new mongoose.Types.ObjectId().toString();  // Using ObjectId to generate a unique lobby ID
}

// Function to create a new game lobby
async function createMultiplayerGame(userId) {
  const color = Math.random() < 0.5 ? 'white' : 'black'; // Randomly assign 'white' or 'black' for first player to join

  const newGame = new Game({
    gameId: generateLobbyId(), // Generate a unique lobby ID
    
    players: [{ 
      userId,  
      color
    }],

    gameState: {
      turn: 'w', // Default starting turn
      fen: 'start', // Default starting position of chessboard
      pgn: '' // Default PGN
    },

    outcome: 'ongoing' // Status before the second player joins
  });

  // Save the game to the database
  const savedGame = await newGame.save();
  console.log('Game saved successfully:', savedGame);

  return savedGame.gameId; // Return the gameId after saving
}

// Function to join an existing game
async function joinGame(userId, gameId) {
  try {
    console.log('Attempting to join game with ID:', gameId);

    // Find the game by gameId
    const game = await Game.findOne({ gameId });
    console.log('Game found:', game);

    if (!game) {
      console.error('Game not found');
      return null;
    }

    // Check if the game already has two players
    if (game.players.length >= 2) {
      console.error('Game is already full');
      return;
    }

    // Assign color to the new player
    const existingColors = game.players.map(player => player.color);
    console.log('Existing player colors:', existingColors);
    const newColor = existingColors.includes('white') ? 'black' : 'white';

    // Add the new player to the game
    game.players.push({ userId, color: newColor });
    console.log('New player added:', { userId, color: newColor });

    // Save the updated game to the database
    await game.save();
    console.log('Game updated successfully:', game);

    console.log('Player added successfully:', { userId, color: newColor });
    return game.gameId;
  } catch (error) {
    console.error('Error joining game:', error.message);
    throw error;
  }
}

// Helper function to get the team of a player
async function getPlayerTeam(userId, gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      console.error(`Game with ID ${gameId} not found.`);
      console.log(`Game with ID ${gameId} not found.`);
      return null;
    }
    const player = game.players.find(p => p.userId === userId.toString());
    return player ? player.color : null;
  } catch (error) {
    console.error(`Error fetching player color: ${error.message}`);
    console.log(`Error fetching player color: ${error.message}`);
    return null;
  }
}

// Helper function to get the current turn
async function getCurrentTurn(gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      console.error(`Game with ID ${gameId} not found.`);
      return null;
    }
    return game.gameState.turn;
  }
  catch (error) {
    console.error(`Error fetching current turn: ${error.message}`);
    return null;
  }
}

// Function to make a move in the game
async function updateGameState(gameId, gameStateObject) {
  return Game.findOne({ gameId }).then(game => {
    
    // Update Turn, FEN and PGN
    game.gameState.turn = gameStateObject.turn // Update turn
    game.gameState.fen = gameStateObject.fen; // Update FEN
    game.gameState.pgn = gameStateObject.pgn; // Update PGN

    //Update outcome
    game.outcome = gameStateObject.outcome;

    //Return game object after saving
    return game.save();
  });
}

async function getGame(gameId) {
  try {
    const game = await Game.findOne({gameId});
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  } catch (error) {
    console.error('Error retrieving game:', error.message);
    throw error;
  }
}

// Handle disconnecting player
async function handleDisconnect(gameId) {
  try {
    const game = await Game.findOne({ gameId });
    if (!game) {
      console.error(`Game with ID ${gameId} not found.`);
      return null;
    }

    // Remove the game from the database
    await Game.deleteOne({ gameId });
    console.log(`Game with ID ${gameId} has been deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`Error deleting game: ${error.message}`);
    throw error;
  }
}




module.exports = {
  createMultiplayerGame,
  joinGame,
  getPlayerTeam,
  getCurrentTurn,
  updateGameState,
  getGame,
  handleDisconnect,
};
