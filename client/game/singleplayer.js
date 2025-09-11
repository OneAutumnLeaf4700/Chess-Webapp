// --------------------------------
// Chess Singleplayer Implementation
// --------------------------------

// Get URL parameters for game configuration
const urlParams = new URLSearchParams(window.location.search);
const difficulty = parseInt(urlParams.get('difficulty')) || 3;
const playerColor = urlParams.get('color') === 'random' ? 
    (Math.random() < 0.5 ? 'white' : 'black') : 
    (urlParams.get('color') || 'white');

// Game state variables
let pieceSet = 'lichess';
let userInteracted = false;
let isPromotionModalOpen = false;
let isGameEndPopupOpen = false;
let myColor = playerColor;
let aiColor = playerColor === 'white' ? 'black' : 'white';
let isTurn = playerColor === 'white'; // Player starts if white
let gameHasStarted = true;
let $status = $('#status');
let $fen = $('#fen');
let $pgn = $('#pgn');
let gameOver = false;
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';
let isAiThinking = false;

const icons = {
  light: '../img/copyicon/copy-icon-light.png',
  dark: '../img/copyicon/copy-icon-dark.png'
};

// Board settings
let config = {
  draggable: true,
  position: 'start',
  orientation: playerColor,
  showNotation: false,
  dropOffBoard: 'snapback',
  pieceTheme: `../img/chesspieces/${pieceSet}/{piece}.png`,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd
};

// Preload sounds
const sounds = {
  initialSilence: new Audio('/audio/preload/blank.mp3'),
  move: new Audio('/audio/lichess/move.mp3'),
  capture: new Audio('/audio/lichess/capture.mp3'),
  promotion: new Audio('/audio/chesscom/promote.webm'),
  check: new Audio('/audio/chesscom/check.webm'),
  castle: new Audio('/audio/chesscom/castle.webm'),
  checkmate: new Audio('/audio/chesscom/check.webm')
};

// Create chess board and game
let board = Chessboard('myBoard', config);
let game = new Chess();

// --------------------------------
// AI Chess Engine
// --------------------------------

// Piece value constants (improved values)
const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Opening book for better early game play
const openingMoves = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': ['e4', 'd4', 'Nf3', 'c4'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': ['e5', 'c5', 'e6', 'c6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1': ['d5', 'Nf6', 'e6', 'c6'],
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2': ['Nc3', 'Nf3', 'd3'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3': ['Nf3', 'Nc3', 'Bc4']
};

// Position evaluation tables
const pawnEvalWhite = [
  [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
  [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
  [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
  [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
  [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
  [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
  [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
  [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
];

const knightEval = [
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
  [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
  [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
  [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
  [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
  [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
  [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
];

const bishopEvalWhite = [
  [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
  [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
  [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
  [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
  [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
  [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
  [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
  [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

const rookEvalWhite = [
  [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
  [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
  [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
  [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
  [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
  [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
  [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
  [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
];

const queenEval = [
  [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
  [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
  [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
  [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
  [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
  [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
  [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
  [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

const kingEvalWhite = [
  [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [ -2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
  [ -1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
  [  2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0 ],
  [  2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0 ]
];

// Reverse arrays for black pieces
const pawnEvalBlack = reverseArray(pawnEvalWhite);
const bishopEvalBlack = reverseArray(bishopEvalWhite);
const rookEvalBlack = reverseArray(rookEvalWhite);
const kingEvalBlack = reverseArray(kingEvalWhite);

function reverseArray(array) {
  return array.slice().reverse();
}

// Get piece square value
function getPieceValue(piece, x, y) {
  if (piece === null) {
    return 0;
  }
  
  let absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);
  return piece.color === 'w' ? absoluteValue : -absoluteValue;
}

function getAbsoluteValue(piece, isWhite, x, y) {
  if (piece.type === 'p') {
    return 100 + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
  } else if (piece.type === 'r') {
    return 500 + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
  } else if (piece.type === 'n') {
    return 320 + knightEval[y][x];
  } else if (piece.type === 'b') {
    return 330 + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
  } else if (piece.type === 'q') {
    return 900 + queenEval[y][x];
  } else if (piece.type === 'k') {
    return 20000 + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
  }
  throw "Unknown piece type: " + piece.type;
}

// Evaluate board position
function evaluateBoard(game) {
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEvaluation = totalEvaluation + getPieceValue(game.board()[i][j], i, j);
    }
  }
  return totalEvaluation;
}

// Minimax algorithm with alpha-beta pruning
function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
  if (depth === 0) {
    return -evaluateBoard(game);
  }
  
  const newGameMoves = game.moves();
  
  if (isMaximizingPlayer) {
    let bestMove = -9999;
    for (let i = 0; i < newGameMoves.length; i++) {
      game.move(newGameMoves[i]);
      bestMove = Math.max(bestMove, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      alpha = Math.max(alpha, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  } else {
    let bestMove = 9999;
    for (let i = 0; i < newGameMoves.length; i++) {
      game.move(newGameMoves[i]);
      bestMove = Math.min(bestMove, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      beta = Math.min(beta, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  }
}

// Check opening book first
function getOpeningMove(game) {
  const fen = game.fen();
  const possibleMoves = openingMoves[fen];
  if (possibleMoves && possibleMoves.length > 0) {
    // Add some randomness to opening play
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const selectedMove = possibleMoves[randomIndex];
    
    // Verify the move is legal
    const legalMoves = game.moves();
    if (legalMoves.includes(selectedMove)) {
      return selectedMove;
    }
  }
  return null;
}

// Calculate best move for AI
function calculateBestMove(game, depth) {
  // First check opening book
  const openingMove = getOpeningMove(game);
  if (openingMove) {
    return openingMove;
  }
  
  const newGameMoves = game.moves();
  let bestMove = null;
  let bestValue = -9999;
  
  // Add some randomness for same-value moves
  const moveEvaluations = [];
  
  for (let i = 0; i < newGameMoves.length; i++) {
    const newGameMove = newGameMoves[i];
    game.move(newGameMove);
    const boardValue = minimax(game, depth - 1, -10000, 10000, false);
    game.undo();
    
    moveEvaluations.push({ move: newGameMove, value: boardValue });
    
    if (boardValue > bestValue) {
      bestValue = boardValue;
      bestMove = newGameMove;
    }
  }
  
  // If multiple moves have the same best value, pick randomly
  const bestMoves = moveEvaluations.filter(m => Math.abs(m.value - bestValue) < 0.1);
  if (bestMoves.length > 1) {
    const randomBest = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return randomBest.move;
  }
  
  return bestMove;
}

// Make AI move
function makeAiMove() {
  if (game.game_over() || isAiThinking) {
    return;
  }
  
  isAiThinking = true;
  $status.html('AI is thinking...');
  
  // Use setTimeout to make the AI think for a short while
  setTimeout(() => {
    const bestMove = calculateBestMove(game, difficulty);
    if (bestMove) {
      const move = game.move(bestMove);
      board.position(game.fen());
      playSound(move);
      updateStatus();
      isTurn = true; // Player's turn
    }
    isAiThinking = false;
  }, 300 + Math.random() * 700); // Random delay between 0.3-1.0 seconds
}

// --------------------------------
// Game Logic (adapted from multiplayer)
// --------------------------------

function onDragStart(source, piece, position, orientation) {
  // Do not pick up pieces if the game is over
  if (game.game_over() || isPromotionModalOpen || !isTurn || isAiThinking) return false;

  // Prevent picking up opponent's pieces
  if ((myColor === 'black' && piece.search(/^w/) !== -1) || 
      (myColor === 'white' && piece.search(/^b/) !== -1)) {
    return false;
  }

  return true;
}

async function onDrop(source, target) {
  // do not pick up pieces if the game is over
  if (game.game_over() || !isTurn || isAiThinking) return false;

  //Prevent dropping if promotion modal is open
  if (isPromotionModalOpen) return 'snapback';
  
  // Remove grey squares
  removeGreySquares();

  // Check if the move is a pawn reaching the promotion rank
  const piece = game.get(source).type; // Get the piece type
  const promotionRank = target.endsWith('8') || target.endsWith('1'); // Check rank

  let promotion = 'q'; // Default to queen

  //Handle promotion
  if (piece === 'p' && promotionRank) {
    let validPromotionSelected = false;

    // Loop until a valid promotion choice is made or the user cancels
    while (!validPromotionSelected) {
      try {
        // Wait for the user to select a promotion piece (or cancel)
        promotion = await openPromotionModal(); // This will resolve with the selected piece or reject on cancel
        validPromotionSelected = true; // If a valid selection is made, exit the loop
      } catch (reason) {
        // Handle the cancelation (if the user pressed Escape)
        if (reason === 'cancel') {
          return 'snapback'; // Return 'snapback' to reset the piece position or cancel the move
        }
      }
    }
  }

  // Now that the promotion piece is selected, proceed with the move
  const move = game.move({
    from: source,
    to: target,
    promotion: promotion
  });

  // If the move is illegal, snap the piece back
  if (move === null) return 'snapback';

  //Update the board position after the move
  board.position(game.fen());

  //Play corresponding sound
  playSound(move);

  // Update the website labels
  updateStatus();

  // Player's turn is over
  isTurn = false;

  // Check if game is over
  if (!game.game_over()) {
    // Make AI move after a short delay
    setTimeout(makeAiMove, 250);
  }
}

// Finalize the move visually
function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  let status = '';

  let moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
    openGameEndPopup(status);
  }
  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position';
    openGameEndPopup(status);
  }
  // game still on
  else {
    status = moveColor + ' to move';

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  $status.html(status);
  $fen.html(game.fen());
  $pgn.html(game.pgn());
}

// --------------------------------
// Sound and UI Functions (same as multiplayer)
// --------------------------------

function getSoundForMove(move) {
  if (move == null) {
    return 'error';
  }
  else if (move.captured) {
      return 'capture';
  } else if (move.promotion) {
      return 'promotion';
  } else if (game.in_checkmate() || game.in_check()) {
      return 'check';
  } else if (move.from === 'e1' && move.to === 'g1' || move.from === 'e8' && move.to === 'g8' || move.from === 'e1' && move.to === 'c1' || move.from === 'e8' && move.to === 'c8') {
      return 'castle';
  }
  return 'move';
}

function playSound(move) {
  const sound = getSoundForMove(move);

  switch (sound) {
    case 'move':
      sounds.move.play().catch(error => console.error('Error playing move sound:', error));
      break;
    case 'capture':
      sounds.capture.play().catch(error => console.error('Error playing capture sound:', error));
      break;
    case 'promotion':
      sounds.promotion.play().catch(error => console.error('Error playing promotion sound:', error));
      break;
    case 'check':
      sounds.check.play().catch(error => console.error('Error playing check sound:', error));
      break;
    case 'castle':
      sounds.castle.play().catch(error => console.error('Error playing castle sound:', error));
      break;
    case 'checkmate':
      sounds.checkmate.play().catch(error => console.error('Error playing checkmate sound:', error));
      break;
    case 'error':
      console.warn('Invalid move. Sound will not play.');
      break;
    default:
      console.warn('Unknown sound:', sound);
  }
}

function changePieceSet(set) {
  const newPieceTheme = `../img/chesspieces/${set}/{piece}.png`;

  // Update the chessboard
  config.pieceTheme = newPieceTheme;
  board = Chessboard('myBoard', config);
  board.position(game.fen());

  // Update Promotion Modal
  updatePromotionModal(set);
}

// --------------------------------
// Highlight Legal Moves
// --------------------------------

function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

function greySquare(square) {
  let $square = $('#myBoard .square-' + square);
  let background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }
  $square.css('background', background);
}

function onMouseoverSquare(square, piece) {
  // Only proceed if it's the current player's turn
  if (!isTurn || isPromotionModalOpen || isAiThinking) return;

  // Get the color of the piece (first character of the piece type)
  if (piece === false) return;

  let pieceColor = piece.charAt(0); // 'w' for white, 'b' for black

  // Only highlight moves if the piece belongs to the current player
  if ((myColor === 'white' && pieceColor === 'w') || (myColor === 'black' && pieceColor === 'b')) {
    // Get the list of legal moves for this square
    let moves = game.moves({
        square: square,
        verbose: true
    });

    // Exit if there are no legal moves available for this square
    if (moves.length === 0) return;

    // Highlight the square they moused over
    greySquare(square);

    // Highlight the possible squares for this piece
    for (let i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
}

// --------------------------------
// Event Listeners
// --------------------------------

// Theme Switching
document.addEventListener('DOMContentLoaded', loadTheme);

document.getElementById('lightTheme').addEventListener('click', () => {
  document.body.removeAttribute('data-theme');
  updateActiveThemeButton('lightTheme');
  localStorage.setItem('theme', 'light');
  updateCopyButtonImage('light');
});

document.getElementById('darkTheme').addEventListener('click', () => {
  document.body.setAttribute('data-theme', 'dark');
  updateActiveThemeButton('darkTheme');
  localStorage.setItem('theme', 'dark');
  updateCopyButtonImage('dark');
});

//Play sound on first interaction to unlock future sound playback
document.addEventListener('click', () => {
  userInteracted = true;
  sounds.initialSilence.play().catch(error => console.log("Audio playback blocked:", error));
}, { once: true });

// FEN copy functionality
document.getElementById('copyFen').addEventListener('click', () => {
  const fen = game.fen();
  navigator.clipboard.writeText(fen).then(() => {
      const btn = document.getElementById('copyFen');
      btn.textContent = 'Copied!';
      setTimeout(() => {
          btn.textContent = 'Copy FEN';
      }, 2000);
  }).catch(err => {
      console.error('Failed to copy FEN:', err);
  });
});

// PGN copy functionality
document.getElementById('copyPgn').addEventListener('click', () => {
  const pgn = document.getElementById('pgn').innerText;
  navigator.clipboard.writeText(pgn).then(() => {
      const btn = document.getElementById('copyPgn');
      btn.textContent = 'Copied!';
      setTimeout(() => {
          btn.textContent = 'Copy PGN';
      }, 2000);
  }).catch(err => {
      console.error('Failed to copy PGN:', err);
  });
});

// Change piece set to Lichess
document.getElementById('lichess-btn').addEventListener('click', () => {
  changePieceSet('lichess');
});

// Change piece set to Chess.com
document.getElementById('chesscom-btn').addEventListener('click', () => {
  changePieceSet('chesscom');
});

// New game button
document.getElementById('new-game-btn').addEventListener('click', () => {
  window.location.href = '/menu/singleplayer/singleplayer.html';
});

document.getElementById('new-game-popup-btn').addEventListener('click', () => {
  window.location.href = '/menu/singleplayer/singleplayer.html';
});

// Back to menu button
document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  window.location.href = '/menu/mainmenu/mainmenu.html';
});

// Exit game end popup
document.getElementById('exit-btn').addEventListener('click', () => {
  window.location.href = '/menu/mainmenu/mainmenu.html';
});

// --------------------------------
// UI Helper Functions
// --------------------------------

function updateCopyButtonImage(theme) {
  const copyButtons = document.querySelectorAll('.copy-btn img');
  const icon = theme === 'dark' ? icons.dark : icons.light;

  copyButtons.forEach(button => {
    button.src = icon;
  });
}

function updateActiveThemeButton(activeId) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.remove('active');
  });
  document.getElementById(activeId).classList.add('active');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      updateActiveThemeButton('darkTheme');
  }
}

// --------------------------------
// Popup and Modal Functions
// --------------------------------

function openGameEndPopup(result) {
  return new Promise((resolve, reject) => {
    const popup = document.getElementById("game-end-popup");
    const popupContent = document.getElementById("popup-content");
    const resultText = document.getElementById("game-result-text");

    // Set the result message
    resultText.textContent = result;

    // Show popup with animation
    popup.classList.add("show");
    isGameEndPopupOpen = true; // Block interactions

    // Disable interactions with the background
    document.body.style.pointerEvents = "none"; // Blocks clicking outside
    document.body.style.overflow = "hidden"; // Prevent scrolling

    // Enable interactions inside the popup
    popupContent.style.pointerEvents = "auto";

    // Store resolve and reject functions globally
    window.gameEndResolve = resolve;
    window.gameEndReject = reject;

    // Allow closing with Escape key
    document.addEventListener("keydown", handleEscapeKeyForGameEndPopup, { once: true });
  });
}

function handleEscapeKeyForGameEndPopup(event) {
  if (event.key === 'Escape' && isGameEndPopupOpen) {
    closeGameEndPopup();
  }
}

function closeGameEndPopup() {
  const popup = document.getElementById("game-end-popup");
  popup.classList.remove("show");

  isGameEndPopupOpen = false;

  // Restore interactions
  document.body.style.pointerEvents = "auto"; // Re-enable clicks
  document.body.style.overflow = "auto"; // Restore scrolling

  // Resolve the promise
  if (window.gameEndResolve) window.gameEndResolve();
}

function openPromotionModal() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById("promote-modal");
    const overlay = document.getElementById("modal-overlay");
    
    // Show both the overlay and the modal
    overlay.style.display = "block";
    modal.style.display = "flex";  // Use "flex" to match the modal's CSS

    isPromotionModalOpen = true;

    // Store the promise callbacks globally
    window.promotionResolve = resolve;
    window.promotionReject = reject;

    // Listen for Escape key to allow cancelation
    document.addEventListener("keydown", handleEscapeKeyForPromotionModal, { once: true });
  });
}

function handleEscapeKeyForPromotionModal(event) {
  if (event.key === 'Escape' && isPromotionModalOpen) {
    closePromotionModal('cancel');
  }
}

function closePromotionModal(reason) {
  const modal = document.getElementById('promote-modal');
  const overlay = document.getElementById('modal-overlay');
  
  // Hide the modal and overlay
  modal.style.display = 'none';
  overlay.style.display = 'none';
  
  isPromotionModalOpen = false;

  // If the modal was canceled, reject the promise
  if (reason === 'cancel' && typeof window.promotionReject === 'function') {
    window.promotionReject(reason);
    window.promotionReject = null;
  }
  
  // Clean up the Escape key listener
  document.removeEventListener('keydown', handleEscapeKeyForPromotionModal);
}

function selectPromotion(piece) {
  const modal = document.getElementById('promote-modal');
  const overlay = document.getElementById('modal-overlay');
  
  // Hide the modal and overlay
  modal.style.display = 'none';
  overlay.style.display = 'none';
  
  isPromotionModalOpen = false;
  
  // Resolve the promise with the chosen piece
  if (typeof window.promotionResolve === 'function') {
    window.promotionResolve(piece);
    window.promotionResolve = null;
  }
  
  // Clean up the Escape key listener
  document.removeEventListener('keydown', handleEscapeKeyForPromotionModal);
}

function updatePromotionModal(set) {
  const promotionButtons = document.querySelectorAll('.promotion-btn');
  const isWhite = myColor === 'white';

  // Update the image source based on the player's color
  promotionButtons.forEach(button => {
    const pieceType = button.querySelector('img').alt.charAt(0);
    const pieceColor = isWhite ? 'w' : 'b';
    const newImageSrc = `../img/chesspieces/${set}/${pieceColor}${pieceType}.png`;
    button.querySelector('img').src = newImageSrc;
  });
}

// --------------------------------
// Initialize Game
// --------------------------------

// Start the game
updateStatus();

// If AI plays first (player is black), make AI move
if (aiColor === 'white') {
  setTimeout(makeAiMove, 1000);
}
