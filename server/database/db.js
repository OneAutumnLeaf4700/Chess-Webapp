const mongoose = require('mongoose');

// Prefer failing fast over buffering operations indefinitely when the DB is down
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

const connectDB = async () => {
    try {
        // Use environment variable for MongoDB URL, fallback to localhost
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chessGames';
        
        await mongoose.connect(mongoUrl, {
            // Modern driver options
            serverSelectionTimeoutMS: 5000, // fail fast if Mongo isn't available
            bufferCommands: false, // Disable mongoose buffering
        });
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection error (continuing without DB):', err.message || err);
        // Do not exit the process so singleplayer and non-DB features keep working
        // Optionally, attempt a lazy reconnect in the background
        setTimeout(() => {
            const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chessGames';
            mongoose.connect(mongoUrl, {
                serverSelectionTimeoutMS: 5000,
                bufferCommands: false,
            }).then(() => console.log('MongoDB connected on retry...'))
              .catch(() => {/* suppress repeated logs */});
        }, 10000);
    }

    mongoose.connection.on('error', (e) => {
        console.error('Mongo connection error:', e.message || e);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
    });
};

module.exports = connectDB;
