document.addEventListener('DOMContentLoaded', () => {
  let selectedDifficulty = null;
  let selectedColor = null;

  const difficultyButtons = document.querySelectorAll('.difficulty-btn');
  const colorButtons = document.querySelectorAll('.color-btn');
  const startButton = document.getElementById('start-game-btn');
  const backButton = document.getElementById('back-btn');

  // Event Listeners for difficulty selection
  difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove 'selected' class from all buttons
      difficultyButtons.forEach(btn => btn.classList.remove('selected'));

      // Add 'selected' class to clicked button
      button.classList.add('selected');

      // Set selected difficulty
      selectedDifficulty = button.getAttribute('data-difficulty');

      // Enable start button if color is already selected
      if (selectedColor) {
        startButton.removeAttribute('disabled');
      }
    });
  });

  // Event Listeners for color selection
  colorButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove 'selected' class from all buttons
      colorButtons.forEach(btn => btn.classList.remove('selected'));

      // Add 'selected' class to clicked button
      button.classList.add('selected');

      // Set selected color
      selectedColor = button.getAttribute('data-color');

      // Enable start button if difficulty is already selected
      if (selectedDifficulty) {
        startButton.removeAttribute('disabled');
      }
    });
  });

  // Event Listener for start button
  startButton.addEventListener('click', () => {
    // Logic to start the game
    startGame(selectedDifficulty, selectedColor);
  });

  // Event Listener for back button
  backButton.addEventListener('click', () => {
    window.location.href = '/menu/mainmenu/mainmenu.html';
  });
});

function startGame(difficulty, color) {
  // Redirect to the singleplayer game page with selected settings
  const gameUrl = `/game/singleplayer.html?difficulty=${difficulty}&color=${color}`;
  window.location.href = gameUrl;
}
