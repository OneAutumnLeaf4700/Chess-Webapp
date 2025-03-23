module.exports = (app) => {
    const path = require('path');
    
    const clientPath = path.join(__dirname, '../client');

    // Default Route (Main Menu)
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'menu', 'mainmenu', 'mainmenu.html'));
    });
    
};