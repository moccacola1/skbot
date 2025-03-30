const { Events, Client } = require('discord.js');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const Guild = require('../../models/guild');
const TempVoice = require('../../models/tempVoice');
const Ticket = require('../../models/ticket');
const presenceHandler = require('../../handlers/presence-handler');
const config = require('../../config/config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  
  /**
   * Handler untuk event ready bot
   * @param {Client} client - Client Discord
   */
  async execute(client) {
    // Log info startup
    console.log(`[READY] `.green + `Logged in as ${client.user.tag}`.white);
    console.log(`[INFO] `.blue + `Bot is in ${client.guilds.cache.size} servers`.white);
    
    // Setup presence
    presenceHandler(client, config.presence);
    
    try {
      // Cleanup orphaned voice channels dan tiket jika ada
      await cleanupOrphanedResources(client);
      
      // Setup semua embed yang diperlukan
      await setupAllEmbeds(client);
      
      console.log(`[SUCCESS] `.green + `Bot is ready!`.white);
    } catch (error) {
      console.error(`[ERROR] `.red + `Error in ready event:`.white);
      console.error(error);
    }
  }
};

/**
 * Membersihkan resource (voice channel, tiket) yang orphaned
 * @param {Client} client - Client Discord
 */
async function cleanupOrphanedResources(client) {
  console.log(`[INFO] `.blue + `Cleaning up orphaned resources...`.white);
  
  try {
    // Cleanup voice channel
    const tempVoices = await TempVoice.find({});
    
    for (const voiceData of tempVoices) {
      const guild = client.guilds.cache.get(voiceData.guildId);
      if (!guild) continue;
      
      const channel = guild.channels.cache.get(voiceData.channelId);
      if (!channel) {
        // Hapus dari database jika channel sudah tidak ada
        await TempVoice.findByIdAndDelete(voiceData._id);
        console.log(`[CLEANUP] `.yellow + `Removed orphaned voice channel data for ${voiceData.channelId}`.white);
      } else {
        // Cek apakah masih ada member di channel
        if (channel.members.size === 0) {
          // Hapus channel jika kosong
          await channel.delete().catch(console.error);
          await TempVoice.findByIdAndDelete(voiceData._id);
          console.log(`[CLEANUP] `.yellow + `Deleted empty voice channel ${channel.name}`.white);
        }
      }
    }
    
    // Cleanup tiket
    const tickets = await Ticket.find({ status: { $ne: 'archived' } });
    
    for (const ticketData of tickets) {
      const guild = client.guilds.cache.get(ticketData.guildId);
      if (!guild) continue;
      
      const channel = guild.channels.cache.get(ticketData.channelId);
      if (!channel) {
        // Update status jika channel tidak ditemukan
        await Ticket.findByIdAndUpdate(ticketData._id, { status: 'archived' });
        console.log(`[CLEANUP] `.yellow + `Marked orphaned ticket #${ticketData.ticketNumber} as archived`.white);
      }
    }
    
    console.log(`[SUCCESS] `.green + `Cleanup completed`.white);
  } catch (error) {
    console.error(`[ERROR] `.red + `Error in cleanup:`.white);
    console.error(error);
  }
}

/**
 * Setup semua embed yang diperlukan
 * @param {Client} client - Client Discord
 */
async function setupAllEmbeds(client) {
  console.log(`[INFO] `.blue + `Setting up embeds...`.white);
  
  // Load embed templates
  const embedsPath = path.join(__dirname, '../../json/embeds.json');
  const embedTemplates = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
  
  try {
    // Loop melalui semua guild
    for (const guild of client.guilds.cache.values()) {
      console.log(`[INFO] `.blue + `Setting up embeds for ${guild.name}`.white);
      
      // Dapatkan atau buat data guild
      let guildData = await Guild.findOne({ guildId: guild.id });
      if (!guildData) {
        guildData = new Guild({ guildId: guild.id });
        await guildData.save();
      }
      
      // Setup masing-masing embed
      await setupEmbed(guild, guildData, 'welcome', embedTemplates.welcome, config.channels.welcome);
      await setupEmbed(guild, guildData, 'serverLink', embedTemplates.server_link, config.channels.serverLink);
      await setupEmbed(guild, guildData, 'subscribe', embedTemplates.subscribe, config.channels.subscribe);
      await setupEmbed(guild, guildData, 'customRole', embedTemplates.custom_role, config.channels.customRole);
      await setupEmbed(guild, guildData, 'games', embedTemplates.games_role, config.channels.gamesRole);
      await setupEmbed(guild, guildData, 'ticket', embedTemplates.ticket, config.channels.ticket);
      
      // Simpan perubahan
      await guildData.save();
    }
    
    console.log(`[SUCCESS] `.green + `All embeds are set up`.white);
  } catch (error) {
    console.error(`[ERROR] `.red + `Error in embed setup:`.white);
    console.error(error);
  }
}

/**
 * Setup satu embed
 * @param {Guild} guild - Guild Discord
 * @param {Object} guildData - Data guild dari MongoDB
 * @param {string} embedType - Jenis embed
 * @param {Object} template - Template embed
 * @param {string} channelId - ID channel tujuan
 */
async function setupEmbed(guild, guildData, embedType, template, channelId) {
  // Skip jika channel ID tidak ada
  if (!channelId) return;
  
  try {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[WARNING] `.yellow + `Channel ${channelId} not found for ${embedType} embed`.white);
      return;
    }
    
    const messageId = guildData.embeds[`${embedType}MessageId`];
    
    if (messageId) {
      // Coba edit pesan yang sudah ada
      try {
        const message = await channel.messages.fetch(messageId);
        await message.edit(template);
        console.log(`[INFO] `.blue + `Updated existing ${embedType} embed`.white);
      } catch (error) {
        // Pesan tidak ditemukan, kirim baru
        const message = await channel.send(template);
        guildData.embeds[`${embedType}MessageId`] = message.id;
        console.log(`[INFO] `.blue + `Created new ${embedType} embed`.white);
      }
    } else {
      // Kirim embed baru
      const message = await channel.send(template);
      guildData.embeds[`${embedType}MessageId`] = message.id;
      console.log(`[INFO] `.blue + `Created new ${embedType} embed`.white);
    }
  } catch (error) {
    console.error(`[ERROR] `.red + `Error setting up ${embedType} embed:`.white);
    console.error(error);
  }
} 