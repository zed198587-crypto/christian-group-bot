const crypto = require('crypto');
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

const birthdayRequestRepository =
    require('../database/repositories/birthdayRequestRepository');    

const birthdayRepository =
    require('../database/repositories/birthdayRepository');

const {
    sendBirthdayMenu
} = require('./callbacks');

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

        const text = ctx.message?.text || '';

        const parts = text.trim().split(/\s+/);
        const parameter = parts[1];

        // Переход в настройки конкретной группы
        if (
            parameter &&
            parameter.startsWith('settings_')
        ) {

            const groupId =
                parameter.substring('settings_'.length);

            const group =
                groupRepository.findByChatId(groupId);

            if (!group) {
                await ctx.reply(
                    '❌ Группа не найдена.'
                );

                return;
            }

            // Проверяем, что пользователь действительно создатель
            if (ctx.from.id !== group.owner_id) {
                await ctx.reply(
                    '⛔ У вас нет прав для управления этой группой.'
                );

                return;
            }

            // Создаём сессию непосредственно для этой группы
            sessionRepository.saveSession(
                ctx.chat.id,
                ctx.from.id,
                group.chat_id,
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

        // Переход в регистрацию дня рождения
        if (
            parameter &&
            parameter.startsWith('birthday_')
        ) {

            const requestId =
                parameter.substring('birthday_'.length);

            const request =
                birthdayRequestRepository.findByRequestId(
                    requestId
                );

            if (!request) {
                await ctx.reply(
                    '⚠️ Запрос на регистрацию дня рождения не найден или уже устарел.'
                );

                return;
            }

            const userId = ctx.from.id;
            const groupId = request.group_id;

            // Проверяем, есть ли запись
            let birthday =
                birthdayRepository.findByUserAndGroup(
                    userId,
                    groupId
                );

            // Если записи нет — создаём сразу
            if (!birthday) {

                const firstName =
                    ctx.from.first_name || '';

                const lastName =
                    ctx.from.last_name || '';

                const displayName =
                    `${firstName} ${lastName}`.trim();

                birthdayRepository.create(
                    userId,
                    groupId,
                    displayName
                );

                // Получаем созданную запись
                birthday =
                    birthdayRepository.findByUserAndGroup(
                        userId,
                        groupId
                    );
            }

            // Открываем сессию
            sessionRepository.saveSession(
                ctx.chat.id,
                userId,
                groupId,
                'birthday',
                'main'
            );

            // Удаляем сообщение с кнопкой из группы
            try {
                await bot.api.deleteMessage({
                    chat_id: groupId,
                    message_id: request.message_id
                });
            } catch (error) {
                console.error(
                    'Ошибка удаления сообщения birthday:',
                    error
                );
            }

            // Использованный запрос больше не нужен
            birthdayRequestRepository.deleteByRequestId(
                requestId
            );

            await sendBirthdayMenu(
                bot,
                ctx.chat.id,
                userId,
                groupId
            );

            return;
        }

        // Обычный /start
        await ctx.reply(
            'Привет! Я бот-администратор христианских групп.'
        );
    });

    bot.command('settings', async (ctx) => {

        // /settings работает только в группе
        if (
            ctx.chat?.type !== 'group' &&
            ctx.chat?.type !== 'supergroup'
        ) {
            await ctx.reply(
                '⛔ Запустите команду /settings в группе, которую хотите настроить.'
            );

            return;
        }

        const userId = ctx.from.id;
        const groupId = ctx.chat.id;

        // Удаляем сообщение /settings из группы
        try {
            await bot.api.deleteMessage({
                chat_id: groupId,
                message_id: ctx.message.message_id
            });
        } catch (error) {
            console.error(
                'Ошибка удаления команды /settings:',
                error
            );
        }

        // Ищем зарегистрированную группу
        const group =
            groupRepository.findByChatId(groupId);

        if (!group) {

            await bot.api.sendMessage({
                chat_id: userId,
                text: 'Эта группа не зарегистрирована в боте.'
            });

            return;
        }

        // Проверяем создателя
        if (userId !== group.owner_id) {
            return;
        }

        // Сессию создаём ТОЛЬКО для создателя
        sessionRepository.saveSession(
            userId,
            userId,
            group.chat_id,
            'settings',
            'main'
        );

        // Главное меню отправляем в личный чат
        await bot.api.sendMessage({
            chat_id: userId,
            text:
                `⚙️ Главное меню\n` +
                `Группа «${group.title}»`,
            reply_markup: mainSettingsKeyboard()
        });
    });

    bot.command('birthday', async (ctx) => {

        // /birthday работает только в группе
        if (
            ctx.chat?.type !== 'group' &&
            ctx.chat?.type !== 'supergroup'
        ) {
            await ctx.reply(
                '⛔ Команда /birthday доступна только в группе.'
            );

            return;
        }

        const groupId = ctx.chat.id;

        // Удаляем команду /birthday
        try {
            await bot.api.deleteMessage({
                chat_id: groupId,
                message_id: ctx.message.message_id
            });
        } catch (error) {
            console.error(
                'Ошибка удаления команды /birthday:',
                error
            );
        }

        // Создаём уникальный идентификатор запроса
        const requestId =
            crypto.randomBytes(6).toString('base64url');

        // Ссылка на регистрацию
        const startParameter =
            `birthday_${requestId}`;

        const botUsername =
            'christian_group_admin_bot';

        const message = await ctx.reply(
            '🎂 Регистрация дня рождения',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🎂 Открыть регистрацию',
                                url:
                                    `https://t.me/${botUsername}` +
                                    `?start=${startParameter}`
                            }
                        ]
                    ]
                }
            }
        );

        // Сохраняем контекст запроса
        birthdayRequestRepository.create(
            requestId,
            groupId,
            message.message_id
        );

        console.log(
            'Birthday request:',
            requestId,
            groupId,
            message.message_id
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

        const birthdaySession =
            sessionRepository.findSession(
                ctx.chat.id,
                ctx.from.id,
                'birthday'
            );

        if (
            birthdaySession &&
            birthdaySession.state === 'edit_name'
        ) {

            const displayName =
                (text || '').trim();

            if (!displayName) {
                await ctx.reply(
                    '⚠️ Пожалуйста, введите ваше Имя и Фамилию.'
                );

                return;
            }

            birthdayRepository.updateDisplayName(
                ctx.from.id,
                birthdaySession.group_id,
                displayName
            );

            const groupId =
                birthdaySession.group_id;

            sessionRepository.clearSession(
                ctx.chat.id,
                ctx.from.id,
                'birthday'
            );

            await sendBirthdayMenu(
                ctx,
                ctx.from.id,
                groupId,
                '✅ Сохранено\n\n'
            );

            return;
        }

        if (
            birthdaySession &&
            birthdaySession.state === 'edit_date'
        ) {

            const birthDate =
                (text || '').trim();

            const datePattern =
                /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])$/;

            if (!datePattern.test(birthDate)) {
                await ctx.reply(
                    '⚠️ Неверный формат даты.\n\n' +
                    'Введите дату в формате ДД.ММ.\n' +
                    'Например: 05.03 или 17.11.'
                );

                return;
            }

            birthdayRepository.updateBirthDate(
                ctx.from.id,
                birthdaySession.group_id,
                birthDate
            );

            const groupId =
                birthdaySession.group_id;

            sessionRepository.clearSession(
                ctx.chat.id,
                ctx.from.id,
                'birthday'
            );

            await sendBirthdayMenu(
                ctx,
                ctx.from.id,
                groupId,
                '✅ Сохранено\n\n'
            );

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