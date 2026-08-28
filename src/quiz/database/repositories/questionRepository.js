const { db } = require('../db');

function getRandomQuestions(count) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT id, text, correctAnswer
            FROM questions
            ORDER BY RANDOM()
            LIMIT ?
        `, [count], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows);
        });
    });
}

module.exports = {
    getRandomQuestions
};