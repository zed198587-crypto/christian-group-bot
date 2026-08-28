module.exports = {
    // Количество вопросов
    questionsPerRound: 10,

    // Тайминги, секунды
    introDelay: 5,
    roundStartDelay: 2,
    hint1: 25,
    hint2: 40,
    hint3: 50,
    timeout: 60,
    nextQuestionDelay: 1,
    pauseBetweenQuestions: 2,

    // Тексты
    title: '=== ВИКТОРИНА ===',
    roundStarted: 'Раунд начат',
    questionTitle: 'Вопрос',
    correctAnswer: '✅ Правильно!',
    answerTime: 'Время',
    pointsReceived: 'Баллы',
    correctAnswerBy: 'Ответил',
    noCorrectAnswer: 'Никто не дал правильного ответа.',
    correctAnswerText: 'Правильный ответ:',
    quizAlreadyStarted: 'Викторина уже запущена',
    nextQuestion: 'Следующий вопрос',
    quizStoppedByInactivity: '⏹ Викторина остановлена из-за отсутствия активности.',

    // Символы
    hiddenAnswerSymbol: '#',
    progressFilledSymbol: '*',
    progressEmptySymbol: '-',

    // Progress bar
    progressBarLength: 16,

    // Баллы
    points: {
        full: 10,
        hint1: 7,
        hint2: 5,
        hint3: 3
    },

    // Подсказки
    hints: {
        hint2: 0.30,
        hint3: 0.50
    }
};