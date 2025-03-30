const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const TempVoice = require('../../models/tempVoice');
const config = require('../../config/config');
const { getVoiceChannelPermissions } = require('../../utils/permissions');
const { setupStickyEmbed, removeStickyEmbed, updateStickyEmbedMessageId, sendInitialStickyEmbed } = require('../../utils/stickyEmbed');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.VoiceStateUpdate,
  
  /**
   * Handler untuk event voice state update
   * @param {VoiceState} oldState - Voice state sebelumnya
   * @param {VoiceState} newState - Voice state baru
   * @param {Client} client - Client Discord
   */
  async execute(oldState, newState, client) {
    try {
      // Load template embed
      const embedsPath = path.join(__dirname, '../../json/embeds.json');
      const embedTemplates = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
      
      // Cek jika user join ke channel "join to create"
      if (newState.channelId) {
        // First Voice (Type 1)
        if (newState.channelId === config.voiceChannels.firstVoice) {
          await handleJoinToCreate(newState, 1, client, embedTemplates);
          return;
        }
        
        // Second Voice (Type 2)
        if (newState.channelId === config.voiceChannels.secondVoice) {
          await handleJoinToCreate(newState, 2, client, embedTemplates);
          return;
        }
        
        // If they're joining/moving to any voice channel, immediately check their activity
        // This ensures we catch activity changes even if they were already active before joining
        console.log(`[VOICE] User ${newState.member.displayName} joined or moved to channel ${newState.channel.name}`);
        await handleActivityChange(newState, client);
      }
      
      // Cek jika user meninggalkan channel temporary
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        await handleLeaveTemporaryChannel(oldState, newState, client, embedTemplates);
      }
      
      // Handle activity changes - this covers when users are already in a channel 
      // and start/stop a game
      if (newState.channelId) {
        // For existing voice connections, check for status changes
        if (oldState.channelId === newState.channelId) {
          // This is a state update for someone already in a voice channel (not joining/leaving)
          // Check if it's an activity change
          console.log(`[VOICE] Checking for status change for ${newState.member.displayName}`);
          await handleActivityChange(newState, client);
        }
      }
    } catch (error) {
      console.error(`[ERROR] `.red + `Error in voice state update:`.white);
      console.error(error);
    }
  },
  
  /**
   * Setup periodic checks for voice channel names
   * @param {Client} client - Client Discord
   */
  setupPeriodicChecks(client) {
    // Periksa dan update nama channel setiap 5 menit
    setInterval(async () => {
      try {
        console.log(`[VOICE] Running periodic check for voice channel names...`);
        
        // Dapatkan semua temporary voice channel dari database
        const tempVoices = await TempVoice.find();
        console.log(`[VOICE] Found ${tempVoices.length} temporary voice channels to check`);
        
        for (const tempVoice of tempVoices) {
          try {
            const guild = client.guilds.cache.get(tempVoice.guildId);
            if (!guild) continue;
            
            const channel = guild.channels.cache.get(tempVoice.channelId);
            if (!channel) {
              // Channel tidak ditemukan, hapus dari database
              await TempVoice.findByIdAndDelete(tempVoice._id);
              console.log(`[VOICE] Deleted orphaned temp voice record for channel ${tempVoice.channelId}`);
              continue;
            }
            
            const owner = guild.members.cache.get(tempVoice.ownerId);
            if (!owner) {
              console.log(`[VOICE] Owner ${tempVoice.ownerId} not found for channel ${channel.name}`);
              continue;
            }
            
            // Check if owner is in the voice channel
            const memberInChannel = channel.members.has(owner.id);
            console.log(`[VOICE] Periodic check: Owner ${owner.displayName} is ${memberInChannel ? 'in' : 'not in'} channel ${channel.name}`);
            
            // Cek apakah owner sedang bermain game
            const activity = owner.presence?.activities?.find(a => a.type === 0);
            const currentActivity = activity ? activity.name : null;
            
            console.log(`[VOICE] Periodic check: Owner ${owner.displayName} activity: ${currentActivity || 'None'}, Stored: ${tempVoice.gamePlaying || 'None'}`);
            
            // Jika ada perbedaan antara aktivitas saat ini dan yang tersimpan
            if ((currentActivity === null && tempVoice.gamePlaying !== null) || 
                (currentActivity !== null && tempVoice.gamePlaying !== currentActivity)) {
              
              // Update nama channel
              let newChannelName;
              if (currentActivity) {
                newChannelName = tempVoice.type === 1 ? `┗ ${currentActivity}` : `${currentActivity}`;
                tempVoice.gamePlaying = currentActivity;
              } else {
                newChannelName = tempVoice.type === 1 ? `┗ ${owner.displayName}` : `${owner.displayName} voice`;
                tempVoice.gamePlaying = null;
              }
              
              console.log(`[VOICE] Periodic update: Changing channel name to ${newChannelName}`);
              await channel.setName(newChannelName);
              await tempVoice.save();
              
              console.log(`[VOICE] `.blue + `Periodic update: Changed channel name to ${newChannelName}`.white);
            } else {
              console.log(`[VOICE] Periodic check: No activity change for ${owner.displayName}`);
            }
          } catch (error) {
            console.error(`[ERROR] `.red + `Error in periodic voice check for channel ${tempVoice.channelId}:`.white);
            console.error(error);
          }
        }
        
        console.log(`[VOICE] Periodic check completed`);
      } catch (error) {
        console.error(`[ERROR] `.red + `Error in periodic voice check:`.white);
        console.error(error);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes (reduced from 5)
    
    console.log(`[VOICE] Setup periodic voice channel name checks`);
  }
};

/**
 * Menangani user yang join ke channel "join to create"
 * @param {VoiceState} state - Voice state user
 * @param {number} type - Tipe channel (1: First Voice, 2: Second Voice)
 * @param {Client} client - Client Discord
 * @param {Object} embedTemplates - Template embed
 */
async function handleJoinToCreate(state, type, client, embedTemplates) {
  const { guild, member, channel } = state;
  
  try {
    // Tentukan nama channel berdasarkan tipe
    let channelName;
    if (type === 1) {
      channelName = `┗ ${member.displayName}`;
    } else {
      channelName = `${member.displayName} voice`;
    }
    
    // Cek jika user sedang bermain game
    const activity = member.presence?.activities?.find(a => a.type === 0);
    if (activity) {
      channelName = type === 1 ? `┗ ${activity.name}` : `${activity.name}`;
    }
    
    // Buat channel baru
    const permissionCategory = guild.channels.cache.get(config.voiceChannels.permissionCategory);
    
    try {
      let channelOptions = {
        name: channelName,
        type: ChannelType.GuildVoice,
        bitrate: config.voice.bitrate
      };
      
      // Set parent and permissions based on voice type
      if (type === 1) {
        // First Voice - use parent of the first voice channel and copy permissions from specified category
        const firstVoiceChannel = guild.channels.cache.get(config.voiceChannels.firstVoice);
        const permissionCategory = guild.channels.cache.get("1214954215294771221");
        
        if (firstVoiceChannel && firstVoiceChannel.parentId) {
          channelOptions.parent = firstVoiceChannel.parentId;
        } else {
          channelOptions.parent = channel.parentId;
        }
        
        if (permissionCategory) {
          console.log(`[VOICE] Copying permissions from category ${permissionCategory.name}`);
          channelOptions.permissionOverwrites = permissionCategory.permissionOverwrites.cache.map(overwrite => ({
            id: overwrite.id,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray()
          }));
        } else {
          // Fallback to default permissions
          const permissions = getVoiceChannelPermissions(guild, member, true);
          const validatedPermissions = permissions.map(perm => {
            if (!perm.id) {
              console.warn(`[WARN] Permission missing ID, skipping`);
              return null;
            }
            const allow = Array.isArray(perm.allow) ? perm.allow.filter(p => p !== undefined) : [];
            const deny = Array.isArray(perm.deny) ? perm.deny.filter(p => p !== undefined) : [];
            return {
              id: perm.id,
              allow: allow.length > 0 ? allow : [],
              deny: deny.length > 0 ? deny : []
            };
          }).filter(perm => perm !== null);
          
          channelOptions.permissionOverwrites = validatedPermissions;
        }
      } else {
        // Second Voice - use parent of the current channel and copy permissions from specified channel
        channelOptions.parent = channel.parentId;
        
        const permissionSource = guild.channels.cache.get("1311299928580161566");
        
        if (permissionSource) {
          console.log(`[VOICE] Copying permissions from channel ${permissionSource.name}`);
          channelOptions.permissionOverwrites = permissionSource.permissionOverwrites.cache.map(overwrite => ({
            id: overwrite.id,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray()
          }));
        } else {
          // Fallback to default permissions
          const permissions = getVoiceChannelPermissions(guild, member, true);
          const validatedPermissions = permissions.map(perm => {
            if (!perm.id) {
              console.warn(`[WARN] Permission missing ID, skipping`);
              return null;
            }
            const allow = Array.isArray(perm.allow) ? perm.allow.filter(p => p !== undefined) : [];
            const deny = Array.isArray(perm.deny) ? perm.deny.filter(p => p !== undefined) : [];
            return {
              id: perm.id,
              allow: allow.length > 0 ? allow : [],
              deny: deny.length > 0 ? deny : []
            };
          }).filter(perm => perm !== null);
          
          channelOptions.permissionOverwrites = validatedPermissions;
        }
      }
      
      // Add owner permissions to the channel
      if (channelOptions.permissionOverwrites && Array.isArray(channelOptions.permissionOverwrites)) {
        // Remove any existing permission for the member if it exists
        channelOptions.permissionOverwrites = channelOptions.permissionOverwrites.filter(p => p.id !== member.id);
        
        // Add owner permissions
        channelOptions.permissionOverwrites.push({
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.UseEmbeddedActivities,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.PrioritySpeaker
          ]
        });
      }
      
      const newChannel = await guild.channels.create(channelOptions);
      
      // Set the channel position based on the type
      try {
        if (type === 1) {
          // Get the first voice channel to position after it
          const firstVoiceChannel = guild.channels.cache.get(config.voiceChannels.firstVoice);
          if (firstVoiceChannel) {
            const position = firstVoiceChannel.position + 1;
            await newChannel.setPosition(position);
          }
        }
      } catch (error) {
        console.warn(`[WARN] `.yellow + `Failed to set channel position: ${error.message}`.white);
      }
      
      // Move user to the new channel
      await member.voice.setChannel(newChannel).catch(error => {
        console.error(`[ERROR] `.red + `Failed to move user to new channel: ${error.message}`.white);
      });
      
      // Create record in the database
      let gamePlaying = null;
      if (activity) {
        gamePlaying = activity.name;
      }
      
      const tempVoice = new TempVoice({
        channelId: newChannel.id,
        guildId: guild.id,
        ownerId: member.id,
        type,
        gamePlaying
      });
      
      await tempVoice.save();
      
      // Setup the sticky embed for music bot (only for type 1)
      if (type === 1) {
        // First set up the sticky embed (this will create a tracking entry but not send a message yet)
        setupStickyEmbed(newChannel.id, embedTemplates.music_bot_invite, client);
        
        // Send the initial sticky embed using our specialized function
        // This will handle tracking the message ID properly inside the sticky embed system
        const success = await sendInitialStickyEmbed(newChannel.id, client);
        
        if (!success) {
          console.error(`[ERROR] `.red + `Failed to send initial sticky embed for channel ${newChannel.id}`.white);
        }
      }
      
      console.log(`[VOICE] `.blue + `Created temporary voice channel ${newChannel.name} for ${member.displayName}`.white);
    } catch (error) {
      console.error(`[ERROR] `.red + `Failed to create temporary voice channel:`.white);
      console.error(error);
    }
  } catch (error) {
    console.error(`[ERROR] `.red + `Error in handleJoinToCreate:`.white);
    console.error(error);
  }
}

/**
 * Menangani user yang meninggalkan temporary voice channel
 * @param {VoiceState} oldState - Voice state lama
 * @param {VoiceState} newState - Voice state baru
 * @param {Client} client - Client Discord
 * @param {Object} embedTemplates - Template embed
 */
async function handleLeaveTemporaryChannel(oldState, newState, client, embedTemplates) {
  try {
    const oldChannel = oldState.channel;
    if (!oldChannel) return;
    
    // Cek apakah channel adalah temporary voice channel
    const tempVoice = await TempVoice.findOne({ channelId: oldChannel.id });
    if (!tempVoice) return;
    
    // Hitung jumlah member di channel
    const memberCount = oldChannel.members.size;
    
    // Jika tidak ada member, hapus channel
    if (memberCount === 0) {
      // Remove sticky embed tracking first
      console.log(`[VOICE] Removing sticky embed tracking for empty channel ${oldChannel.id}`);
      removeStickyEmbed(oldChannel.id);
      
      // Delete any voice message (this is a fallback, as removeStickyEmbed should handle cleanup)
      const messageId = client.tempVoiceMessages.get(oldChannel.id);
      if (messageId) {
        try {
          const message = await oldChannel.messages.fetch(messageId).catch(() => null);
          if (message) await message.delete().catch(() => {});
          client.tempVoiceMessages.delete(oldChannel.id);
        } catch (error) {
          console.error(`[ERROR] `.red + `Failed to delete voice message: ${error.message}`.white);
        }
      }
      
      // Delete channel
      await oldChannel.delete();
      
      // Delete from database
      await TempVoice.findByIdAndDelete(tempVoice._id);
      
      console.log(`[VOICE] `.blue + `Deleted empty temporary voice channel ${oldChannel.name}`.white);
    }
    // Jika owner leave, update ownerLeftAt
    else if (oldState.member.id === tempVoice.ownerId) {
      // Update the ownerLeftAt timestamp in the database
      tempVoice.ownerLeftAt = new Date();
      await tempVoice.save();
      
      console.log(`[VOICE] `.blue + `Owner ${oldState.member.displayName} left channel ${oldChannel.name}, updated ownerLeftAt timestamp`.white);
    }
  } catch (error) {
    console.error(`[ERROR] `.red + `Error in handleLeaveTemporaryChannel:`.white);
    console.error(error);
  }
}

/**
 * Menangani perubahan aktivitas user
 * @param {VoiceState} state - Voice state user
 * @param {Client} client - Client Discord
 */
async function handleActivityChange(state, client) {
  try {
    const member = state.member;
    const channel = state.channel;
    
    if (!member || !channel) {
      console.log(`[VOICE] Activity check skipped - missing member or channel`);
      return;
    }
    
    console.log(`[VOICE] Checking activities for member ${member.displayName} (${member.id}) in channel ${channel.name} (${channel.id})`);
    
    // Log all of the user's activities for debugging
    if (member.presence) {
      const activities = member.presence.activities || [];
      console.log(`[VOICE] User has ${activities.length} activities`);
      
      activities.forEach((activity, index) => {
        console.log(`[VOICE] Activity ${index}: Name=${activity.name}, Type=${activity.type}, Details=${activity.details}`);
      });
    } else {
      console.log(`[VOICE] No presence data available for user`);
    }
    
    // Cek apakah channel adalah temporary voice channel dan user adalah owner
    const tempVoice = await TempVoice.findOne({ 
      channelId: channel.id,
      ownerId: member.id
    });
    
    if (!tempVoice) {
      console.log(`[VOICE] User is not the owner of this voice channel, skipping update`);
      return;
    }
    
    console.log(`[VOICE] Found temp voice record: Type=${tempVoice.type}, Current game=${tempVoice.gamePlaying || 'None'}`);
    
    // Cek aktivitas user - broaden search to include more activity types
    let currentActivity = null;
    
    // First try to find a PLAYING (type 0) activity
    let activity = member.presence?.activities?.find(a => a.type === 0);
    if (activity) {
      currentActivity = activity.name;
      console.log(`[VOICE] Found PLAYING activity: ${currentActivity}`);
    } 
    // If no PLAYING activity, try STREAMING (type 1)
    else {
      activity = member.presence?.activities?.find(a => a.type === 1);
      if (activity) {
        currentActivity = `Streaming ${activity.name}`;
        console.log(`[VOICE] Found STREAMING activity: ${currentActivity}`);
      }
    }
    
    // Log for debugging
    console.log(`[VOICE] Current activity: ${currentActivity || 'None'}, Stored activity: ${tempVoice.gamePlaying || 'None'}`);
    
    // Jika tidak ada perubahan, return
    if ((currentActivity === null && tempVoice.gamePlaying === null) || 
        (currentActivity !== null && tempVoice.gamePlaying === currentActivity)) {
      console.log(`[VOICE] No activity change detected, skipping update`);
      return;
    }
    
    // Update nama channel
    let newChannelName;
    if (currentActivity) {
      newChannelName = tempVoice.type === 1 ? `┗ ${currentActivity}` : `${currentActivity}`;
      tempVoice.gamePlaying = currentActivity;
    } else {
      newChannelName = tempVoice.type === 1 ? `┗ ${member.displayName}` : `${member.displayName} voice`;
      tempVoice.gamePlaying = null;
    }
    
    console.log(`[VOICE] Updating channel name to: ${newChannelName}`);
    
    try {
      await channel.setName(newChannelName);
      console.log(`[VOICE] Successfully updated channel name to: ${newChannelName}`);
    } catch (error) {
      console.error(`[ERROR] Failed to update channel name: ${error.message}`);
    }
    
    // Save the updated record
    await tempVoice.save();
    console.log(`[VOICE] Saved updated temp voice record with new game: ${tempVoice.gamePlaying || 'None'}`);
    
    console.log(`[VOICE] `.blue + `Changed channel name to ${newChannelName} due to activity change`.white);
  } catch (error) {
    console.error(`[ERROR] `.red + `Error in handleActivityChange:`.white);
    console.error(error);
  }
}
