const { Events, InteractionType, ChannelType } = require('discord.js');
const TempVoice = require('../../models/tempVoice');
const Ticket = require('../../models/ticket');
const Guild = require('../../models/guild');
const config = require('../../config/config');
const { getMessage } = require('../../utils/loader');
const { getTicketChannelPermissions } = require('../../utils/permissions');
const { createTranscript } = require('../../utils/transcript');
const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');

/**
 * Filters out empty component rows from embeds
 * @param {Array} components - Component array from embed templates
 * @returns {Array} - Filtered component array
 */
function filterEmptyComponentRows(components) {
  if (!components || !Array.isArray(components)) return [];
  
  return components.filter(row => {
    return row && row.components && Array.isArray(row.components) && row.components.length > 0;
  });
}

module.exports = {
  name: Events.InteractionCreate,
  
  /**
   * Handler untuk event interaction create
   * @param {Interaction} interaction - Interaksi yang terjadi
   * @param {Client} client - Client Discord
   */
  async execute(interaction, client) {
    try {
      // Load template embed
      const embedsPath = path.join(__dirname, '../../json/embeds.json');
      const embedTemplates = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
      
      // Load template messages
      const messagesPath = path.join(__dirname, '../../json/messages.json');
      const messageTemplates = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
      
      // Handle berbagai jenis interaksi
      if (interaction.isButton()) {
        await handleButtonInteraction(interaction, client, embedTemplates, messageTemplates);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction, client, embedTemplates);
      }
    } catch (error) {
      console.error(`[ERROR] `.red + `Error in interaction create:`.white);
      console.error(error);
      
      // Beri tahu user jika terjadi error
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: getMessage('general', 'error'),
          ephemeral: true
        }).catch(console.error);
      } else {
        await interaction.reply({
          content: getMessage('general', 'error'),
          ephemeral: true
        }).catch(console.error);
      }
    }
  }
};

/**
 * Menangani interaksi button
 * @param {ButtonInteraction} interaction - Interaksi button
 * @param {Client} client - Client Discord
 * @param {Object} embedTemplates - Template embed
 * @param {Object} messageTemplates - Template messages
 */
async function handleButtonInteraction(interaction, client, embedTemplates, messageTemplates) {
  const { customId, guild, member, channel } = interaction;
  
  // Button verifikasi
  if (customId === 'btn-verify') {
    // Cek apakah user sudah memiliki role verify
    if (member.roles.cache.has(config.roles.verify)) {
      await interaction.reply({
        content: '✅ Kamu sudah terverifikasi!',
        ephemeral: true
      });
      return;
    }
    
    // Tambahkan role verify
    await member.roles.add(config.roles.verify);
    
    await interaction.reply({
      content: '✅ Kamu telah terverifikasi dan mendapatkan akses ke server!',
      ephemeral: true
    });
    return;
  }
  
  // Button untuk menambahkan bot musik
  if (customId === 'add_music_bot') {
    // Get the channel
    const channel = interaction.channel;
    
    // Check if this is a temporary voice channel
    const tempVoice = await TempVoice.findOne({ channelId: channel.id });
    if (!tempVoice) {
      await interaction.reply({
        content: messageTemplates.voice.notTempVoice,
        ephemeral: true
      });
      return;
    }
    
    // Get the voice channel
    const voiceChannel = guild.channels.cache.get(channel.id);
    if (!voiceChannel) {
      await interaction.reply({
        content: messageTemplates.general.error,
        ephemeral: true
      });
      return;
    }
    
    // Check if user is the owner or if owner is not in the channel
    const ownerInChannel = voiceChannel.members.has(tempVoice.ownerId);
    if (interaction.user.id !== tempVoice.ownerId && ownerInChannel) {
      await interaction.reply({
        content: messageTemplates.voice.notOwner,
        ephemeral: true
      });
      return;
    }
    
    // Add media bot role to the channel permissions
    await channel.permissionOverwrites.edit(config.roles.mediaBot, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.Connect]: true,
      [PermissionFlagsBits.Speak]: true,
      [PermissionFlagsBits.Stream]: true,
      [PermissionFlagsBits.UseVAD]: true,
      [PermissionFlagsBits.PrioritySpeaker]: true
    });
    
    // Update the message to the "already added" embed
    await interaction.update(embedTemplates.music_bot_already);
    
    return;
  }
  
  // Button untuk menghapus bot musik
  if (customId === 'remove_music_bot') {
    // Get the channel
    const channel = interaction.channel;
    
    // Check if this is a temporary voice channel
    const tempVoice = await TempVoice.findOne({ channelId: channel.id });
    if (!tempVoice) {
      await interaction.reply({
        content: messageTemplates.voice.notTempVoice,
        ephemeral: true
      });
      return;
    }
    
    // Get the voice channel
    const voiceChannel = guild.channels.cache.get(channel.id);
    if (!voiceChannel) {
      await interaction.reply({
        content: messageTemplates.general.error,
        ephemeral: true
      });
      return;
    }
    
    // Check if user is the owner or if owner is not in the channel
    const ownerInChannel = voiceChannel.members.has(tempVoice.ownerId);
    if (interaction.user.id !== tempVoice.ownerId && ownerInChannel) {
      await interaction.reply({
        content: messageTemplates.voice.notOwner,
        ephemeral: true
      });
      return;
    }
    
    // Completely remove the media bot role from channel permissions
    await channel.permissionOverwrites.delete(config.roles.mediaBot)
      .then(() => {
        console.log(`[VOICE] Successfully removed media bot role permissions for channel ${channel.id}`);
      })
      .catch(error => {
        console.error(`[ERROR] Failed to remove media bot permissions: ${error.message}`);
      });
    
    // Update the message to the "invite" embed
    await interaction.update(embedTemplates.music_bot_invite);
    
    return;
  }
  
  // Button untuk ambil alih voice
  if (customId === 'take_over_voice') {
    // Cek apakah channel adalah voice channel temporary
    const tempVoice = await TempVoice.findOne({ channelId: channel.id });
    if (!tempVoice) {
      await interaction.reply({
        content: messageTemplates.voice.notTempVoice,
        ephemeral: true
      });
      return;
    }
    
    // Cek voice channel
    const voiceChannel = guild.channels.cache.get(channel.id);
    if (!voiceChannel) {
      await interaction.reply({
        content: messageTemplates.general.error,
        ephemeral: true
      });
      return;
    }
    
    // Jika user adalah pemilik saat ini dari channel
    if (tempVoice.ownerId === member.id) {
      await interaction.reply({
        content: messageTemplates.voice.alreadyOwner,
        ephemeral: true
      });
      return;
    }
    
    // Cek apakah voice channel kosong
    if (voiceChannel.members.size === 0) {
      await interaction.reply({
        content: messageTemplates.voice.channelEmpty,
        ephemeral: true
      });
      return;
    }
    
    // Jika member adalah pemilik asli channel yang meninggalkan channel
    if (member.id === tempVoice.ownerId) {
      // Transfer kepemilikan ke pemilik asli secara langsung
      // Cek aktivitas user
      const activity = member.presence?.activities?.find(a => a.type === 0);
      const currentActivity = activity ? activity.name : null;
      
      // Update nama channel
      let newChannelName;
      if (currentActivity) {
        newChannelName = tempVoice.type === 1 ? `┗ ${currentActivity}` : `${currentActivity}`;
        tempVoice.gamePlaying = currentActivity;
      } else {
        newChannelName = tempVoice.type === 1 ? `┗ ${member.displayName}` : `${member.displayName} voice`;
        tempVoice.gamePlaying = null;
      }
      
      await voiceChannel.setName(newChannelName);
      
      // Update database
      tempVoice.ownerLeftAt = null;
      await tempVoice.save();
      
      await interaction.reply({
        content: messageTemplates.voice.ownerReturnSuccess,
        ephemeral: true
      });
      return;
    }
    
    // Cek jika pemilik channel masih ada di channel voice
    const ownerMember = voiceChannel.members.get(tempVoice.ownerId);
    if (ownerMember) {
      await interaction.reply({
        content: messageTemplates.voice.ownerStillInChannel,
        ephemeral: true
      });
      return;
    }
    
    // Jika bukan pemilik asli, cek waktu pemilik meninggalkan channel
    if (!tempVoice.ownerLeftAt) {
      // Jika ownerLeftAt belum di-set, update sekarang
      tempVoice.ownerLeftAt = new Date();
      await tempVoice.save();
    }
    
    // Cek apakah pemilik telah meninggalkan lebih dari 30 menit
    const ownerLeftTime = new Date(tempVoice.ownerLeftAt).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - ownerLeftTime;
    const minDiffInMs = 15 * 60 * 1000; // 15 menit dalam milidetik
    
    if (timeDiff < minDiffInMs) {
      // Hitung waktu yang tersisa
      const timeRemainingMs = minDiffInMs - timeDiff;
      let timeRemainingText = '';
      
      // Konversi ke format yang mudah dibaca
      const minutesLeft = Math.floor(timeRemainingMs / (60 * 1000));
      const secondsLeft = Math.floor((timeRemainingMs % (60 * 1000)) / 1000);
      
      if (minutesLeft > 0) {
        timeRemainingText = `${minutesLeft} menit ${secondsLeft} detik`;
      } else {
        timeRemainingText = `${secondsLeft} detik`;
      }
      
      await interaction.reply({
        content: messageTemplates.voice.ownerLeftTooRecent.replace('{timeRemaining}', timeRemainingText),
        ephemeral: true
      });
      return;
    }
    
    // Ambil alih kepemilikan
    // Hapus permission pemilik lama
    await voiceChannel.permissionOverwrites.edit(tempVoice.ownerId, {
      [PermissionFlagsBits.MuteMembers]: false,
      [PermissionFlagsBits.MoveMembers]: false,
      [PermissionFlagsBits.DeafenMembers]: false,
      [PermissionFlagsBits.PrioritySpeaker]: false
    });
    
    // Tambahkan permission pemilik baru
    await voiceChannel.permissionOverwrites.edit(member.id, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.Connect]: true,
      [PermissionFlagsBits.Speak]: true,
      [PermissionFlagsBits.Stream]: true,
      [PermissionFlagsBits.UseEmbeddedActivities]: true,
      [PermissionFlagsBits.MuteMembers]: true,
      [PermissionFlagsBits.MoveMembers]: true,
      [PermissionFlagsBits.DeafenMembers]: true,
      [PermissionFlagsBits.PrioritySpeaker]: true
    });
    
    // Cek aktivitas user baru
    const activity = member.presence?.activities?.find(a => a.type === 0);
    const currentActivity = activity ? activity.name : null;
    
    // Update nama channel
    let newChannelName;
    if (currentActivity) {
      newChannelName = tempVoice.type === 1 ? `┗ ${currentActivity}` : `${currentActivity}`;
      tempVoice.gamePlaying = currentActivity;
    } else {
      newChannelName = tempVoice.type === 1 ? `┗ ${member.displayName}` : `${member.displayName} voice`;
      tempVoice.gamePlaying = null;
    }
    
    await voiceChannel.setName(newChannelName);
    
    // Update database
    tempVoice.ownerId = member.id;
    tempVoice.ownerLeftAt = null;
    await tempVoice.save();
    
    await interaction.reply({
      content: messageTemplates.voice.takeOverSuccess,
      ephemeral: true
    });
    return;
  }
  
  // Button untuk subscribe channel
  if (customId.startsWith('subs-')) {
    const channelType = customId.substring(5); // Format: subs-[fins|lawe|liz|navv|yhsych]
    
    // Ambil ID role berdasarkan tipe channel
    const roleId = config.roles.subscribe[channelType];
    if (!roleId) {
      await interaction.reply({
        content: '❌ Role tidak ditemukan!',
        ephemeral: true
      });
      return;
    }
    
    // Cek apakah user sudah memiliki role
    if (member.roles.cache.has(roleId)) {
      // Hapus role
      await member.roles.remove(roleId);
      await interaction.reply({
        content: `✅ Kamu telah berhenti subscribe ke channel ini!`,
        ephemeral: true
      });
    } else {
      // Tambahkan role
      await member.roles.add(roleId);
      await interaction.reply({
        content: `✅ Kamu telah subscribe ke channel ini!`,
        ephemeral: true
      });
    }
    return;
  }
  
  // Button untuk menghapus semua role game
  if (customId === 'btn-remove-all') {
    let removedCount = 0;
    
    // Hapus semua role game yang dimiliki user
    for (const key of Object.keys(config.roles.games)) {
      const id = config.roles.games[key];
      if (id && member.roles.cache.has(id)) {
        await member.roles.remove(id);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await interaction.reply({
        content: `✅ Berhasil menghapus ${removedCount} role game!`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `❌ Kamu tidak memiliki role game apapun!`,
        ephemeral: true
      });
    }
    return;
  }
  
  // Button untuk custom role warna
  if (customId.startsWith('btn-')) {
    const colorType = customId.substring(4); // Format: btn-[biru|hijau|jingga|kuning|ungu]
    
    // Mapping dari button ID ke jenis warna
    const colorMapping = {
      'biru': 'blue',
      'hijau': 'green',
      'jingga': 'orange',
      'kuning': 'yellow',
      'ungu': 'purple'
    };
    
    const colorKey = colorMapping[colorType];
    if (!colorKey) {
      await interaction.reply({
        content: '❌ Warna tidak valid!',
        ephemeral: true
      });
      return;
    }
    
    // Ambil ID role berdasarkan warna
    const roleId = config.roles.colors[colorKey];
    if (!roleId) {
      await interaction.reply({
        content: '❌ Role warna tidak ditemukan!',
        ephemeral: true
      });
      return;
    }
    
    // Hapus semua role warna yang dimiliki user
    for (const key of Object.keys(config.roles.colors)) {
      const id = config.roles.colors[key];
      if (id && member.roles.cache.has(id)) {
        await member.roles.remove(id);
      }
    }
    
    // Cek apakah user sudah memiliki role ini
    if (member.roles.cache.has(roleId)) {
      // Jika sudah memiliki, hanya hapus role (sudah dilakukan di atas)
      await interaction.reply({
        content: `✅ Warna ${colorType} telah dihapus dari namamu!`,
        ephemeral: true
      });
    } else {
      // Tambahkan role warna baru
      await member.roles.add(roleId);
      await interaction.reply({
        content: `✅ Warna namamu telah diubah menjadi ${colorType}!`,
        ephemeral: true
      });
    }
    return;
  }
  
  // Button untuk membuat tiket
  if (customId === 'create-tickets') {
    // Cek apakah user sudah memiliki tiket aktif
    const existingTicket = await Ticket.findOne({
      guildId: guild.id,
      ownerId: member.id,
      status: { $ne: 'archived' }
    });
    
    if (existingTicket) {
      const ticketChannel = guild.channels.cache.get(existingTicket.channelId);
      if (ticketChannel) {
        await interaction.reply({
          content: getMessage('tickets', 'alreadyHasTicket', { channel: `<#${existingTicket.channelId}>` }),
          ephemeral: true
        });
        return;
      } else {
        // Jika channel tidak ditemukan, update status tiket
        existingTicket.status = 'archived';
        await existingTicket.save();
      }
    }
    
    // Increment ticket counter
    let guildData = await Guild.findOne({ guildId: guild.id });
    if (!guildData) {
      guildData = new Guild({ guildId: guild.id });
    }
    
    guildData.ticketCounter++;
    await guildData.save();
    
    // Format ticket number dengan padding 3 digit
    const ticketNumber = guildData.ticketCounter.toString().padStart(3, '0');
    
    // Buat channel tiket
    const ticketChannel = await guild.channels.create({
      name: `${member.displayName}-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: config.ticketSettings.categoryId || config.channels.ticketCategory, // Use configured category ID
      permissionOverwrites: getTicketChannelPermissions(guild, member, config.roles.admin)
    });
    
    // Kirim welcome message
    const welcomeMessage = await ticketChannel.send({
      content: `<@${member.id}>`,
      embeds: [
        {
          ...embedTemplates.ticket_opened.embeds[0],
          description: embedTemplates.ticket_opened.embeds[0].description.replace('{user}', member.toString())
        }
      ],
      components: filterEmptyComponentRows(embedTemplates.ticket_opened.components)
    });
    
    // Simpan tiket ke database
    const ticket = new Ticket({
      channelId: ticketChannel.id,
      guildId: guild.id,
      ownerId: member.id,
      ticketNumber: guildData.ticketCounter || 1, // Ensure we always have a ticket number
      number: guildData.ticketCounter || 1, // Also set the legacy field to the same value
      welcomeMessageId: welcomeMessage.id,
      channelName: ticketChannel.name || `ticket-${guildData.ticketCounter || 1}`,
      participants: [
        {
          userId: member.id,
          username: member.displayName
        }
      ]
    });
    
    try {
      await ticket.save();
      console.log(`[INFO] Created ticket #${ticket.ticketNumber} for user ${member.displayName}`);
    } catch (error) {
      console.error(`[ERROR] Failed to save ticket:`, error);
      // Try to recover by forcing a unique ticket number if that was the issue
      if (error.code === 11000) {
        try {
          const highestTicket = await Ticket.findOne({ guildId: guild.id }).sort({ ticketNumber: -1 });
          const newNumber = (highestTicket?.ticketNumber || 0) + 1;
          ticket.ticketNumber = newNumber;
          ticket.number = newNumber; // Also update the legacy field
          await ticket.save();
          console.log(`[INFO] Recovered by using ticket number ${newNumber}`);
        } catch (recoveryError) {
          console.error(`[ERROR] Failed to recover ticket creation:`, recoveryError);
          await interaction.reply({
            content: 'There was an error creating your ticket. Please try again later.',
            ephemeral: true
          });
          await ticketChannel.delete().catch(console.error);
          return;
        }
      } else {
        // For non-duplicate key errors, delete the channel and inform the user
        await ticketChannel.delete().catch(console.error);
        await interaction.reply({
          content: 'There was an error creating your ticket. Please try again later.',
          ephemeral: true
        });
        return;
      }
    }
    
    // Update array tiket aktif di guild data
    if (!guildData.activeTickets.includes(ticketChannel.id)) {
      guildData.activeTickets.push(ticketChannel.id);
      await guildData.save();
    }
    
    await interaction.reply({
      content: getMessage('tickets', 'ticketCreated', { channel: `<#${ticketChannel.id}>` }),
      ephemeral: true
    });
    return;
  }
  
  // Button untuk menutup tiket
  if (customId === 'close-ticket') {
    // Cek apakah channel adalah tiket
    const ticket = await Ticket.findOne({ channelId: channel.id });
    if (!ticket) {
      await interaction.reply({
        content: '❌ Channel ini bukan tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Cek status tiket
    if (ticket.status !== 'open') {
      await interaction.reply({
        content: '❌ Tiket ini sudah ditutup!',
        ephemeral: true
      });
      return;
    }
    
    // Update status tiket
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = member.id;
    
    // Ubah permission owner tiket
    await channel.permissionOverwrites.edit(ticket.ownerId, {
      SendMessages: false
    });
    
    // Edit pesan welcome
    if (ticket.welcomeMessageId) {
      const welcomeMessage = await channel.messages.fetch(ticket.welcomeMessageId).catch(() => null);
      if (welcomeMessage) {
        await welcomeMessage.edit({
          content: null,
          embeds: [
            {
              ...embedTemplates.ticket_closed.embeds[0],
              description: embedTemplates.ticket_closed.embeds[0].description.replace('{user}', member.toString())
            }
          ],
          components: filterEmptyComponentRows(embedTemplates.ticket_closed.components)
        });
      }
    }
    
    // Check if there's an existing status message to update
    if (ticket.statusMessageId) {
      try {
        const statusMessage = await channel.messages.fetch(ticket.statusMessageId);
        await statusMessage.edit({
          content: `✅ Tiket ditutup oleh ${member.toString()}.`
        });
      } catch (error) {
        // If we can't find the old message, create a new one
        const newStatusMessage = await channel.send({
          content: `✅ Tiket ditutup oleh ${member.toString()}.`
        });
        ticket.statusMessageId = newStatusMessage.id;
      }
    } else {
      // If there's no stored status message, create a new one
      const newStatusMessage = await channel.send({
        content: `✅ Tiket ditutup oleh ${member.toString()}.`
      });
      ticket.statusMessageId = newStatusMessage.id;
    }
    
    await ticket.save();
    
    // Acknowledge the interaction without showing a message
    await interaction.deferUpdate();
    return;
  }
  
  // Button untuk membuka kembali tiket
  if (customId === 'open-ticket') {
    // Cek apakah channel adalah tiket
    const ticket = await Ticket.findOne({ channelId: channel.id });
    if (!ticket) {
      await interaction.reply({
        content: '❌ Channel ini bukan tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Cek status tiket
    if (ticket.status !== 'closed') {
      await interaction.reply({
        content: '❌ Tiket ini tidak dalam status tertutup!',
        ephemeral: true
      });
      return;
    }
    
    // Update status tiket
    ticket.status = 'open';
    
    // Ubah permission owner tiket
    await channel.permissionOverwrites.edit(ticket.ownerId, {
      SendMessages: true
    });
    
    // Edit pesan welcome
    if (ticket.welcomeMessageId) {
      const welcomeMessage = await channel.messages.fetch(ticket.welcomeMessageId).catch(() => null);
      if (welcomeMessage) {
        const ticketOwner = await guild.members.fetch(ticket.ownerId).catch(() => null);
        const ownerMention = ticketOwner ? ticketOwner.toString() : 'Unknown User';
        
        await welcomeMessage.edit({
          content: null,
          embeds: [
            {
              ...embedTemplates.ticket_opened.embeds[0],
              description: embedTemplates.ticket_opened.embeds[0].description.replace('{user}', ownerMention)
            }
          ],
          components: filterEmptyComponentRows(embedTemplates.ticket_opened.components)
        });
      }
    }
    
    // Update the status message or create a new one
    if (ticket.statusMessageId) {
      try {
        const statusMessage = await channel.messages.fetch(ticket.statusMessageId);
        await statusMessage.edit({
          content: `✅ Tiket dibuka lagi oleh ${member.toString()}.`
        });
      } catch (error) {
        // If we can't find the old message, create a new one
        const newStatusMessage = await channel.send({
          content: `✅ Tiket dibuka lagi oleh ${member.toString()}.`
        });
        ticket.statusMessageId = newStatusMessage.id;
      }
    } else {
      // If there's no stored status message, create a new one
      const newStatusMessage = await channel.send({
        content: `✅ Tiket dibuka lagi oleh ${member.toString()}.`
      });
      ticket.statusMessageId = newStatusMessage.id;
    }
    
    await ticket.save();
    
    // Acknowledge the interaction without showing a message
    await interaction.deferUpdate();
    return;
  }
  
  // Button untuk menghapus tiket
  if (customId === 'delete-ticket') {
    // Cek apakah channel adalah tiket
    const ticket = await Ticket.findOne({ channelId: channel.id });
    if (!ticket) {
      await interaction.reply({
        content: '❌ Channel ini bukan tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Get the admin role
    const adminRole = guild.roles.cache.get(config.roles.admin);
    
    // Cek apakah user adalah admin atau memiliki role yang lebih tinggi
    const hasAdminPermission = member.roles.cache.has(config.roles.admin) || 
                              member.roles.cache.some(role => 
                                adminRole && role.position > adminRole.position
                              );
    
    if (!hasAdminPermission) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menghapus tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Kirim konfirmasi
    await interaction.reply({
      embeds: embedTemplates.ticket_delete_confirm.embeds,
      components: filterEmptyComponentRows(embedTemplates.ticket_delete_confirm.components)
    });
    return;
  }
  
  // Button untuk konfirmasi hapus tiket
  if (customId === 'confirm-delete') {
    // Cek apakah channel adalah tiket
    const ticket = await Ticket.findOne({ channelId: channel.id });
    if (!ticket) {
      await interaction.reply({
        content: '❌ Channel ini bukan tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Get the admin role
    const adminRole = guild.roles.cache.get(config.roles.admin);
    
    // Cek apakah user adalah admin atau memiliki role yang lebih tinggi
    const hasAdminPermission = member.roles.cache.has(config.roles.admin) || 
                              member.roles.cache.some(role => 
                                adminRole && role.position > adminRole.position
                              );
    
    if (!hasAdminPermission) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menghapus tiket!',
        ephemeral: true
      });
      return;
    }
    
    // Mulai proses arsip
    await interaction.deferReply();
    
    // Ambil semua pesan di channel
    const messages = await channel.messages.fetch();
    
    // Buat transkrip
    const transcript = await createTranscript(messages.reverse(), ticket, guild);
    
    // Kirim transkrip ke channel arsip
    const archiveChannel = guild.channels.cache.get(config.channels.archive);
    if (archiveChannel) {
      const ticketOwner = await guild.members.fetch(ticket.ownerId).catch(() => null);
      const ownerName = ticketOwner ? ticketOwner.displayName : 'Unknown User';
      const ownerAvatar = ticketOwner ? ticketOwner.displayAvatarURL({ dynamic: true }) : null;
      
      // Buat list peserta
      let participantsList = '';
      for (const participant of ticket.participants) {
        participantsList += `<@${participant.userId}> `;
      }
      
      // First, send the transcript file
      const fileMessage = await archiveChannel.send({
        files: [transcript.filePath]
      });
      
      // Get the attachment URL from the sent message
      const attachmentURL = fileMessage.attachments.first()?.url;
      
      if (!attachmentURL) {
        console.error('[ERROR] Failed to get attachment URL for transcript');
      }
      
      // Kirim embed transkrip with the URL button
      await archiveChannel.send({
        embeds: [
          {
            ...embedTemplates.ticket_transcript.embeds[0],
            author: {
              name: ownerName,
              icon_url: ownerAvatar
            },
            fields: embedTemplates.ticket_transcript.embeds[0].fields.map(field => {
              let value = field.value;
              
              if (field.name.includes('Pemilik')) {
                value = value.replace('{user}', ownerName);
              } else if (field.name.includes('Channel')) {
                value = value.replace('{channel}', ticket.channelName);
              } else if (field.name.includes('Peserta')) {
                const count = ticket.participants.length;
                return {
                  name: field.name.replace('{count}', count),
                  value: participantsList,
                  inline: field.inline
                };
              } else if (field.name.includes('Transkrip')) {
                value = value.replace('{transcript}', transcript.textPreview);
              }
              
              return {
                name: field.name,
                value: value,
                inline: field.inline
              };
            })
          }
        ],
        components: [
          {
            type: 1, // ActionRow
            components: [
              {
                type: 2, // Button
                style: 5, // Link button
                label: "Lihat Transkrip",
                emoji: "📄",
                url: attachmentURL || 'https://discord.com'
              }
            ]
          }
        ]
      });
    }
    
    // Update status tiket
    ticket.status = 'archived';
    await ticket.save();
    
    // Update guild data
    const guildData = await Guild.findOne({ guildId: guild.id });
    if (guildData) {
      guildData.activeTickets = guildData.activeTickets.filter(id => id !== channel.id);
      await guildData.save();
    }
    
    await interaction.editReply({
      content: '✅ Tiket sedang diarsipkan dan akan dihapus dalam beberapa detik...'
    });
    
    // Hapus channel setelah beberapa detik
    setTimeout(async () => {
      await channel.delete().catch(console.error);
    }, 5000);
    
    return;
  }
  
  // Button untuk membatalkan hapus tiket
  if (customId === 'cancel-delete') {
    // Hapus pesan konfirmasi
    await interaction.message.delete().catch(() => {});
    
    await interaction.reply({
      content: '✅ Penghapusan tiket dibatalkan.',
      ephemeral: true
    });
    return;
  }
}

/**
 * Menangani interaksi select menu
 * @param {SelectMenuInteraction} interaction - Interaksi select menu
 * @param {Client} client - Client Discord
 * @param {Object} embedTemplates - Template embed
 */
async function handleSelectMenuInteraction(interaction, client, embedTemplates) {
  const { customId, values, guild, member } = interaction;
  
  // Select menu untuk role game
  if (customId === 'games_select') {
    if (!values || values.length === 0) {
      await interaction.reply({
        content: '❌ Tidak ada game yang dipilih!',
        ephemeral: true
      });
      return;
    }
    
    // Ambil semua game role yang sudah dimiliki user
    const currentGameRoles = Object.entries(config.roles.games)
      .filter(([game, roleId]) => roleId && member.roles.cache.has(roleId))
      .map(([game]) => game);
    
    // Role yang perlu ditambahkan (dipilih tetapi belum dimiliki)
    const rolesToAdd = values.filter(game => !currentGameRoles.includes(game));
    
    // Role yang perlu dihapus (sudah dimiliki tetapi tidak dipilih)
    const rolesToRemove = currentGameRoles.filter(game => !values.includes(game));
    
    // Tambahkan role baru
    for (const game of rolesToAdd) {
      const roleId = config.roles.games[game];
      if (roleId) {
        await member.roles.add(roleId).catch(() => {});
      }
    }
    
    // Hapus role yang tidak dipilih
    for (const game of rolesToRemove) {
      const roleId = config.roles.games[game];
      if (roleId) {
        await member.roles.remove(roleId).catch(() => {});
      }
    }
    
    await interaction.reply({
      content: `✅ Role game telah diperbarui! Ditambahkan: ${rolesToAdd.length}, Dihapus: ${rolesToRemove.length}`,
      ephemeral: true
    });
    return;
  }
} 