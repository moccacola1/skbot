/**
 * Konfigurasi bot
 * Memuat konfigurasi dari file JSON dan environment variables
 */

// Mengimpor loader utility untuk memuat konfigurasi
const { getConfig, loadJsonFile } = require('../utils/loader');

// Memuat game roles dari file gameRoles.json
const gameRoles = loadJsonFile('gameRoles');

// Konfigurasi bot
module.exports = {
  // Token bot Discord
  token: getConfig('bot.token'),
  
  // URI MongoDB untuk koneksi database
  mongoURI: getConfig('database.mongoURI'),
  
  // ID Channel Voice untuk sistem "Join to Create"
  voiceChannels: {
    firstVoice: getConfig('voiceChannels.firstVoice'),
    secondVoice: getConfig('voiceChannels.secondVoice'),
    permissionCategory: getConfig('voiceChannels.permissionCategory')
  },
  
  // ID Role yang digunakan oleh bot
  roles: {
    mediaBot: getConfig('roles.mediaBot'),
    verify: getConfig('roles.verify'),
    admin: getConfig('roles.admin'),
    
    // Role untuk warna nama
    colors: {
      blue: getConfig('roles.colors.blue'),
      green: getConfig('roles.colors.green'),
      orange: getConfig('roles.colors.orange'),
      yellow: getConfig('roles.colors.yellow'),
      purple: getConfig('roles.colors.purple')
    },
    
    // Role untuk subscribe channel
    subscribe: {
      fins: getConfig('roles.subscribe.fins'),
      lawe: getConfig('roles.subscribe.lawe'),
      liz: getConfig('roles.subscribe.liz'),
      navv: getConfig('roles.subscribe.navv'),
      yhsych: getConfig('roles.subscribe.yhsych')
    },
    
    // Role untuk game dari gameRoles.json
    games: getConfig('roles.games', {})
  },
  
  // ID Channel untuk embed
  channels: {
    welcome: getConfig('channels.welcome'),
    serverLink: getConfig('channels.serverLink'),
    subscribe: getConfig('channels.subscribe'),
    customRole: getConfig('channels.customRole'),
    gamesRole: getConfig('channels.gamesRole'),
    ticket: getConfig('channels.ticket'),
    archive: getConfig('channels.archive'),
    ticketCategory: getConfig('channels.ticketCategory')
  },
  
  // Pengaturan untuk bot presence
  presence: {
    status: getConfig('presence.status', 'dnd'),
    activities: getConfig('presence.activities', [
      {
        type: 'CUSTOM',
        name: 'Made by Lawe Rejas'
      }
    ]),
    interval: getConfig('presence.interval', 7000)
  },
  
  // Pengaturan untuk voice channel
  voice: {
    bitrate: getConfig('voice.bitrate', 384000),
    ownerTimeout: getConfig('voice.ownerTimeout', 60000)
  },
  
  // Pengaturan untuk sistem tiket
  ticketSettings: {
    archiveTimeout: getConfig('ticketSettings.archiveTimeout', 300000),
    categoryId: getConfig('ticketSettings.categoryId')
  }
}; 