const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Loader utility untuk memuat file konfigurasi dan pesan
 * @module utils/loader
 */

/**
 * Memuat data dari file JSON
 * @param {string} fileName - Nama file JSON yang akan dimuat (tanpa ekstensi)
 * @returns {Object} - Data dari file JSON
 */
function loadJsonFile(fileName) {
  try {
    const filePath = path.join(__dirname, '..', 'json', `${fileName}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`[ERROR] Gagal memuat file ${fileName}.json:`, error);
    return {};
  }
}

/**
 * Mengganti placeholder dalam pesan
 * @param {string} message - Pesan dengan placeholder
 * @param {Object} replacements - Object dengan key-value untuk penggantian
 * @returns {string} - Pesan yang sudah diganti placeholdernya
 */
function formatMessage(message, replacements = {}) {
  let formattedMessage = message;
  for (const [key, value] of Object.entries(replacements)) {
    formattedMessage = formattedMessage.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return formattedMessage;
}

/**
 * Memproses nilai konfigurasi, mengganti string "process.env.X" dengan nilai env sebenarnya
 * @param {*} value - Nilai yang akan diproses
 * @returns {*} - Nilai yang sudah diproses
 */
function processEnvValue(value) {
  if (typeof value === 'string' && value.startsWith('process.env.')) {
    const envKey = value.replace('process.env.', '');
    return process.env[envKey];
  } else if (typeof value === 'object' && value !== null) {
    // Proses objek rekursif
    if (Array.isArray(value)) {
      return value.map(item => processEnvValue(item));
    } else {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = processEnvValue(val);
      }
      return result;
    }
  }
  return value;
}

// Memuat data konfigurasi dan pesan
const configData = loadJsonFile('config');
const messagesData = loadJsonFile('messages');

// Memproses nilai env dalam konfigurasi
const config = processEnvValue(configData);

/**
 * Mendapatkan nilai konfigurasi dari path tertentu
 * @param {string} path - Path ke konfigurasi, dipisahkan dengan titik (contoh: "roles.admin")
 * @param {*} defaultValue - Nilai default jika path tidak ditemukan
 * @returns {*} - Nilai konfigurasi
 */
function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let result = config;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  
  return result;
}

/**
 * Mendapatkan pesan dari kategori dan kunci tertentu
 * @param {string} category - Kategori pesan
 * @param {string} key - Kunci pesan
 * @param {Object} replacements - Penggantian untuk placeholder
 * @returns {string} - Pesan yang sudah diformat
 */
function getMessage(category, key, replacements = {}) {
  if (messagesData[category] && messagesData[category][key]) {
    return formatMessage(messagesData[category][key], replacements);
  }
  return `Message not found: ${category}.${key}`;
}

module.exports = {
  getConfig,
  getMessage,
  loadJsonFile
}; 