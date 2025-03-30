const mongoose = require('mongoose');
const colors = require('colors');

/**
 * Handler untuk koneksi database MongoDB
 * @param {string} mongoURI - URI koneksi MongoDB
 * @returns {Promise<mongoose.Connection>} - Promise dengan koneksi MongoDB
 */
module.exports = async (mongoURI) => {
  // Cek apakah URI tersedia
  if (!mongoURI) {
    console.error('[ERROR] '.red + 'MongoDB URI not provided in environment variables');
    process.exit(1);
  }
  
  try {
    // Mencoba koneksi ke MongoDB
    console.log('[INFO] '.yellow + 'Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI, {
      //useNewUrlParser: true,
      //useUnifiedTopology: true
    });
    
    console.log('[SUCCESS] '.green + 'Connected to MongoDB!');
    return mongoose.connection;
  } catch (error) {
    // Error handling
    console.error('[ERROR] '.red + 'Failed to connect to MongoDB:');
    console.error(error);
    process.exit(1);
  }
}; 