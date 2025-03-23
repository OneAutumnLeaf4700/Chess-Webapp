// Initialize the socket connection
const socket = io();

const singlePlayerButton = document.getElementById('singleplayer-btn');
const multiPlayerButton = document.getElementById('multiplayer-btn');


// ---------------------------------
// Helper Functions
// --------------------------------

// Redirect to singleplayer game
function redirectSingleplayer() {
    window.location.href = '/singleplayer';
}

// Redirect to multiplayer game
function redirectMultiplayer() {
    window.location.href = '/multiplayer';
}



//---------------------------------
// Event listeners
//---------------------------------

singlePlayerButton.addEventListener('click', () => {
    console.log('Starting Single Player Game...');
    redirectSingleplayer();
});

multiPlayerButton.addEventListener('click', () => {
    console.log('Starting Multiplayer Game...');
    redirectMultiplayer();
});




//---------------------------------
// Socket event listeners
//---------------------------------
