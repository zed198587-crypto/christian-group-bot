const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/quiz.db');

const db = new sqlite3.Database(dbPath);

function initialize() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    correctAnswer TEXT NOT NULL
                )
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.run(`
                    CREATE TABLE IF NOT EXISTS players (
                        userId INTEGER PRIMARY KEY,
                        firstName TEXT NOT NULL DEFAULT '',
                        lastName TEXT NOT NULL DEFAULT '',
                        points INTEGER NOT NULL DEFAULT 0
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    });
}

module.exports = {
    db,
    initialize
};