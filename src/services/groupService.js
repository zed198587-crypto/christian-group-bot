const groupRepository = require('../database/repositories/groupRepository');

async function registerGroup(bot, chatId) {
    const chat = await bot.api.getChat({
        chat_id: chatId
    });

    const administrators = await bot.api.getChatAdministrators({
        chat_id: chatId
    });

    const owner = administrators.find(
        (admin) => admin.status === 'creator'
    );

    if (!owner) {
        throw new Error(
            `Не удалось определить создателя группы ${chatId}`
        );
    }

    const existingGroup = groupRepository.findByChatId(chatId);

    if (existingGroup) {
        groupRepository.updateGroup(
            chatId,
            chat.title,
            owner.user.id
        );

        return {
            ...existingGroup,
            title: chat.title,
            owner_id: owner.user.id,
            is_active: 1
        };
    }

    const id = groupRepository.createGroup(
        chatId,
        chat.title,
        owner.user.id
    );

    return {
        id,
        chat_id: chatId,
        title: chat.title,
        owner_id: owner.user.id,
        is_active: 1
    };
}

async function deactivateGroup(chatId) {
    groupRepository.deactivateGroup(chatId);
}

module.exports = {
    registerGroup,
    deactivateGroup
};