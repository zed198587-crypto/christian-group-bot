const QuizManager = require('./QuizManager');

function registerQuiz(bot) {
    const quizManager = new QuizManager(bot);

    bot.command('quiz', async (ctx) => {
        if (
            ctx.chat?.type !== 'group' &&
            ctx.chat?.type !== 'supergroup'
        ) {
            await ctx.reply(
                '⛔ Викторина доступна только в группе.'
            );

            return;
        }


        await quizManager.startQuiz(ctx);
    });

    bot.command('stopquiz', async (ctx) => {
        const chatId = ctx.chatId;

        const session = quizManager.get(chatId);

        if (!session) {
            return;
        }

        await session.finishRound();
    });

    bot.on('message', async (ctx, next) => {
        const chatId = ctx.chatId;

        const session = quizManager.get(chatId);

        if (!session) {
            return next();
        }

        session.handleMessage(ctx);
    });
}

module.exports = {
    registerQuiz
};