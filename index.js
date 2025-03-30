// Mengimpor modul yang diperlukan
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Mengimpor konfigurasi
const config = require('./config/config');

// Mengimpor handlers
const eventHandler = require('./handlers/event-handler');
const databaseHandler = require('./handlers/database-handler');
const { scheduleTranscriptCleanup } = require('./utils/transcript');
const voiceStateUpdate = require('./events/voice/voiceStateUpdate');

// Membuat instance client Discord dengan intents yang diperlukan
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Menambahkan collections untuk menyimpan data sementara
client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.tempVoiceMessages = new Collection();

// Fungsi utama untuk menjalankan bot
async function main() {
  try {
    console.log('[STARTUP] '.blue + 'Starting Cappie Bot...'.white);
    
    // Koneksi ke database MongoDB
    await databaseHandler(config.mongoURI);
    
    // Inisialisasi pembersihan transkrip otomatis setiap 6 bulan
    scheduleTranscriptCleanup();
    
    // Load game roles dari file JSON
    const gameRolesPath = path.join(__dirname, 'json', 'gameRoles.json');
    const gameRoles = JSON.parse(fs.readFileSync(gameRolesPath, 'utf8'));
    
    // Tambahkan game roles ke config
    for (const [gameName, gameData] of Object.entries(gameRoles)) {
      config.roles.games[gameName] = process.env[gameData.roleId];
    }
    
    // Inisialisasi event handler
    eventHandler(client);
    
    // Login ke Discord
    await client.login(config.token);
    
    // Setup periodic checks untuk nama channel voice
    voiceStateUpdate.setupPeriodicChecks(client);
    console.log('[VOICE] '.blue + 'Setup periodic voice channel name checks'.white);
  } catch (error) {
    console.error('[ERROR] '.red + 'Failed to start bot:'.white);
    console.error(error);
    process.exit(1);
  }
}

// Menangani unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('[UNHANDLED REJECTION] '.red + error.message.white);
  console.error(error);
});

// Menangani uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION] '.red + error.message.white);
  console.error(error);
  process.exit(1);
});

// Menjalankan bot
main(); 