const { PermissionsBitField } = require('discord.js');

// Fungsi untuk mendapatkan permission standard untuk channel voice
const getVoiceChannelPermissions = (guild, member, isOwner = false) => {
  // Daftar permission yang diizinkan untuk semua orang
  const allowedForAll = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak
  ];
  
  // Daftar permission tambahan untuk owner
  const additionalForOwner = [
    PermissionsBitField.Flags.Video,
    PermissionsBitField.Flags.UseEmbeddedActivities,
    PermissionsBitField.Flags.UseSoundboard,
    PermissionsBitField.Flags.UseExternalSounds,
    PermissionsBitField.Flags.UseVAD,
    PermissionsBitField.Flags.PrioritySpeaker,
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.UseExternalEmojis,
    PermissionsBitField.Flags.UseExternalStickers,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.UseApplicationCommands
  ];
  
  // Default permission untuk @everyone - deny all
  const everyonePermissions = {
    id: guild.roles.everyone.id,
    deny: [PermissionsBitField.Flags.ViewChannel]
  };
  
  // Permission untuk member biasa - allow basic
  const memberPermissions = {
    id: member.id,
    allow: allowedForAll,
    deny: []
  };
  
  // Tambahkan permission tambahan jika member adalah owner
  if (isOwner) {
    memberPermissions.allow = [...allowedForAll, ...additionalForOwner];
  }
  
  return [everyonePermissions, memberPermissions];
};

// Fungsi untuk mendapatkan permission standard untuk channel tiket
const getTicketChannelPermissions = (guild, member, adminRoleId) => {
  // Permission untuk @everyone - deny all
  const everyonePermissions = {
    id: guild.roles.everyone.id,
    deny: [PermissionsBitField.Flags.ViewChannel]
  };
  
  // Permission untuk owner tiket
  const ownerPermissions = {
    id: member.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.UseExternalEmojis,
      PermissionsBitField.Flags.UseExternalStickers,
      PermissionsBitField.Flags.UseApplicationCommands
    ]
  };
  
  // Permission untuk admin
  const adminPermissions = {
    id: adminRoleId,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.UseExternalEmojis,
      PermissionsBitField.Flags.UseExternalStickers,
      PermissionsBitField.Flags.UseApplicationCommands,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.ManageChannels
    ]
  };
  
  return [everyonePermissions, ownerPermissions, adminPermissions];
};

// Ekspor fungsi yang dibuat
module.exports = {
  getVoiceChannelPermissions,
  getTicketChannelPermissions
}; 