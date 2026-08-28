const { db, initialize } = require('./db');

const questions = [
    {
        text: 'Как звали первого человека согласно Библии?',
        correctAnswer: 'АДАМ'
    },
    {
        text: 'Кто построил ковчег?',
        correctAnswer: 'НОЙ'
    },
    {
        text: 'Сколько дней длился потоп?',
        correctAnswer: '40'
    },
    {
        text: 'Кто вывел израильтян из Египта?',
        correctAnswer: 'МОИСЕЙ'
    },
    {
        text: 'Как звали мать Иисуса?',
        correctAnswer: 'МАРИЯ'
    },
    {
        text: 'В каком городе родился Иисус?',
        correctAnswer: 'ВИФЛЕЕМ'
    },
    {
        text: 'Кто крестил Иисуса?',
        correctAnswer: 'ИОАНН КРЕСТИТЕЛЬ'
    },
    {
        text: 'Какой ученик трижды отрёкся от Иисуса?',
        correctAnswer: 'ПЕТР'
    },
    {
        text: 'Кто предал Иисуса?',
        correctAnswer: 'ИУДА'
    },
    {
        text: 'На какой горе Моисей получил десять заповедей?',
        correctAnswer: 'СИНАЙ'
    }
];

async function seed() {
    await initialize();

    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT INTO questions (text, correctAnswer)
            VALUES (?, ?)
        `);

        for (const question of questions) {
            stmt.run(question.text, question.correctAnswer);
        }

        stmt.finalize(() => {
            console.log(`Added ${questions.length} test questions`);

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                    process.exit(1);
                }
            });
        });
    });
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    db.close();
});