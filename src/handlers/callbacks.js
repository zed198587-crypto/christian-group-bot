const groupRepository = require('../database/repositories/groupRepository');

const {
    mainSettingsKeyboard
} = require('../keyboards/settingsKeyboard');

const sessionRepository =
    require('../database/repositories/sessionRepository');

function registerCallbacks(bot) {

    bot.on('callback_query', async (ctx) => {
        const data = ctx.callbackQuery.data;

        if (!data || !data.startsWith('settings_group:')) {
            return;
        }

        await ctx.answerCallbackQuery();

        const chatId = data.split(':')[1];

        const group = groupRepository.findByChatId(chatId);

            if (!group) {
                await ctx.reply(
                    'Не удалось найти выбранную группу.'
                );

                return;
            }

            const ownerId = ctx.from.id;

            const ownedGroups = groupRepository.findByOwnerId(ownerId);

            const ownsGroup = ownedGroups.some(
                (item) => item.chat_id === group.chat_id
            );

            if (!ownsGroup) {
                await ctx.reply(
                    'У вас нет прав для настройки этой группы.'
                );

                return;
            }

            groupRepository.selectGroup(
                ownerId,
                group.chat_id
            );

            sessionRepository.saveSession(
                ctx.chat.id,
                ownerId,
                group.chat_id,
                'settings',
                'main'
            );

        await bot.api.deleteMessage({
            chat_id: ctx.chat.id,
            message_id: ctx.callbackQuery.message.message_id
        });

        await ctx.reply(
            `⚙️ Главное меню\nГруппа «${group.title}»`,
            {
                reply_markup: mainSettingsKeyboard()
            }
        );
    });
}

module.exports = {
    registerCallbacks
};