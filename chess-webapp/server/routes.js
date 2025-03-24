module.exports = (app) => {
    const path = require('path');
    
    const clientPath = path.join(__dirname, '../client');

    // Default Route (Main Menu)
    /*
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'menu', 'mainmenu', 'mainmenu.html'));
    });
    */
    
    // Route for game
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'game', 'index.html')); // Serve the game.html file
    });

    // Route for singleplayer
    app.get('/singleplayer', (req, res) => {
        res.sendFile(path.join(clientPath, 'menu', 'singleplayer', 'singleplayer.html'));
    });

    //Route for multiplayer
    app.get('/multiplayer', (req, res) => {
        res.sendFile(path.join(clientPath, 'menu', 'multiplayer', 'multiplayer.html'));
    });

    // Route for game
    app.get('/game/:gameId', (req, res) => {
        res.sendFile(path.join(clientPath, 'game', 'index.html')); // Serve the game.html file
    });
};