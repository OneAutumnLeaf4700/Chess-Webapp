// Socket is not needed on the main menu; avoid errors on static hosting
// (Vercel won't serve /socket.io here)

const singlePlayerButton = document.getElementById('singleplayer-btn');
const multiPlayerButton = document.getElementById('multiplayer-btn');


// ---------------------------------
// Helper Functions
// --------------------------------

// Redirect to singleplayer game
function redirectSingleplayer() {
    window.location.href = '/menu/singleplayer/singleplayer.html';
}

// Redirect to multiplayer game
function redirectMultiplayer() {
    window.location.href = '/menu/multiplayer/multiplayer.html';
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
