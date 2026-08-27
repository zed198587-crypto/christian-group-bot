const {
    registerGroup,
    deactivateGroup
} = require('../services/groupService');

const groupRepository =
    require('../database/repositories/groupRepository');

const {
    applyTemplate
} = require('../utils/templateFormatter');

function registerChatMemberHandler(bot) {
    bot.on('my_chat_member', async (ctx) => {
        const update = ctx.update;

        const chat = update.my_chat_member.chat;
        const oldStatus = update.my_chat_member.old_chat_member.status;
        const newStatus = update.my_chat_member.new_chat_member.status;

        // Нас интересуют только группы и супергруппы
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
            return;
        }

        // Бота добавили в группу
        const botJoined =
            ['left', 'kicked'].includes(oldStatus) &&
            ['member', 'administrator'].includes(newStatus);

        // Бота удалили из группы
        const botLeft =
            ['member', 'administrator'].includes(oldStatus) &&
            ['left', 'kicked'].includes(newStatus);

        try {
            if (botJoined) {
                const group = await registerGroup(bot, chat.id);

                console.log(
                    `Бот подключён к группе "${group.title}" (${chat.id})`
                );
            }

            if (botLeft) {
                await deactivateGroup(chat.id);

                console.log(
                    `Бот отключён от группы "${chat.title}" (${chat.id})`
                );
            }
        } catch (error) {
            console.error(
                `Ошибка обработки группы ${chat.id}:`,
                error
            );
        }
    });

    bot.on('chat_member', async (ctx) => {
        
        const update = ctx.update;

        const memberUpdate = update.chat_member;

        if (!memberUpdate) {
            return;
        }

        const chat = memberUpdate.chat;
        const oldStatus = memberUpdate.old_chat_member.status;
        const newStatus = memberUpdate.new_chat_member.status;
        const user = memberUpdate.new_chat_member.user;

        // Нас интересуют только группы и супергруппы
        if (
            chat.type !== 'group' &&
            chat.type !== 'supergroup'
        ) {
            return;
        }

        // Не обрабатываем самого бота
        if (user.is_bot) {
            return;
        }

        // Пользователь вошёл в группу
        const userJoined =
            ['left', 'kicked'].includes(oldStatus) &&
            ['member', 'administrator'].includes(newStatus);

        const userLeft =
            ['member', 'administrator'].includes(oldStatus) &&
            ['left', 'kicked'].includes(newStatus);

        if (!userJoined && !userLeft) {
            return;
        }

        try {
            const group =
                groupRepository.getWelcomeSettings(
                    chat.id
                );

            if (!group) {
                return;
            }

            let templateJson;
            let enabled;

            if (userJoined) {
                enabled = group.welcome_join_enabled === 1;
                templateJson = group.welcome_join_template;
            }

            if (userLeft) {
                enabled = group.welcome_leave_enabled === 1;
                templateJson = group.welcome_leave_template;
            }

            if (!enabled) {
                return;
            }

            if (!templateJson) {
                return;
            }

            const template =
            JSON.parse(templateJson);

        const formatted =
            applyTemplate(
                template,
                user,
                group
            );

        await bot.api.sendMessage({
            chat_id: chat.id,
            text: formatted.text,
            entities: formatted.entities
        });

        } catch (error) {
            console.error(
                `Ошибка приветствия в группе ${chat.id}:`,
                error
            );
        }
    });
}

module.exports = {
    registerChatMemberHandler
};