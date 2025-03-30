const { Client, ActivityType } = require('discord.js');
const colors = require('colors');

/**
 * Handler untuk mengatur dan merotasi status (presence) bot
 * @param {Client} client - Instance client Discord.js
 * @param {Object} presenceConfig - Konfigurasi presence dari config file
 */
module.exports = (client, presenceConfig) => {
  // Cek apakah konfigurasi presence tersedia
  if (!presenceConfig || !presenceConfig.activities || !presenceConfig.status) {
    console.warn('[WARNING] '.yellow + 'Presence configuration not provided, using default');
    return;
  }
  
  // Konversi tipe aktivitas dari string ke ActivityType
  const activityTypes = {
    PLAYING: ActivityType.Playing,
    STREAMING: ActivityType.Streaming,
    LISTENING: ActivityType.Listening,
    WATCHING: ActivityType.Watching,
    COMPETING: ActivityType.Competing,
    CUSTOM: ActivityType.Custom
  };
  
  // Siapkan array activities dengan tipe yang sudah dikonversi
  const activities = presenceConfig.activities.map(activity => ({
    name: activity.name,
    type: activityTypes[activity.type] || ActivityType.Playing
  }));
  
  // Variabel untuk menyimpan indeks aktivitas saat ini
  let currentActivityIndex = 0;
  
  // Fungsi untuk mengubah presence secara periodik
  const updatePresence = () => {
    // Ambil aktivitas berdasarkan indeks saat ini
    const activity = activities[currentActivityIndex];
    
    // Atur presence
    client.user.setPresence({
      activities: [activity],
      status: presenceConfig.status
    });
    
    // Log perubahan presence
    console.log(
      '[INFO] '.blue + 
      'Updated presence to: ' + 
      `${activity.type === ActivityType.Custom ? 'Custom: ' : ''}`.cyan + 
      `${activity.name}`.green
    );
    
    // Perbarui indeks untuk rotasi berikutnya
    currentActivityIndex = (currentActivityIndex + 1) % activities.length;
  };
  
  // Update presence saat bot siap
  console.log('[INFO] '.yellow + 'Setting up presence rotation...');
  updatePresence();
  
  // Setup interval untuk merotasi presence
  setInterval(updatePresence, presenceConfig.interval);
  console.log('[SUCCESS] '.green + `Presence rotation set up with ${presenceConfig.interval}ms interval`);
}; 