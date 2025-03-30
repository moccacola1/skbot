const mongoose = require('mongoose');

// Schema untuk menyimpan data tiket
const ticketSchema = new mongoose.Schema({
  // ID channel tiket
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  
  // ID guild dimana tiket dibuat
  guildId: {
    type: String,
    required: true
  },
  
  // ID user yang membuat tiket
  ownerId: {
    type: String,
    required: true
  },
  
  // Nomor urut tiket
  ticketNumber: {
    type: Number,
    required: true
  },
  
  // Legacy field - leaving this for compatibility with existing database
  number: {
    type: Number,
    default: null
  },
  
  // Nama channel dari tiket
  channelName: {
    type: String,
    default: ''
  },
  
  // Status tiket (open, closed, archived)
  status: {
    type: String,
    enum: ['open', 'closed', 'archived'],
    default: 'open'
  },
  
  // ID pesan welcome di channel tiket
  welcomeMessageId: {
    type: String,
    default: null
  },
  
  // ID pesan status (close/open) di channel tiket
  statusMessageId: {
    type: String,
    default: null
  },
  
  // Array user yang berpartisipasi dalam tiket
  participants: [{
    userId: String,
    username: String
  }],
  
  // Waktu tiket dibuat
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Waktu tiket ditutup
  closedAt: {
    type: Date,
    default: null
  },
  
  // ID user yang menutup tiket
  closedBy: {
    type: String,
    default: null
  },
  
  // Path ke file transkrip HTML
  transcriptUrl: {
    type: String,
    default: null
  }
});

// Membuat index untuk optimasi query
ticketSchema.index({ guildId: 1 });
ticketSchema.index({ ownerId: 1 });
ticketSchema.index({ status: 1 });
// Add a compound index for guild and ticket number to ensure uniqueness within a guild
ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });

// Directly drop the problematic index when the model is defined
// This is more reliable than waiting for the connection event
(async () => {
  try {
    // Only execute this code if mongoose is connected
    if (mongoose.connection.readyState === 1) {
      console.log('[INFO] MongoDB is connected, checking for problematic index...');
      
      try {
        const db = mongoose.connection.db;
        await db.collection('tickets').dropIndex('number_1');
        console.log('[INFO] Successfully dropped problematic number_1 index from tickets collection');
      } catch (dropError) {
        // Index might not exist, which is fine
        if (!dropError.message.includes('index not found')) {
          console.warn('[WARN] Could not drop index:', dropError.message);
        }
      }
    } else {
      console.log('[INFO] MongoDB not connected yet, index drop will be attempted at connection time');
    }
  } catch (error) {
    console.error('[ERROR] Error during index check:', error.message);
  }
})();

// Also handle index dropping when connection is established
mongoose.connection.on('connected', async () => {
  console.log('[INFO] MongoDB connected, attempting to drop problematic index');
  try {
    await mongoose.connection.db.collection('tickets').dropIndex('number_1');
    console.log('[INFO] Successfully dropped problematic number_1 index (during connect)');
  } catch (dropError) {
    // Index might not exist, which is fine
    if (!dropError.message.includes('index not found')) {
      console.warn('[WARN] Could not drop index during connect:', dropError.message);
    }
  }
});

// Add a pre-save hook to ensure the legacy field is set
ticketSchema.pre('save', function(next) {
  // If ticketNumber is set but number is not, copy the value
  if (this.ticketNumber && (this.number === null || this.number === undefined)) {
    this.number = this.ticketNumber;
  }
  // If number is set but ticketNumber is not, copy the value
  else if (this.number && (this.ticketNumber === null || this.ticketNumber === undefined)) {
    this.ticketNumber = this.number;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema); 