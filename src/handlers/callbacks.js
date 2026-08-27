const groupRepository = require('../database/repositories/groupRepository');

const {
    mainSettingsKeyboard
} = require('../keyboards/settingsKeyboard');

const sessionRepository =
    require('../database/repositories/sessionRepository');

const birthdayRepository =
    require('../database/repositories/birthdayRepository');

async function sendBirthdayMenu(
    ctx,
    userId,
    groupId,
    messagePrefix = ''
) {
    const birthday =
        birthdayRepository.findByUserAndGroup(
            userId,
            groupId
        );

    if (!birthday) {
        return;
    }

    const displayName =
        birthday.display_name || 'не указано';

    const birthDate =
        birthday.birth_date || 'не установлена';

    await ctx.reply(
        `${messagePrefix}` +
        `🎂 Ваши данные\n\n` +
        `Вас зовут: ${displayName}\n` +
        `Дата рождения: ${birthDate}\n\n` +
        `Что вы хотите изменить?`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✏️ Изменить обращение',
                            callback_data:
                                `birthday_edit_name:${groupId}`
                        }
                    ],
                    [
                        {
                            text: '📅 Изменить дату',
                            callback_data:
                                `birthday_edit_date:${groupId}`
                        }
                    ],
                    [
                        {
                            text: '🗑 Удалить поздравление',
                            callback_data:
                                `birthday_delete:${groupId}`
                        }
                    ]
                ]
            }
        }
    );
}

    function registerCallbacks(bot) {

    bot.on('callback_query', async (ctx) => {

        const data = ctx.callbackQuery.data;

        if (!data) {
            return;
        }

        // =========================
        // ДЕНЬ РОЖДЕНИЯ
        // =========================
        
        if (data === 'birthday_name_yes') {

            await ctx.answerCallbackQuery();

            const session =
                sessionRepository.findSession(
                    ctx.chat.id,
                    ctx.from.id,
                    'birthday'
                );

            if (!session) {
                await bot.api.editMessageText({
                    chat_id: ctx.chat.id,
                    message_id:
                        ctx.callbackQuery.message.message_id,
                    text: '⚠️ Сессия регистрации не найдена.'
                });

                return;
            }

            const firstName =
                ctx.from.first_name || '';

            const lastName =
                ctx.from.last_name || '';

            const displayName =
                `${firstName} ${lastName}`.trim();

            birthdayRepository.create(
                ctx.from.id,
                session.group_id,
                displayName
            );

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'birthday',
                'date'
            );

            await bot.api.editMessageText({
                chat_id: ctx.chat.id,
                message_id:
                    ctx.callbackQuery.message.message_id,
                text:
                    '📅 Введите дату рождения в формате ДД.ММ.\n\n' +
                    'Для чисел от 1 до 9 используйте ведущий ноль: ' +
                    '01.03, 07.11 и т. п.'
            });

            return;
        }

        if (data.startsWith('birthday_edit_name:')) {

            await ctx.answerCallbackQuery();

            const groupId =
                data.substring('birthday_edit_name:'.length);

            let session =
                sessionRepository.findSession(
                    ctx.chat.id,
                    ctx.from.id,
                    'birthday'
                );

            if (!session) {

                sessionRepository.saveSession(
                    ctx.chat.id,
                    ctx.from.id,
                    groupId,
                    'birthday',
                    'edit_name'
                );

            } else {

                sessionRepository.updateState(
                    ctx.chat.id,
                    ctx.from.id,
                    'birthday',
                    'edit_name'
                );
            }

            await bot.api.editMessageText({
                chat_id: ctx.chat.id,
                message_id:
                    ctx.callbackQuery.message.message_id,
                text:
                    '✏️ Введите ваше Имя и Фамилию.'
            });

            return;
        }

        if (data.startsWith('birthday_edit_date:')) {

            await ctx.answerCallbackQuery();

            const groupId =
                data.substring('birthday_edit_date:'.length);

            let session =
                sessionRepository.findSession(
                    ctx.chat.id,
                    ctx.from.id,
                    'birthday'
                );

            if (!session) {

                sessionRepository.saveSession(
                    ctx.chat.id,
                    ctx.from.id,
                    groupId,
                    'birthday',
                    'edit_date'
                );

            } else {

                sessionRepository.updateState(
                    ctx.chat.id,
                    ctx.from.id,
                    'birthday',
                    'edit_date'
                );
            }

            await bot.api.editMessageText({
                chat_id: ctx.chat.id,
                message_id:
                    ctx.callbackQuery.message.message_id,
                text:
                    '📅 Введите дату рождения в формате ДД.ММ.\n\n' +
                    'Для чисел от 1 до 9 используйте ведущий ноль: ' +
                    '01.03, 07.11 и т. п.'
            });

            return;
        }


        if (data.startsWith('birthday_delete:')) {

            await ctx.answerCallbackQuery();

            const groupId =
                data.substring('birthday_delete:'.length);

            birthdayRepository.deleteByUserAndGroup(
                ctx.from.id,
                groupId
            );

            sessionRepository.clearSession(
                ctx.chat.id,
                ctx.from.id,
                'birthday'
            );

            await bot.api.editMessageText({
                chat_id: ctx.chat.id,
                message_id:
                    ctx.callbackQuery.message.message_id,
                text:
                    '✅ Поздравление с днём рождения отключено.'
            });

            return;
        }

        if (data === 'birthday_cancel') {

            await ctx.answerCallbackQuery();

            sessionRepository.clearSession(
                ctx.chat.id,
                ctx.from.id,
                'birthday'
            );

            await bot.api.deleteMessage({
                chat_id: ctx.chat.id,
                message_id: ctx.callbackQuery.message.message_id
            });

            return;
        }

        // =========================
        // НАСТРОЙКИ ГРУППЫ
        // =========================

        if (!data.startsWith('settings_group:')) {
            return;
        }

        await ctx.answerCallbackQuery();

        const chatId = data.split(':')[1];

        const group =
            groupRepository.findByChatId(chatId);

        if (!group) {
            await ctx.reply(
                'Не удалось найти выбранную группу.'
            );

            return;
        }

        const ownerId = ctx.from.id;

        const ownedGroups =
            groupRepository.findByOwnerId(ownerId);

        const ownsGroup =
            ownedGroups.some(
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
            message_id:
                ctx.callbackQuery.message.message_id
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
    registerCallbacks,
    sendBirthdayMenu
};