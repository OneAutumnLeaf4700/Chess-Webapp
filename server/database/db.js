const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/chessGames', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection error (continuing without DB):', err.message || err);
        // Do not exit the process so singleplayer and non-DB features keep working
        // Optionally, attempt a lazy reconnect in the background
        setTimeout(() => {
            mongoose.connect('mongodb://127.0.0.1:27017/chessGames', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }).then(() => console.log('MongoDB connected on retry...'))
              .catch(() => {/* suppress repeated logs */});
        }, 5000);
    }
};

module.exports = connectDB;
