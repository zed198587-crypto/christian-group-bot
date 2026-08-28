const { Bot } = require('node-telegram-bot-api');
const config = require('./config');
const { registerCommands } = require('./handlers/commands');

const {
    registerChatMemberHandler
} = require('./handlers/chatMember');

const {
    registerCallbacks
} = require('./handlers/callbacks');

const {
    startBirthdayScheduler
} = require('./services/birthdayScheduler');

const {
    registerQuiz
} = require('./quiz/registerQuiz');

require('./database/db');

const bot = new Bot(config.botToken);

registerQuiz(bot);
registerCommands(bot);
registerCallbacks(bot);
registerChatMemberHandler(bot);


bot.startPolling(null, {
    allowedUpdates: [
        'message',
        'callback_query',
        'my_chat_member',
        'chat_member'
    ]
});

console.log('Бот запущен');

startBirthdayScheduler(bot);
