// Import required dependencies
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socket = require('socket.io');
const path = require('path');
const routes = require('./routes');
const ioHandler = require('./io');
const config = require('./config');
const lobbyManger = require('./lobbyManager');
const dbHandler = require('./database/db');

// App and Server Setup
const app = express();
const server = http.createServer(app);
const io = socket(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

// Use port from environment variable or default to 3000
const port = process.env.PORT || 3000;

//MongoDB Database Setup
dbHandler();

// Server communication using io.js file
ioHandler(io);


// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

console.log("Main Directory: " + __dirname);

// Import routes
routes(app);

// Set Content Security Policy
app.use((req, res, next) => {
res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline';");
next();
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
server.listen(port, (err) => {
    if (err) {
        console.error(`Error starting server: ${err}`);
    } else {
        console.log(`Server is running on http://localhost:${port}`);
    }
});
