const mongoose = require('mongoose');

/**
 * connectDB
 * Establishes a single persistent connection to MongoDB at app startup.
 * Logs the connected host on success for easy verification in the terminal.
 *
 * process.exit(1) on failure: the application cannot serve any request
 * without a database connection, so there is no point continuing to run.
 * Exiting immediately surfaces the error clearly instead of silently failing
 * on the first DB operation.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure code — no DB means no app
    process.exit(1);
  }
};

module.exports = connectDB;
