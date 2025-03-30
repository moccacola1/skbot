const { Events } = require('discord.js');
const { handleMessage, hasStickyEmbed } = require('../../utils/stickyEmbed');

module.exports = {
  name: Events.MessageCreate,
  
  /**
   * Handler untuk event message create
   * @param {Message} message - Message yang dibuat
   * @param {Client} client - Client Discord
   */
  async execute(message, client) {
    try {
      // Handle sticky embeds for all messages in channels with sticky embeds
      // This ensures we process even bot messages in channels that need sticky embeds
      if (hasStickyEmbed(message.channelId)) {
        await handleMessage(message, client);
      } 
      // For other functionality, ignore bot messages
      else if (message.author.bot) {
        return;
      }
      
      // If the message is not from a bot, or if we're continuing after sticky embed handling
      // Process other message functionality here if needed
      
    } catch (error) {
      console.error(`[ERROR] `.red + `Error in message create handler:`.white);
      console.error(error);
    }
  }
}; 