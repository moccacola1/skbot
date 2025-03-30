const fs = require('fs');
const path = require('path');
const { htmlToText } = require('html-to-text');

// Fungsi untuk membuat folder transcripts jika belum ada
const ensureTranscriptFolder = () => {
  const dir = path.join(__dirname, '..', 'transcripts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Fungsi untuk menghasilkan nama file transkrip
const generateTranscriptFilename = (guildId, ticketNumber) => {
  const date = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  return `transcript-${guildId}-${ticketNumber}-${date}.html`;
};

/**
 * Fungsi untuk menghapus file transkrip yang lebih dari 6 bulan
 * @returns {number} Jumlah file yang dihapus
 */
const cleanupOldTranscripts = () => {
  const transcriptsDir = ensureTranscriptFolder();
  const files = fs.readdirSync(transcriptsDir);
  
  // Menghitung tanggal 6 bulan yang lalu
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  let deletedCount = 0;
  
  files.forEach(file => {
    if (!file.startsWith('transcript-') || !file.endsWith('.html')) {
      return; // Skip files that aren't transcripts
    }
    
    const filePath = path.join(transcriptsDir, file);
    const stats = fs.statSync(filePath);
    
    // Jika file lebih dari 6 bulan, hapus
    if (stats.mtime < sixMonthsAgo) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.error(`[ERROR] Failed to delete old transcript ${file}:`, err);
      }
    }
  });
  
  // Only log if files were actually deleted
  if (deletedCount > 0) {
    console.log(`[INFO] Transcript cleanup: Deleted ${deletedCount} old transcripts.`);
  }
  return deletedCount;
};

/**
 * Fungsi untuk menjadwalkan pembersihan otomatis setiap 6 bulan
 */
const scheduleTranscriptCleanup = () => {
  // Jalankan pembersihan pertama sekarang
  cleanupOldTranscripts();
  
  // 6 bulan dalam milidetik = 182.5 hari
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 182.5;
  
  // Jadwalkan pembersihan berikutnya dalam 6 bulan
  setInterval(() => {
    cleanupOldTranscripts();
  }, sixMonthsMs);
  
  // Simpler log message
  console.log('[INFO] Transcript auto-cleanup scheduled (every 6 months)');
};

// Fungsi untuk membuat file transkrip HTML dari array pesan
const createTranscript = async (messages, ticket, guild) => {
  // Pastikan folder transcripts ada
  const transcriptsDir = ensureTranscriptFolder();
  
  // Generate nama file
  const filename = generateTranscriptFilename(guild.id, ticket.ticketNumber);
  const filePath = path.join(transcriptsDir, filename);
  
  // Kumpulkan data untuk template
  const ticketOwner = await guild.members.fetch(ticket.ownerId).catch(() => null);
  const ownerName = ticketOwner ? ticketOwner.displayName : 'Unknown User';
  const ticketCreatedDate = new Date(ticket.createdAt).toLocaleString('id-ID');
  const ticketClosedDate = ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('id-ID') : 'Not Closed';
  
  // Buat header HTML - simplified version
  let html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript #${ticket.ticketNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #fff;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .message {
      margin-bottom: 10px;
      padding: 5px 0;
      border-bottom: 1px solid #eee;
    }
    .username {
      font-weight: bold;
    }
    .timestamp {
      color: #666;
      font-size: 0.85em;
    }
    .content {
      margin-top: 3px;
    }
    .system {
      color: #666;
      font-style: italic;
    }
    .attachment {
      margin-top: 5px;
      margin-bottom: 5px;
    }
    .attachment img {
      max-width: 400px;
      max-height: 300px;
      border-radius: 5px;
      border: 1px solid #ddd;
    }
    .attachment a {
      display: inline-block;
      margin-top: 5px;
      color: #5865F2;
      text-decoration: none;
    }
    .attachment a:hover {
      text-decoration: underline;
    }
    .embed {
      margin-top: 5px;
      border-left: 4px solid #5865F2;
      padding-left: 8px;
      background-color: rgba(88, 101, 242, 0.05);
      padding: 8px;
      border-radius: 0 3px 3px 0;
    }
    .embed-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .embed-description {
      font-size: 0.95em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ticket #${ticket.ticketNumber}</h2>
      <p>Owner: ${ownerName}</p>
      <p>Created: ${ticketCreatedDate}</p>
      <p>Closed: ${ticketClosedDate}</p>
    </div>
`;
  
  // Sort messages by timestamp
  const sortedMessages = Array.from(messages).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  
  // Generate message HTML
  for (const message of sortedMessages) {
    if (message.system) {
      // System message
      html += `<div class="message system">${message.content}</div>`;
    } 
    else if (message.author) {
      // User message
      const messageDate = new Date(message.createdTimestamp).toLocaleString('id-ID');
      const userName = message.member?.displayName || message.author.username || 'Unknown User';
      const userAvatar = message.author?.displayAvatarURL?.() || 'https://cdn.discordapp.com/embed/avatars/0.png';
      
      html += `
<div class="message">
  <div>
    <img src="${userAvatar}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle;">
    <span class="username">${userName}</span> <span class="timestamp">${messageDate}</span>
  </div>
  <div class="content">${message.content || ''}</div>`;
      
      // Add attachments if any exist
      if (message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
          const isImage = attachment.contentType?.startsWith('image/');
          html += `<div class="attachment">`;
          
          if (isImage) {
            html += `<img src="${attachment.url}" alt="${attachment.name}">`;
          }
          
          html += `<a href="${attachment.url}" target="_blank">${attachment.name || 'Download Attachment'}</a>
          </div>`;
        });
      }
      
      // Add embeds if any exist
      if (message.embeds && message.embeds.length > 0) {
        message.embeds.forEach(embed => {
          if (embed.title || embed.description) {
            html += `<div class="embed">`;
            
            if (embed.title) {
              html += `<div class="embed-title">${embed.title}</div>`;
            }
            
            if (embed.description) {
              html += `<div class="embed-description">${embed.description}</div>`;
            }
            
            html += `</div>`;
          }
        });
      }
      
      html += `</div>`;
    }
  }
  
  // Close HTML
  html += `
  </div>
</body>
</html>`;
  
  // Write the file
  fs.writeFileSync(filePath, html);
  
  // Create text preview for Discord
  const textTranscript = htmlToText(html, {
    wordwrap: 80,
    selectors: [
      { selector: '.system', format: 'paragraph' },
      { selector: '.message', format: 'paragraph' }
    ]
  });
  
  // Limit preview length
  const truncatedText = textTranscript.length > 1000 
    ? textTranscript.substring(0, 997) + '...' 
    : textTranscript;
  
  return {
    filePath,
    fileName: filename,
    textPreview: truncatedText
  };
};

module.exports = {
  createTranscript,
  cleanupOldTranscripts,
  scheduleTranscriptCleanup
}; 