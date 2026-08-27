const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/bot.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);

const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema);

const columns = db
    .prepare('PRAGMA table_info(groups)')
    .all()
    .map(column => column.name);

if (!columns.includes('private_chat_id')) {
    db.exec(`
        ALTER TABLE groups
        ADD COLUMN private_chat_id INTEGER
    `);
}

if (!columns.includes('is_selected')) {
    db.exec(`
        ALTER TABLE groups
        ADD COLUMN is_selected INTEGER NOT NULL DEFAULT 0
    `);
}

console.log('База данных подключена');

module.exports = db;