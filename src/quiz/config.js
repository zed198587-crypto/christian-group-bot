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
    title: '<b><code>=== ВИКТОРИНА ===</code></b>',
    roundStarted: 'Раунд начат',
    questionTitle: '❓ <b>Вопрос</b>',
    correctAnswer: '✅ Правильно!',
    answerTime: 'Время',
    pointsReceived: 'Баллы',
    correctAnswerBy: 'Ответил',
    noCorrectAnswer: 'Никто не дал правильного ответа.',
    correctAnswerText: 'Правильный ответ:',
    quizAlreadyStarted: 'Викторина уже запущена',
    nextQuestion: 'Следующий вопрос',
    quizStoppedByInactivity: '⏹ Викторина остановлена из-за отсутствия активности.',
    emptyRoundResult: 'Сегодня никто не выиграл',
    quizInfo: '10 вопросов, 2 подсказки и 1 минута на каждый вопрос. '+
    'Для преждевременной остановки игры введите команду /stopquiz.',

    // Символы
    hiddenAnswerSymbol: '__  ',
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