const mongoose = require('mongoose');

// Prefer failing fast over buffering operations indefinitely when the DB is down
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/chessGames', {
            // Modern driver options
            serverSelectionTimeoutMS: 2000, // fail fast if Mongo isn't available
            directConnection: true,
        });
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection error (continuing without DB):', err.message || err);
        // Do not exit the process so singleplayer and non-DB features keep working
        // Optionally, attempt a lazy reconnect in the background
        setTimeout(() => {
            mongoose.connect('mongodb://127.0.0.1:27017/chessGames', {
                serverSelectionTimeoutMS: 2000,
                directConnection: true,
            }).then(() => console.log('MongoDB connected on retry...'))
              .catch(() => {/* suppress repeated logs */});
        }, 5000);
    }

    mongoose.connection.on('error', (e) => {
        console.error('Mongo connection error:', e.message || e);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
    });
};

module.exports = connectDB;
