const mongoose = require('mongoose');

// Schema untuk menyimpan pengaturan guild
const guildSchema = new mongoose.Schema({
  // ID guild
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Pengaturan untuk embeds yang tersimpan
  embeds: {
    // ID pesan welcome
    welcomeMessageId: {
      type: String,
      default: null
    },
    
    // ID pesan server link
    serverLinkMessageId: {
      type: String,
      default: null
    },
    
    // ID pesan subscribe
    subscribeMessageId: {
      type: String,
      default: null
    },
    
    // ID pesan custom role
    customRoleMessageId: {
      type: String,
      default: null
    },
    
    // ID pesan games
    gamesMessageId: {
      type: String,
      default: null
    },
    
    // ID pesan tiket
    ticketMessageId: {
      type: String,
      default: null
    }
  },
  
  // Counter untuk tiket
  ticketCounter: {
    type: Number,
    default: 0
  },
  
  // Array channel voice sementara yang aktif
  activeVoiceChannels: [{
    type: String
  }],
  
  // Array channel tiket yang aktif
  activeTickets: [{
    type: String
  }]
});

module.exports = mongoose.model('Guild', guildSchema); 