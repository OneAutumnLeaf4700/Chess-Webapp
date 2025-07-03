const mongoose = require('mongoose');

// Define the schema for the Game
const gameSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true
    },

    players: [
        {
          userId: { type: String, required: true }, // Unique identifier for backend use
          color: { type: String, enum: ['white', 'black'], required: true },
        }
      ],
    gameState: {
        turn: { 
            type: String, 
            enum: ['w', 'b'], 
            default: 'w' 
        },
        fen: { 
            type: String, 
            required: true, 
            default: 'start' // Initial FEN position
        },
        pgn: { 
            type: String, 
            required: false, 
            default: ''
        }
    },
    
    outcome: {
        type: String, 
        enum: ['ongoing', 'checkmate', 'draw'], 
        default: 'ongoing'
    }
}, { timestamps: true });

// Model the schema into a Mongoose model
const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
