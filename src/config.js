require('dotenv').config();

const config = {
    botToken: process.env.BOT_TOKEN
};

if (!config.botToken) {
    throw new Error('BOT_TOKEN не найден в .env');
}

module.exports = config;