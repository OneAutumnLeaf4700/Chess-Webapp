import { getUserId } from './userIdManager.js';

// Initialize socket lazily only on the game page; here we will navigate only

// ---------------------------------
// User ID Management
// --------------------------------

// Retrieve the user ID
const userId = getUserId();
console.log('User ID:', userId);

// ---------------------------------
// Button and Modal Elements
// --------------------------------
const createGameButton = document.getElementById('create-game-btn');
const joinGameButton = document.getElementById('join-game-btn');
const joinGameModal = document.getElementById('join-game-modal');
const gameIdInput = document.getElementById('game-id-input');
const joinGameConfirmButton = document.getElementById('join-game-confirm-btn');
const cancelButton = document.getElementById('cancel-btn');
const errorMessage = document.getElementById('error-message');

// ---------------------------------
// Event Listeners
// --------------------------------

// Event listener for creating a game
createGameButton.addEventListener('click', () => {
    console.log('Create game');
    window.location.href = '/game';
});

// Open the join game modal with overlay effect
joinGameButton.addEventListener('click', () => {
    joinGameModal.style.display = 'flex'; // Show modal with overlay
    gameIdInput.value = ''; // Clear the input field
    errorMessage.style.display = 'none'; // Hide any previous errors
    gameIdInput.focus(); // Focus the input field
    document.body.style.overflow = 'hidden'; // Disable background scrolling
});

// Handle the "Join" button in the modal
joinGameConfirmButton.addEventListener('click', () => {
    const gameId = gameIdInput.value.trim();

    if (!gameId) {
        errorMessage.textContent = 'Please enter a valid Game ID!';
        errorMessage.style.display = 'block';
        return;
    }

    // Navigate to the game shell; it will handle joining via URL
    window.location.href = `/game/${gameId}`;
});

// Close the modal when "Cancel" is clicked
cancelButton.addEventListener('click', () => {
    joinGameModal.style.display = 'none'; // Hide modal
    document.body.style.overflow = 'auto'; // Re-enable background scrolling
});

// Close modal if user clicks outside of the modal content
window.addEventListener('click', (event) => {
    if (event.target === joinGameModal) {
        joinGameModal.style.display = 'none'; // Hide modal
        document.body.style.overflow = 'auto'; // Re-enable background scrolling
    }
});

// ---------------------------------
// Socket.io events
// --------------------------------

// Socket interactions handled on game page

