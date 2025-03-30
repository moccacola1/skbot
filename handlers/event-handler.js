const fs = require('fs');
const path = require('path');
const { Client } = require('discord.js');
const colors = require('colors');

/**
 * Handler untuk mengelola event-event dari discord.js
 * @param {Client} client - Instance client Discord.js
 */
module.exports = (client) => {
  console.log('[INFO] '.yellow + 'Loading events...');
  
  // Membaca folder events untuk mencari file event
  const eventFolders = fs.readdirSync(path.join(__dirname, '..', 'events'));
  
  for (const folder of eventFolders) {
    // Membaca file-file event dalam folder
    const eventFiles = fs
      .readdirSync(path.join(__dirname, '..', 'events', folder))
      .filter(file => file.endsWith('.js'));
    
    // Set prioritas berdasarkan nama folder (digunakan untuk mengurutkan event)
    let priority;
    switch (folder) {
      case 'client':
        priority = 0;
        break;
      case 'guild':
        priority = 1;
        break;
      default:
        priority = 2;
    }
    
    // Mendaftarkan setiap event ke client
    for (const file of eventFiles) {
      const event = require(path.join(__dirname, '..', 'events', folder, file));
      const eventName = file.split('.')[0];
      
      // Mengatur event listener berdasarkan yang di-export file
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      
      console.log(`[LOADED] `.green + `${eventName} `.cyan + `event from `.white + `${folder} `.magenta + `folder`.white);
    }
  }
  
  console.log('[SUCCESS] '.green + 'All events loaded!');
}; 