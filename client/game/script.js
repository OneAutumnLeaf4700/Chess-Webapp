// --------------------------------
// Chess Initialization
// --------------------------------

// Connect to the server (Render backend)
const SOCKET_ENDPOINT = (window.SOCKET_ENDPOINT || localStorage.getItem('backendUrl') || 'https://chess-webapp-4cpr.onrender.com');
const socket = SOCKET_ENDPOINT ? io(SOCKET_ENDPOINT) : io();

//Get Game ID
const path = window.location.pathname;
let gameId = path.split('/')[2];

// Fallback: try to get game ID from URL hash or query params
if (!gameId || gameId === '') {
  const hash = window.location.hash.substring(1);
  const urlParams = new URLSearchParams(window.location.search);
  gameId = hash || urlParams.get('gameId') || urlParams.get('id');
}

const gameIdValue = document.getElementById('game-id');

// Debug logging (can be removed in production)
console.log('Current path:', path);
console.log('Current hash:', window.location.hash);
console.log('Current search:', window.location.search);
console.log('Extracted gameId:', gameId);
console.log('gameIdValue element:', gameIdValue);

// Get popup elements
const gameEndPopup = document.getElementById("game-end-popup");
const gameEndResultText = document.getElementById("game-result-text");
const gameEndPopupMessage = document.getElementById("game-end-message");
const gameEndPopupRematchButton = document.getElementById("rematch-btn");
const gameEndPopupExitButton = document.getElementById("exit-btn");


// Get user ID
const userId = localStorage.getItem('userId');
if (!userId) {
  console.error('User ID not found in local storage');
}

// Initialize game ID label
if (gameId && gameId !== '' && gameIdValue) {
  gameIdValue.textContent = gameId;
  console.log('Game ID set to:', gameId);
} else {
  console.warn('Game ID not found in URL - will be set when game is created');
}



// --------------------------------
// Client Side Chess Board
// --------------------------------

// Game state variables
let pieceSet = 'lichess';
let userInteracted = false;
let isPromotionModalOpen = false;
let isGameEndPopupOpen = false;
let myColor = null;
let isTurn = null;
let gameHasStarted = false;
let $status = $('#status')
let $fen = $('#fen')
let $pgn = $('#pgn')
let $gameId = $('#game-id')
let gameOver = false;
let opponentDisconnected = false;
let whiteSquareGrey = '#a9a9a9'
let blackSquareGrey = '#696969'

const icons = {
  light: '../img/copyicon/copy-icon-light.png',
  dark: '../img/copyicon/copy-icon-dark.png'
};


// Board settings
let config = {
  draggable: true,
  position: 'start',
  orientation: 'white',
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
  initialSilence: new Audio('/audio/preload/blank.mp3'), // Absolute path for "preload" sound
  move: new Audio('/audio/lichess/move.mp3'),       // Absolute path for "move" sound
  capture: new Audio('/audio/lichess/capture.mp3'), // Absolute path for "capture" sound
  promotion: new Audio('/audio/chesscom/promote.webm'), // Absolute path for "promotion" sound
  check: new Audio('/audio/chesscom/check.webm'),   // Absolute path for "check" sound
  castle: new Audio('/audio/chesscom/castle.webm'), // Absolute path for "castle" sound
  checkmate: new Audio('/audio/chesscom/check.webm') // Absolute path for "checkmate" sound
};


// Create a chess board with configuration above
let board = Chessboard('myBoard', config);
let game = new Chess();


// --------------------------------
// Game Setup Request
// --------------------------------

// If no gameId in URL, request a new multiplayer game, then redirect
if (!gameId || gameId === '') {
  console.log('No gameId found, creating new multiplayer game...');
  if (!userId) {
    console.error('Missing userId; cannot create game');
  } else {
    console.log('Emitting newMultiplayerGameRequested with userId:', userId);
    socket.emit('newMultiplayerGameRequested', userId);
    socket.on('newMultiplayerGameCreated', (newId) => {
      console.log('Received newMultiplayerGameCreated with gameId:', newId);
      if (newId) {
        // Update the game ID display before redirecting
        if (gameIdValue) {
          gameIdValue.textContent = newId;
          console.log('Game ID displayed:', newId);
        }
        console.log('Redirecting to:', `/game/${newId}`);
        window.location.href = `/game/${newId}`;
      } else {
        console.error('Received null gameId from server');
      }
    });
  }
} else {
  // Notify the server to start tracking board activity for this game
  console.log(userId, gameId);
  socket.emit('userConnected', userId, gameId);
  // Request board sync to load game data
  requestBoardSync(gameId);
  // Ensure game ID is displayed
  if (gameIdValue) {
    gameIdValue.textContent = gameId;
  }
}


// -------------------------------
// Socket Events
// -------------------------------

//Listen for team from the server
socket.on('teamAssignment', (team) => {
  console.log('Team assigning:', team);
  teamAssignment(team);
});

// Listen for the turnAssignment event from the server
socket.on('currentTurn', (currentTurn) => {
  turnAssignment(currentTurn); 
});

// Sync the board with the server's FEN
socket.on('syncBoard', (serverGameState) => {
  syncBoard(serverGameState);
});

// Listen for the updateBoard event from the server
socket.on('updateBoard', (fen) => {
  game.load(fen);
  board.position(fen);
  updateStatus();
});

// Receive turn change
socket.on('notifyTurn', (turn) => {
  notifyTurn(turn);
});

// Receive outcome change
socket.on('outcomeChange', (outcome) => {
  $status.text(outcome);
  if (outcome === 'checkmate' || outcome === 'draw') {
    disableGameActions();
    showNewGameButton();
  }
});

// Listen for the opponent's move
socket.on('opponentMove', (move) => {
  game.move(move); // Make the move
  board.position(game.fen()); //Update the board position
  playSound(move); // Play the corresponding sound
  updateStatus(); //Update the game status
});

// Draw offer events
socket.on('drawOffered', () => {
  const accept = confirm('Opponent offered a draw. Accept?');
  socket.emit('respondDraw', gameId, accept);
});

socket.on('drawDeclined', () => {
  alert('Your draw offer was declined.');
});

socket.on('gameDrawn', () => {
  $status.text('Draw agreed');
  openGameEndPopup('Draw agreed');
  disableGameActions();
  showNewGameButton();
});

// Resign events
socket.on('opponentResigned', () => {
  $status.text('Opponent resigned. You win!');
  openGameEndPopup('Opponent resigned. You win!');
  disableGameActions();
  showNewGameButton();
});

// Listen for the game over disconnect event
socket.on('gameOverDisconnect', () => {
  gameOver = true;
  opponentDisconnected = true;
  updateStatus();
});


// -------------------------------
// Socket Functions
// -------------------------------

//Assign the user a team
function teamAssignment(team) {
  console.log('Team assigned:', team);
  myColor = team;
  config.orientation = team;
  board = Chessboard('myBoard', config);
  
  // Initialize turn indicator
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = `You are playing as ${team}`;
    turnIndicator.className = 'turn-indicator';
  }
}

//Assign the user a turn
function turnAssignment(currentTurn) {
  console.log('turnAssignment called:', { myColor, currentTurn });
  
  if (!myColor) {
    console.log('Color not assigned yet:', myColor);
    console.error('Color not assigned yet');
    return;
  }
  
  isTurn = (myColor === 'white' && currentTurn === 'w') || (myColor === 'black' && currentTurn === 'b');
  console.log('Turn assignment result:', { isTurn, myColor, currentTurn });
  updateTurnIndicator(currentTurn);
}

//Notify change in turn 
function notifyTurn(turn) {
  isTurn = (myColor === 'white' && turn === 'w') || (myColor === 'black' && turn === 'b');
  updateTurnIndicator(turn);
}

// Update the turn indicator display
function updateTurnIndicator(currentTurn) {
  const turnIndicator = document.getElementById('turn-indicator');
  if (!turnIndicator || !myColor) return;
  
  const isMyTurn = (myColor === 'white' && currentTurn === 'w') || (myColor === 'black' && currentTurn === 'b');
  const turnText = currentTurn === 'w' ? 'White' : 'Black';
  
  if (isMyTurn) {
    turnIndicator.textContent = `Your turn (${turnText})`;
    turnIndicator.className = 'turn-indicator your-turn';
  } else {
    turnIndicator.textContent = `Opponent's turn (${turnText})`;
    turnIndicator.className = 'turn-indicator opponent-turn';
  }
}

// Sync the board with the server's 
function syncBoard(serverGameState) {
  const gameState = serverGameState;
  turnAssignment(gameState.turn);
    
  if (!serverGameState || !gameState.fen || !gameState.pgn) {
    return;
  }

  try {
    game.load(gameState.fen);
    board.position(game.fen);
    
    // Dynamically update the content of FEN and Status divs
    document.getElementById('fen').innerText = gameState.fen || ''; // Placeholder text
    document.getElementById('status').innerText = gameState.outcome || 'Game in Progress';  // Placeholder text
    document.getElementById('pgn').innerText = gameState.pgn || ''; // Placeholder text
  }
  catch (error) {
    //Error msgs
    console.error('Error loading position:', error);
    console.log('Attempted to load FEN:', gameState.fen);
    console.log('Attempted to load PGN:', gameState.pgn);

    // Handle errors by updating the status
    document.getElementById('status').innerText = 'Error loading position';
    document.getElementById('fen').innerText = 'Invalid FEN';
    document.getElementById('pgn').innerText = 'Invalid PGN';
  }
}

// Request a board sync from the server 
function requestBoardSync(id) {
  const gid = id || gameId;
  socket.emit('requestBoardSync', gid);
}

// Determine which sound to play
function getSoundForMove(move) {
  if (move == null) {
    return 'error'; // Invalid move
  }
  else if (move.captured) {
      return 'capture'; // Capturing a piece
  } else if (move.promotion) {
      return 'promotion'; // Pawn promotion
  } else if (game.in_checkmate() || game.in_check()) {
      return 'check'; // Checkmate
  } else if (move.from === 'e1' && move.to === 'g1' || move.from === 'e8' && move.to === 'g8' || move.from === 'e1' && move.to === 'c1' || move.from === 'e8' && move.to === 'c8') {
      return 'castle'; // Castling
  }
  return 'move'; // Regular move
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

// Send the move to the server
function sendMoveToServer(gameId, gameState) {
  socket.emit('move', gameId, gameState); // Emit the move to the server
}

// Resign button
document.getElementById('resign-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to resign?')) {
    socket.emit('resign', gameId);
  }
});

// Offer draw button
document.getElementById('offer-draw-btn').addEventListener('click', () => {
  socket.emit('offerDraw', gameId);
});

// Function to change piece theme
function changePieceSet(set) {
  const newPieceTheme = `../img/chesspieces/${set}/{piece}.png`;

  // Update the chessboard
  config.pieceTheme = newPieceTheme;
  board = Chessboard('myBoard', config);
  // Request a board sync from the server
  requestBoardSync(gameId);

  // Update Promotion Modal
  updatePromotionModal(set);
}


  
function checkOutcome(game) {
  let outcome = '';
  // Checkmate?
  if (game.in_checkmate()) {
    outcome = 'checkmate';
  }
  // Draw?
  else if (game.in_draw()) {
    outcome = 'draw';
  }
  else {
    outcome = 'ongoing';
  }
  return outcome;
}

// -------------------------------
// Legal Moves
// -------------------------------

// Function for handling drag events
function onDragStart(source, piece, position, orientation) {
    console.log('onDragStart called:', { source, piece, isTurn, myColor, gameOver: game.game_over() });
    
    // Do not pick up pieces if the game is over
    if (game.game_over() || isPromotionModalOpen) {
      console.log('Drag blocked: game over or promotion modal open');
      return false;
    }
  
    //Do not allow interaction if not the player's turn
    if (!isTurn) {
      console.log('Drag blocked: not player turn');
      return false;
    }
  
    // Prevent picking up opponent's pieces
    if ((myColor === 'black' && piece.search(/^w/) !== -1) || 
        (myColor === 'white' && piece.search(/^b/) !== -1)) {
      console.log('Drag blocked: opponent piece');
      return false;
    }
  
    console.log('Drag allowed');
    return true;
  }
  
// Function for handling drop events
async function onDrop(source, target) {
  
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

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

  // Check outcome of the game
  outcome = checkOutcome(game);
  gameStateObject = {
    turn: game.turn(),
    fen: game.fen(),
    pgn: game.pgn(),
    outcome: outcome,
    move: move
  };
  
  // Otherwise, send the move to the server
  sendMoveToServer(gameId, gameStateObject);
}

// Finalize the move visually
function onSnapEnd() {
  board.position(game.fen());
}

// Function to update the status of the game
function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  if (gameOver && opponentDisconnected) {
    status = 'Opponent disconnected, you win!'
    openGameEndPopup(status);
    disableGameActions();
    showNewGameButton();
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
    openGameEndPopup(status);
    disableGameActions();
    showNewGameButton();
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
    openGameEndPopup(status);
    disableGameActions();
    showNewGameButton();
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status) // Update the status label
  $fen.html(game.fen()) // Update the FEN label
  $pgn.html(game.pgn()) // Update the PGN label
  $gameId.html(gameId) // Update the game ID label
}

function disableGameActions() {
  const resignBtn = document.getElementById('resign-btn');
  const offerDrawBtn = document.getElementById('offer-draw-btn');
  if (resignBtn) resignBtn.disabled = true;
  if (offerDrawBtn) offerDrawBtn.disabled = true;
}

function showNewGameButton() {
  const newGameBtn = document.getElementById('new-game-btn');
  if (newGameBtn) newGameBtn.style.display = 'inline-block';
}

// New Game handler: go back to main menu
document.getElementById('new-game-btn').addEventListener('click', () => {
  window.location.href = '/menu/mainmenu/mainmenu.html';
});

// Home button: resign current game then navigate home
const homeLinkEl = document.querySelector('.home-link');
if (homeLinkEl) {
  homeLinkEl.addEventListener('click', (e) => {
    e.preventDefault();
    try { socket.emit('resign', gameId); } catch (err) {}
    setTimeout(() => {
      window.location.href = '/menu/mainmenu/mainmenu.html';
    }, 100);
  });
}

// -------------------------------
// Highlight Legal Moves
// -------------------------------

// Remove the grey squre highlights
function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

// Highlight the possible moves for the selected piece
function greySquare(square) {
  let $square = $('#myBoard .square-' + square);
  let background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }
  $square.css('background', background);
}

// Highlight the possible moves for the selected piece
function onMouseoverSquare(square, piece) {
  // Only proceed if it's the current player's turn
  if (!isTurn || isPromotionModalOpen) return;

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

// Remove the highlights of possible moves for the selected piece
function onMouseoutSquare (square, piece) {
  removeGreySquares()
}





// -------------------------------
// Webpage Widget Event Listeners
// -------------------------------

// Theme Switching

// Call loadTheme when page loads
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

// Game ID Copy Functionality
document.getElementById('copyGameId').addEventListener('click', () => {
  const gameId = document.getElementById('game-id').innerText;
  navigator.clipboard.writeText(gameId).then(() => {
      const btn = document.getElementById('copyGameId');
      btn.textContent = 'Copied!';
      setTimeout(() => {
          btn.textContent = 'Copy Game ID';
      }, 2000);
  }).catch(err => {
    console.error('Failed to copy Game ID:', err);
  });
});

// Share Game Functionality
document.getElementById('shareGameId').addEventListener('click', () => {
  const gameId = document.getElementById('game-id').innerText;
  const gameUrl = `${window.location.origin}/game/${gameId}`;
  
  if (navigator.share) {
    // Use native share API if available
    navigator.share({
      title: 'Chess Game',
      text: `Join my chess game! Game ID: ${gameId}`,
      url: gameUrl
    }).catch(err => {
      console.log('Error sharing:', err);
      // Fallback to clipboard
      navigator.clipboard.writeText(gameUrl);
      alert('Game URL copied to clipboard!');
    });
  } else {
    // Fallback to clipboard
    navigator.clipboard.writeText(gameUrl).then(() => {
      alert('Game URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy game URL:', err);
      alert('Game ID: ' + gameId);
    });
  }
});

// Change piece set to Lichess
document.getElementById('lichess-btn').addEventListener('click', () => {
  changePieceSet('lichess');
});

// Change piece set to Chess.com
document.getElementById('chesscom-btn').addEventListener('click', () => {
  changePieceSet('chesscom');
});

//Exit Game End Popup
gameEndPopupExitButton.addEventListener("click", () => {
  handleEscapeKeyForGameEndPopup({ key: 'Escape' });
});








// -------------------------------
// Web Widget Event Listener Functions
// -------------------------------

// Update copy button image based on the theme
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

// Load saved theme preference
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      updateActiveThemeButton('darkTheme');
  }
}

// Function to show popup with animation
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

// Function to handle pressing the Escape key
function handleEscapeKeyForGameEndPopup(event) {
  if (event.key === 'Escape' && isGameEndPopupOpen) {
    closeGameEndPopup();
  }
}

// Function to close the game end popup
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


// Function to open the promotion modal and return the selected piece
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

/**
 * Handler for the Escape key that cancels the promotion if the modal is open.
 */
function handleEscapeKeyForPromotionModal(event) {
  if (event.key === 'Escape' && isPromotionModalOpen) {
    closePromotionModal('cancel');
  }
}

/**
 * Closes the promotion modal. If canceled, rejects the promise.
 */
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

/**
 * Handles the user's promotion selection.
 */
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



// Update promotion modal with new piece set
function updatePromotionModal(set) {
  const promotionButtons = document.querySelectorAll('.promotion-btn');
  const isWhite = config.orientation === 'white';

  // Update the image source based on the orientation (white or black)
  promotionButtons.forEach(button => {
    const pieceType = button.querySelector('img').alt.charAt(0);
    const pieceColor = isWhite ? 'w' : 'b';
    const newImageSrc = `../img/chesspieces/${set}/${pieceColor}${pieceType}.png`; // Adjust this to match your image naming convention
    button.querySelector('img').src = newImageSrc;
  });
};