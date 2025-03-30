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
  
  // Buat header HTML
  let html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript #${ticket.ticketNumber} - ${ownerName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f9f9f9;
      color: #333;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
    }
    .ticket-info {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .ticket-info h1 {
      margin-top: 0;
      color: #faa6a3;
    }
    .ticket-info p {
      margin: 5px 0;
    }
    .messages {
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    .message {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .message-header {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 10px;
    }
    .username {
      font-weight: bold;
      color: #333;
    }
    .timestamp {
      margin-left: 10px;
      color: #999;
      font-size: 0.8em;
    }
    .content {
      margin-left: 50px;
    }
    .system-message {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 15px;
      font-style: italic;
      color: #666;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #999;
      font-size: 0.8em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="ticket-info">
      <h1>Transcript Tiket #${ticket.ticketNumber}</h1>
      <p><strong>Pemilik:</strong> ${ownerName}</p>
      <p><strong>Channel:</strong> ${ticket.channelName || 'Unknown Channel'}</p>
      <p><strong>Dibuat:</strong> ${ticketCreatedDate}</p>
      <p><strong>Ditutup:</strong> ${ticketClosedDate}</p>
    </div>
    <div class="messages">
  `;
  
  // Susun pesan-pesan
  if (messages.length === 0) {
    html += '<div class="system-message">Tidak ada pesan dalam tiket ini.</div>';
  } else {
    // Urutkan pesan berdasarkan waktu
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
    for (const message of sortedMessages) {
      if (message.system) {
        // Pesan sistem
        html += `<div class="system-message">${message.content}</div>`;
      } else {
        // Pesan pengguna biasa
        const messageDate = new Date(message.createdTimestamp).toLocaleString('id-ID');
        
        // Add null checks for author and displayAvatarURL
        const userAvatar = message.author && typeof message.author.displayAvatarURL === 'function' 
          ? message.author.displayAvatarURL({ dynamic: true }) 
          : 'https://cdn.discordapp.com/embed/avatars/0.png'; // Default Discord avatar
          
        const userName = message.member ? message.member.displayName : 
                         (message.author ? message.author.username : 'Unknown User');
        
        html += `
          <div class="message">
            <div class="message-header">
              <img src="${userAvatar}" alt="Avatar" class="avatar">
              <div class="username">${userName}</div>
              <div class="timestamp">${messageDate}</div>
            </div>
            <div class="content">${message.content}</div>
          </div>
        `;
      }
    }
  }
  
  // Tutup HTML
  html += `
    </div>
    <div class="footer">
      <p>Transcript dibuat oleh Cappie Bot - ${new Date().toLocaleString('id-ID')}</p>
      <p>Made by Lawe Rejas</p>
    </div>
  </div>
</body>
</html>
  `;
  
  // Tulis ke file
  fs.writeFileSync(filePath, html);
  
  // Buat versi teks untuk preview di Discord
  const textTranscript = htmlToText(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: '.system-message', format: 'paragraph' },
      { selector: '.message', format: 'paragraph' }
    ]
  });
  
  // Batasi panjang transkrip teks untuk Discord (max 1000 karakter)
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
  createTranscript
}; 