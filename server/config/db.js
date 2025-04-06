// In config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Hardcoded URI for testing - replace with your actual MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-genie';
    
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;