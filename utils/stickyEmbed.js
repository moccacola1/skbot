/**
 * Utility module for managing sticky embeds
 * Sticky embeds are embeds that reappear at the bottom of a channel after a delay
 * when new messages are sent
 */

const stickyEmbeds = new Map();
const messageTimers = new Map();

/**
 * Set up a sticky embed for a channel
 * @param {string} channelId - The ID of the channel to attach the sticky embed to
 * @param {Object} embedTemplate - The embed template to use
 * @param {Object} client - The Discord client instance
 */
function setupStickyEmbed(channelId, embedTemplate, client) {
  stickyEmbeds.set(channelId, {
    template: embedTemplate,
    messageId: null,
    active: true
  });
  
  console.log(`[STICKY] Set up sticky embed for channel ${channelId}`);
}

/**
 * Send the initial sticky embed for a channel
 * This should be used instead of sending a message directly and then updating the tracker
 * @param {string} channelId - The ID of the channel
 * @param {Object} client - The Discord client instance
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
async function sendInitialStickyEmbed(channelId, client) {
  // Check if this channel has a sticky embed set up
  if (!stickyEmbeds.has(channelId)) {
    console.log(`[STICKY] Cannot send initial sticky embed: no tracking for channel ${channelId}`);
    return false;
  }
  
  const stickyData = stickyEmbeds.get(channelId);
  if (!stickyData.active) {
    console.log(`[STICKY] Cannot send initial sticky embed: inactive tracking for channel ${channelId}`);
    return false;
  }
  
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.log(`[STICKY] Cannot send initial sticky embed: channel ${channelId} not found`);
      return false;
    }
    
    console.log(`[STICKY] Sending initial sticky embed in channel ${channelId}`);
    const message = await channel.send(stickyData.template);
    console.log(`[STICKY] Sent initial sticky embed with ID ${message.id} in channel ${channelId}`);
    
    // Update our tracking
    stickyData.messageId = message.id;
    stickyEmbeds.set(channelId, stickyData);
    
    // Also update the client's tempVoiceMessages collection to keep other code working
    client.tempVoiceMessages.set(channelId, message.id);
    
    return true;
  } catch (error) {
    console.error(`[STICKY] Error sending initial sticky embed: ${error.message}`);
    return false;
  }
}

/**
 * Update the message ID for an existing sticky embed
 * @param {string} channelId - The ID of the channel
 * @param {string} messageId - The ID of the message to track
 */
function updateStickyEmbedMessageId(channelId, messageId) {
  if (!stickyEmbeds.has(channelId)) return false;
  
  const stickyData = stickyEmbeds.get(channelId);
  stickyData.messageId = messageId;
  stickyEmbeds.set(channelId, stickyData);
  
  console.log(`[STICKY] Updated message ID for channel ${channelId}: ${messageId}`);
  return true;
}

/**
 * Remove a sticky embed from a channel
 * @param {string} channelId - The ID of the channel
 */
function removeStickyEmbed(channelId) {
  stickyEmbeds.delete(channelId);
  
  // Clear any pending timers
  if (messageTimers.has(channelId)) {
    clearTimeout(messageTimers.get(channelId));
    messageTimers.delete(channelId);
  }
  
  console.log(`[STICKY] Removed sticky embed for channel ${channelId}`);
}

/**
 * Handle a new message in a channel with a sticky embed
 * @param {Object} message - The message object
 * @param {Object} client - The Discord client instance
 */
async function handleMessage(message, client) {
  const { channelId } = message;
  
  // Check if this channel has a sticky embed
  if (!stickyEmbeds.has(channelId)) {
    // console.log(`[STICKY] Channel ${channelId} has no sticky embed tracking`);
    return;
  }
  
  const stickyData = stickyEmbeds.get(channelId);
  if (!stickyData.active) {
    console.log(`[STICKY] Channel ${channelId} has inactive sticky embed`);
    return;
  }
  
  console.log(`[STICKY] New message in channel ${channelId}, current sticky messageId: ${stickyData.messageId}`);
  
  // Skip processing if this message is from our bot AND it matches our tracked message ID
  // This prevents an infinite loop where our own message triggers the handler
  if (message.author.bot && message.id === stickyData.messageId) {
    console.log(`[STICKY] Ignoring our own sticky message`);
    return;
  }
  
  // Delete the previous sticky embed if it exists
  if (stickyData.messageId) {
    try {
      const channel = client.channels.cache.get(channelId);
      const previousMessage = await channel.messages.fetch(stickyData.messageId).catch((error) => {
        console.log(`[STICKY] Failed to fetch previous sticky embed: ${error.message}`);
        return null;
      });
      
      if (previousMessage) {
        console.log(`[STICKY] Found previous message ${stickyData.messageId}, attempting to delete`);
        await previousMessage.delete().catch((error) => {
          console.log(`[STICKY] Failed to delete previous sticky embed in channel ${channelId}: ${error.message}`);
        });
        console.log(`[STICKY] Successfully deleted previous sticky embed in channel ${channelId}`);
        
        // Clear the message ID so we know it's been deleted
        stickyData.messageId = null;
        stickyEmbeds.set(channelId, stickyData);
      } else {
        console.log(`[STICKY] Previous message ${stickyData.messageId} not found in channel ${channelId}`);
        
        // Reset the message ID since it no longer exists
        stickyData.messageId = null;
        stickyEmbeds.set(channelId, stickyData);
      }
    } catch (error) {
      console.error(`[STICKY] Error deleting previous sticky embed: ${error.message}`);
    }
  } else {
    console.log(`[STICKY] No previous message ID found for channel ${channelId}`);
  }
  
  // Clear any existing timer
  if (messageTimers.has(channelId)) {
    clearTimeout(messageTimers.get(channelId));
    console.log(`[STICKY] Cleared existing timer for channel ${channelId}`);
  }
  
  // Set a timer to post the sticky embed after 7 seconds of inactivity
  const timer = setTimeout(async () => {
    try {
      // Double-check the channel still exists and we don't already have an active message
      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        console.log(`[STICKY] Channel ${channelId} no longer exists, skipping repost`);
        return;
      }
      
      // Check again if we have a valid sticky embed config
      if (!stickyEmbeds.has(channelId)) {
        console.log(`[STICKY] No sticky embed tracking for channel ${channelId}, skipping repost`);
        return;
      }
      
      // Get the latest data in case it changed
      const currentData = stickyEmbeds.get(channelId);
      
      // Only send a new message if we're active and don't already have one
      if (!currentData.active) {
        console.log(`[STICKY] Sticky embed for channel ${channelId} is inactive, skipping repost`);
        return;
      }
      
      if (currentData.messageId) {
        console.log(`[STICKY] Already have message ID ${currentData.messageId} for channel ${channelId}, skipping repost`);
        return;
      }
      
      console.log(`[STICKY] Timer fired, posting new sticky embed in channel ${channelId}`);
      const newMessage = await channel.send(currentData.template);
      console.log(`[STICKY] Posted new sticky embed with ID ${newMessage.id} in channel ${channelId}`);
      
      currentData.messageId = newMessage.id;
      stickyEmbeds.set(channelId, currentData);
      
      // Also update the client's tempVoiceMessages collection to keep other code working
      client.tempVoiceMessages.set(channelId, newMessage.id);
      
      messageTimers.delete(channelId);
    } catch (error) {
      console.error(`[STICKY] Error posting sticky embed: ${error.message}`);
    }
  }, 7000); // 7 seconds
  
  console.log(`[STICKY] Set new timer for channel ${channelId} to repost in 7 seconds`);
  messageTimers.set(channelId, timer);
}

/**
 * Check if a channel has an active sticky embed
 * @param {string} channelId - The ID of the channel to check
 * @returns {boolean} - Whether the channel has an active sticky embed
 */
function hasStickyEmbed(channelId) {
  return stickyEmbeds.has(channelId) && stickyEmbeds.get(channelId).active;
}

module.exports = {
  setupStickyEmbed,
  removeStickyEmbed,
  handleMessage,
  hasStickyEmbed,
  updateStickyEmbedMessageId,
  sendInitialStickyEmbed
}; 