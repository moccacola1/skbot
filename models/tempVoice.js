const mongoose = require('mongoose');

// Schema untuk menyimpan data voice channel sementara
const tempVoiceSchema = new mongoose.Schema({
  // ID channel voice
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  
  // ID guild dimana channel ini dibuat
  guildId: {
    type: String,
    required: true
  },
  
  // ID user yang membuat/memiliki channel
  ownerId: {
    type: String,
    required: true
  },
  
  // Tipe channel (1: First Voice, 2: Second Voice)
  type: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  
  // Waktu kapan channel dibuat
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Waktu terakhir owner meninggalkan channel
  ownerLeftAt: {
    type: Date,
    default: null
  },
  
  // Flag untuk menandakan apakah bot musik sudah ditambahkan
  musicBotAdded: {
    type: Boolean,
    default: false
  },
  
  // Nama game yang sedang dimainkan owner (untuk pengaturan nama channel)
  gamePlaying: {
    type: String,
    default: null
  }
});

// Membuat index untuk optimasi query
tempVoiceSchema.index({ guildId: 1 });
tempVoiceSchema.index({ ownerId: 1 });

module.exports = mongoose.model('TempVoice', tempVoiceSchema); 