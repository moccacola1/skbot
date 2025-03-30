# Panduan Setup Cappie Bot

Panduan ini akan membantu Anda untuk mengatur dan menjalankan Cappie Bot di server Discord Anda.

## Prasyarat

Sebelum Anda memulai, pastikan Anda memiliki:

1. [Node.js](https://nodejs.org/) versi 16.x atau lebih tinggi
2. [MongoDB](https://www.mongodb.com/) (database)
3. Sebuah [Discord Bot Application](https://discord.com/developers/applications)

## Langkah 1: Setup Bot Discord

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik "New Application" dan beri nama "Cappie" atau nama lain yang Anda inginkan
3. Pergi ke tab "Bot" dan klik "Add Bot"
4. Aktifkan opsi berikut:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Salin token bot Anda (Anda akan membutuhkannya untuk file .env)
6. Pergi ke tab "OAuth2" > "URL Generator"
7. Pilih scopes: `bot` dan `applications.commands`
8. Pilih permission yang dibutuhkan: Administrator (untuk kemudahan setup)
9. Salin URL yang dihasilkan dan buka di browser untuk mengundang bot ke server Anda

## Langkah 2: Setup Database

1. Buat MongoDB database (bisa menggunakan [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) untuk solusi cloud)
2. Dapatkan connection string MongoDB (akan terlihat seperti: `mongodb+srv://username:password@cluster.mongodb.net/database`)

## Langkah 3: Clone dan Setup Repository

1. Clone repository ini:
   ```bash
   git clone https://github.com/yourusername/cappie-bot.git
   cd cappie-bot
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Salin file .env.example ke .env:
   ```bash
   cp .env.example .env
   ```

4. Edit file .env dan isi informasi sensitif:
   - `TOKEN`: Token bot Discord Anda
   - `MONGODB_URI`: URI koneksi MongoDB Anda

## Langkah 4: Konfigurasi dengan JSON

Cappie Bot menggunakan file JSON untuk menyimpan konfigurasi dan pesan. File-file utama yang perlu Anda sesuaikan:

### 1. json/config.json

File ini berisi semua pengaturan bot, termasuk ID channel, ID role, dan pengaturan lainnya.

1. Buka file `json/config.json`
2. Isi ID-ID yang diperlukan:
   - `voiceChannels`: ID channel voice untuk Join to Create
   - `roles`: ID untuk berbagai role (admin, verifikasi, warna, dll)
   - `channels`: ID untuk channel embed dan fitur lainnya

Contoh struktur:

```json
{
  "voiceChannels": {
    "firstVoice": "1234567890123456789",
    "secondVoice": "1234567890123456789"
  },
  "roles": {
    "mediaBot": "1234567890123456789",
    "verify": "1234567890123456789",
    "admin": "1234567890123456789"
  }
}
```

### 2. json/messages.json

File ini berisi semua pesan yang ditampilkan oleh bot. Anda dapat menyesuaikan pesan-pesan ini sesuai kebutuhan.

### 3. json/gameRoles.json

File ini berisi konfigurasi untuk menu pemilihan role game.

## Langkah 5: Membuat Channel dan Role

### Channel yang Dibutuhkan
1. Channel untuk "First Voice" (voice channel untuk join-to-create)
2. Channel untuk "Second Voice" (voice channel untuk join-to-create)
3. Channel untuk Welcome message dan verifikasi
4. Channel untuk Link server
5. Channel untuk Subscribe
6. Channel untuk Custom role
7. Channel untuk Game roles
8. Channel untuk Ticket
9. Channel untuk Archive tiket
10. Kategori untuk Ticket (semua ticket channels akan dibuat di bawah kategori ini)

### Role yang Dibutuhkan
1. Role untuk verifikasi
2. Role untuk admin
3. Role untuk bot musik
4. Role untuk warna (biru, hijau, jingga, kuning, ungu)
5. Role untuk setiap game yang ada di menu pilihan
6. Role untuk subscribe channel (fins, lawe, liz, navv, yhsych)

## Langkah 6: Mendapatkan ID

Untuk mendapatkan ID channel atau role:
1. Aktifkan Developer Mode di Discord (Pengaturan > Advanced > Developer Mode)
2. Klik kanan pada channel atau role yang ingin Anda ambil ID-nya
3. Pilih "Copy ID"
4. Tempel ID tersebut ke file `json/config.json`

## Langkah 7: Menjalankan Bot

1. Untuk menjalankan bot dalam mode pengembangan:
   ```bash
   npm run dev
   ```

2. Untuk menjalankan bot dalam mode produksi:
   ```bash
   npm start
   ```

## Langkah 8: Verifikasi Setup

Bot seharusnya akan muncul online di server Discord Anda dan mengirimkan pesan embed ke channel yang telah dikonfigurasi. Bot juga akan menyiapkan sistem join-to-create voice dan ticket system.

## Pemecahan Masalah

Jika Anda mengalami masalah:

1. Pastikan semua ID di file `json/config.json` benar
2. Periksa konsol untuk pesan error
3. Pastikan bot memiliki izin yang cukup di server
4. Pastikan koneksi MongoDB valid

## Kustomisasi Lanjutan

Anda dapat menyesuaikan bot lebih lanjut dengan mengedit:
- `json/embeds.json` untuk mengubah tampilan embed
- `json/messages.json` untuk mengubah pesan yang ditampilkan
- `json/gameRoles.json` untuk menambah/mengurangi game
- `config/config.js` untuk mengubah pengaturan lainnya

## Penggunaan

- **Join to Create Voice**: Pengguna bergabung ke channel voice First Voice atau Second Voice untuk membuat channel voice baru
- **Verifikasi**: Pengguna menekan tombol di channel welcome untuk mendapatkan role verify
- **Custom Role**: Pengguna memilih warna role di channel custom role
- **Game Roles**: Pengguna memilih game role di channel game roles
- **Subscribe**: Pengguna menekan tombol untuk subscribe ke channel streamer
- **Ticket**: Pengguna membuat tiket support dengan menekan tombol di channel ticket 