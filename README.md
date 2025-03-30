# Cappie Discord Bot 🤖

Cappie adalah bot Discord multifungsi yang dikembangkan untuk meningkatkan pengalaman komunitas Discord dengan berbagai fitur interaktif.

## ✨ Fitur

### 🎮 Join to Create Voice
- Sistem join to create voice channel dengan nama otomatis berdasarkan game yang dimainkan
- Deteksi aktivitas game untuk pembaruan nama channel otomatis
- Dukungan bot musik untuk channel voice sementara

### 👤 Role Management
- Sistem verifikasi dengan button
- Custom role warna untuk username
- Sistem role game dengan select menu
- Tombol untuk menghapus semua role game

### 📢 Subscribe System
- Sistem subscribe untuk channel streamer dengan button
- Notifikasi saat streamer live

### 🎫 Ticket System
- Sistem tiket support dengan pembuatan, penutupan, dan penghapusan tiket
- Transkrip otomatis untuk setiap tiket yang ditutup
- Arsip tiket untuk referensi di masa depan

## 🛠️ Teknologi

- Discord.js v14
- MongoDB untuk penyimpanan data
- Node.js
- JSON untuk konfigurasi dan pesan

## 📦 Struktur Folder

```
cappie-bot/
├── config/             # Konfigurasi bot
├── events/             # Event handler Discord
│   ├── client/         # Event client (ready, etc.)
│   ├── guild/          # Event guild 
│   ├── interaction/    # Event interaksi (button, select menu)
│   └── voice/          # Event voice (voice state update)
├── handlers/           # Handler untuk fitur
├── json/               # File JSON untuk data statis
│   ├── config.json     # Konfigurasi bot (ID channel, role, dll)
│   ├── embeds.json     # Template untuk embeds
│   ├── gameRoles.json  # Konfigurasi menu role game
│   └── messages.json   # Pesan yang digunakan bot
├── models/             # Model database MongoDB
├── transcripts/        # Transkrip tiket yang disimpan
├── utils/              # Fungsi utilitas
│   └── loader.js       # Loader untuk file JSON
├── .env                # Variabel lingkungan (token, DB)
├── index.js            # File utama
└── package.json        # Dependensi
```

## 🚀 Memulai

Lihat [Panduan Setup](SETUP.md) untuk instruksi detail tentang cara mengatur dan menjalankan bot ini.

## 📄 License

MIT License

## 🙏 Kredit

Dibuat oleh Lawe Rejas dengan 💙 