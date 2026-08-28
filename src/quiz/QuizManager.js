const QuizSession = require('./QuizSession');
const questionRepository = require('./database/repositories/questionRepository');
const config = require('./config');

class QuizManager {
    constructor(bot) {
        this.bot = bot;
        this.sessions = new Map();
    }

    has(chatId) {
        return this.sessions.has(chatId);
    }

    get(chatId) {
        return this.sessions.get(chatId);
    }

    add(chatId, session) {
        this.sessions.set(chatId, session);
    }

    remove(chatId) {
        this.sessions.delete(chatId);
    }

    async startQuiz(ctx) {
        const chatId = ctx.chatId;
      
        if (this.has(chatId)) {
            await ctx.reply(config.quizAlreadyStarted);
            return this.get(chatId);
        }

        const questions = await questionRepository.getRandomQuestions(
            config.questionsPerRound
        );

        const session = new QuizSession(
            chatId,
            questions,
            ctx
        );

        this.add(chatId, session);

        session.finished.then(() => {
            this.remove(chatId);
        });

        session.start();

        return session;
    }
}

module.exports = QuizManager;