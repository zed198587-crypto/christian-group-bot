const { db } = require('../db');

function addPoints(userId, firstName, lastName, points) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO players (
                userId,
                firstName,
                lastName,
                points
            )
            VALUES (?, ?, ?, ?)
            ON CONFLICT(userId)
            DO UPDATE SET
                firstName = excluded.firstName,
                lastName = excluded.lastName,
                points = players.points + excluded.points
        `, [userId, firstName, lastName, points], (err) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

function getTop(limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT userId, firstName, lastName, points
            FROM players
            ORDER BY points DESC
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows);
        });
    });
}

module.exports = {
    addPoints,
    getTop
};