const {
    prepareSettings,
    getSelectedGroup,
    getSettingsContext
} = require('../services/ownerService');

const {
    groupsKeyboard,
    mainSettingsKeyboard,
    welcomeKeyboard,
    welcomeJoinKeyboard,
    welcomeLeaveKeyboard,
    serviceMessagesKeyboard
} = require('../keyboards/settingsKeyboard');

const sessionRepository =
    require('../database/repositories/sessionRepository');

const groupRepository =
    require('../database/repositories/groupRepository');

function isPrivateChat(ctx) {
    return ctx.chat?.type === 'private';
}

function isServiceMessage(message) {
    const serviceFields = [
        'new_chat_members',
        'left_chat_member',
        'new_chat_title',
        'new_chat_photo',
        'delete_chat_photo',
        'group_chat_created',
        'supergroup_chat_created',
        'channel_chat_created',
        'migrate_to_chat_id',
        'migrate_from_chat_id',
        'pinned_message',
        'new_chat_owner',
        'forum_topic_created',
        'forum_topic_edited',
        'forum_topic_closed',
        'forum_topic_reopened',
        'general_forum_topic_hidden',
        'general_forum_topic_unhidden',
        'write_access_allowed',
        'video_chat_scheduled',
        'video_chat_started',
        'video_chat_ended',
        'video_chat_participants_invited',
        'boost_added',
        'chat_background_set'
    ];

    return serviceFields.some(
        field => message[field] !== undefined
    );
}

function registerCommands(bot) {

    bot.command('start', async (ctx) => {
        if (!isPrivateChat(ctx)) {
            return;
        }

        await ctx.reply(
            'Привет! Я бот-администратор христианских групп.'
        );
    });

    bot.command('settings', async (ctx) => {
        if (!isPrivateChat(ctx)) {
            return;
        }

        const userId = ctx.from.id;
        const privateChatId = ctx.chat.id;

        const {
            groups,
            selectedGroup
        } = prepareSettings(
            userId,
            privateChatId
        );

        if (groups.length === 0) {
            await ctx.reply(
                'У вас нет групп, которыми вы можете управлять.'
            );

            return;
        }

        if (selectedGroup) {

            sessionRepository.saveSession(
                privateChatId,
                userId,
                selectedGroup.chat_id,
                'settings',
                'main'
            );

            await ctx.reply(
                `⚙️ Главное меню\nГруппа «${selectedGroup.title}»`,
                {
                    reply_markup: mainSettingsKeyboard()
                }
            );

            return;
        }

        sessionRepository.saveSession(
            privateChatId,
            userId,
            null,
            'settings',
            'selecting_group'
        );

        await ctx.reply(
            'Выберите группу для настройки:',
            {
                reply_markup: {
                    inline_keyboard: groupsKeyboard(groups)
                }
            }
        );
    });

    bot.on('message', async (ctx) => {

        const message = ctx.message;
        const text = message?.text;

        const session = sessionRepository.findSettingsSession(
            ctx.chat.id,
            ctx.from.id
        );

        if (text === '◀️ Назад') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            if (
                session.state === 'welcome_join' ||
                session.state === 'welcome_leave'
            ) {
                sessionRepository.updateState(
                    ctx.chat.id,
                    ctx.from.id,
                    'settings',
                    'welcome'
                );

                await ctx.reply(
                    `👋 Приветствие\nГруппа «${group.title}»`,
                    {
                        reply_markup: welcomeKeyboard()
                    }
                );

                return;
            }

            if (session.state === 'service_messages') {

                sessionRepository.updateState(
                    ctx.chat.id,
                    ctx.from.id,
                    'settings',
                    'main'
                );

                await ctx.reply(
                    `⚙️ Главное меню\nГруппа «${group.title}»`,
                    {
                        reply_markup: mainSettingsKeyboard()
                    }
                );

                return;
            }

            if (session.state === 'welcome') {

                sessionRepository.updateState(
                    ctx.chat.id,
                    ctx.from.id,
                    'settings',
                    'main'
                );

                await ctx.reply(
                    `⚙️ Главное меню\nГруппа «${group.title}»`,
                    {
                        reply_markup: mainSettingsKeyboard()
                    }
                );

                return;
            }
        }

        if (text === '🏠 Главное меню') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                'main'
            );

            await ctx.reply(
                `⚙️ Главное меню\nГруппа «${group.title}»`,
                {
                    reply_markup: mainSettingsKeyboard()
                }
            );

            return;
        }
        
        // Служебные сообщения группы
        if (
            message &&
            (
                message.chat.type === 'group' ||
                message.chat.type === 'supergroup'
            )
        ) {
            const group =
                groupRepository.findByChatId(message.chat.id);

            if (
                group &&
                group.service_messages_enabled === 1 &&
                isServiceMessage(message)
            ) {
                try {
                    await bot.api.deleteMessage({
                        chat_id: message.chat.id,
                        message_id: message.message_id
                    });
                } catch (error) {
                    console.error(
                        `Ошибка удаления служебного сообщения ` +
                        `в группе ${message.chat.id}:`,
                        error
                    );
                }
            }

            return;
        }

        // Остальная логика работает только в личном чате
        if (!isPrivateChat(ctx)) {
            return;
        }



        if (
            session &&
            (
                session.state === 'welcome_join_edit' ||
                session.state === 'welcome_leave_edit'
            )
        ) {
            const group = groupRepository.findByChatId(
                session.group_id
            );

            if (!group) {
                await ctx.reply(
                    'Не удалось найти группу.'
                );

                return;
            }

            const template = {
                text: ctx.message.text || '',
                entities: ctx.message.entities || []
            };

            const isJoin =
                session.state === 'welcome_join_edit';

            if (isJoin) {
                groupRepository.setWelcomeJoinTemplate(
                    session.group_id,
                    JSON.stringify(template)
                );
            } else {
                groupRepository.setWelcomeLeaveTemplate(
                    session.group_id,
                    JSON.stringify(template)
                );
            }

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                isJoin
                    ? 'welcome_join'
                    : 'welcome_leave'
            );

            // Показываем сохранённое приветствие
            await ctx.reply(
                template.text,
                {
                    entities: template.entities
                }
            );

            // Подтверждаем сохранение
            await ctx.reply(
                '✅ Приветствие сохранено.',
                {
                    reply_markup: isJoin
                        ? welcomeJoinKeyboard(
                            group.welcome_join_enabled === 1
                        )
                        : welcomeLeaveKeyboard(
                            group.welcome_leave_enabled === 1
                        )
                }
            );

            return;
        }

        if (text === '👋 Приветствие') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            await ctx.reply(
                `👋 Приветствие\nГруппа «${group.title}»`,
                {
                    reply_markup: welcomeKeyboard()
                }
            );

            return;
        }

        if (text === 'При входе') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                'welcome_join'
            );

            await ctx.reply(
                `👋 При входе\nГруппа «${group.title}»`,
                {
                    reply_markup: welcomeJoinKeyboard(
                        group.welcome_join_enabled === 1
                    )
                }
            );

            return;
        }

        if (text === 'При выходе') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                'welcome_leave'
            );

            await ctx.reply(
                `👋 При выходе\nГруппа «${group.title}»`,
                {
                    reply_markup: welcomeLeaveKeyboard(
                        group.welcome_leave_enabled === 1
                    )
                }
            );

            return;
        }

            if (
                text === '🟢 Включить' ||
                text === '🔴 Выключить'
            ) {
                const context = getSettingsContext(
                    ctx.chat.id,
                    ctx.from.id
                );

                if (!context) {
                    await ctx.reply(
                        'Сессия настроек не найдена. Откройте /settings заново.'
                    );

                    return;
                }

                const { group } = context;
                const enabled = text === '🟢 Включить';


                if (session.state === 'service_messages') {

                    groupRepository.setServiceMessagesEnabled(
                        group.chat_id,
                        enabled
                    );

                    await ctx.reply(
                        `🗑 Служебные сообщения\n` +
                        `Группа «${group.title}»\n\n` +
                        `Удаление служебных сообщений ` +
                        `${enabled ? 'включено' : 'выключено'}.`,
                        {
                            reply_markup: serviceMessagesKeyboard(enabled)
                        }
                    );

                    return;
                }
                
                if (session.state === 'welcome_join') {
                    groupRepository.setWelcomeJoinEnabled(
                        group.chat_id,
                        enabled
                    );

                    await ctx.reply(
                        `👋 При входе\nГруппа «${group.title}»\n\n` +
                        `Приветствие ${enabled ? 'включено' : 'выключено'}.`,
                        {
                            reply_markup: welcomeJoinKeyboard(enabled)
                        }
                    );

                    return;
                }

                if (session.state === 'welcome_leave') {
                    groupRepository.setWelcomeLeaveEnabled(
                        group.chat_id,
                        enabled
                    );

                    await ctx.reply(
                        `👋 При выходе\nГруппа «${group.title}»\n\n` +
                        `Приветствие ${enabled ? 'включено' : 'выключено'}.`,
                        {
                            reply_markup: welcomeLeaveKeyboard(enabled)
                        }
                    );

                    return;
                }
            }

        if (text === '⚙️ Настроить') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            if (
                session.state !== 'welcome_join' &&
                session.state !== 'welcome_leave'
            ) {
                return;
            }

            const isJoin =
                session.state === 'welcome_join';

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                isJoin
                    ? 'welcome_join_edit'
                    : 'welcome_leave_edit'
            );

            await ctx.reply(
                `⚙️ Настройка приветствия\n\n` +
                `Группа «${group.title}»\n\n` +
                `Отправьте текст приветствия.\n\n` +
                `Доступные поля:\n` +
                `{name} — имя\n` +
                `{surname} — фамилия\n` +
                `{group} — название группы\n\n` +
                `Можно использовать форматирование Telegram: ` +
                `жирный, курсив, ссылки и т. д.`
            );

            return;
        }

        if (text === '🗑 Служебные сообщения') {

            const context = getSettingsContext(
                ctx.chat.id,
                ctx.from.id
            );

            if (!context) {
                await ctx.reply(
                    'Сессия настроек не найдена. Откройте /settings заново.'
                );

                return;
            }

            const { group } = context;

            sessionRepository.updateState(
                ctx.chat.id,
                ctx.from.id,
                'settings',
                'service_messages'
            );

            await ctx.reply(
                `🗑 Служебные сообщения\nГруппа «${group.title}»`,
                {
                    reply_markup: serviceMessagesKeyboard(
                        group.service_messages_enabled === 1
                    )
                }
            );

            return;
        }
    });
}

module.exports = {
    registerCommands
};