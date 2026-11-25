
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Membuat folder database otomatis
const databaseFolder = path.join(__dirname, "../../data");

if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
}

// Membuat koneksi database
const db = new Database(
    path.join(databaseFolder, "joki.db")
);

// Pengaturan SQLite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ======================================
// TABEL GAMES
// ======================================

db.exec(`
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

try {
    db.exec(`ALTER TABLE games ADD COLUMN custom_text TEXT`);
} catch {
    // Abaikan jika kolom custom_text sudah ada
}

try {
    db.exec(`ALTER TABLE games ADD COLUMN channel_id TEXT`);
} catch {}

try {
    db.exec(`ALTER TABLE games ADD COLUMN header_message_id TEXT`);
} catch {}

// ======================================
// TABEL SERVICES
// ======================================

db.exec(`
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        unit TEXT DEFAULT '',
        status TEXT DEFAULT 'Tersedia',
        is_hot INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
    );
`);

// ======================================
// TABEL PENGATURAN KATALOG
// ======================================

db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        channel_id TEXT NOT NULL,
        header_message_id TEXT NOT NULL
    );
`);

// ======================================
// TABEL PESAN KATALOG GAME
// ======================================

db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_game_messages (
        game_id INTEGER NOT NULL,
        part INTEGER NOT NULL,
        message_id TEXT NOT NULL,

        PRIMARY KEY (game_id, part),

        FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
    );
`);


console.log("Database berhasil terhubung!");

module.exports = db;
