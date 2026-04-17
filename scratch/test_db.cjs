const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'public/data/cards.sqlite');
const db = new Database(dbPath);

console.log(db.prepare("PRAGMA table_info(cards)").all());
