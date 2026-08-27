const groupRepository = require('../database/repositories/groupRepository');
const sessionRepository =
    require('../database/repositories/sessionRepository');

function getOwnedGroups(userId) {
    return groupRepository.findByOwnerId(userId);
}

function prepareSettings(userId, privateChatId) {
    const groups = getOwnedGroups(userId);

    // Сбрасываем предыдущий выбор
    groupRepository.clearSelectedGroups(userId);

    // Запоминаем личный чат владельца
    groupRepository.setPrivateChatId(
        userId,
        privateChatId
    );

    // Если группа только одна —
    // сразу выбираем её
    if (groups.length === 1) {
        groupRepository.selectGroup(
            userId,
            groups[0].chat_id
        );

        return {
            groups,
            selectedGroup: groups[0]
        };
    }

    return {
        groups,
        selectedGroup: null
    };
}

function getSelectedGroup(userId) {
    return groupRepository.findSelectedByOwnerId(userId);
}

function getSettingsContext(chatId, userId) {
    const session =
        sessionRepository.findSettingsSession(
            chatId,
            userId
        );

    if (!session || !session.group_id) {
        return null;
    }

    const group =
        groupRepository.findByChatId(
            session.group_id
        );

    if (!group) {
        return null;
    }

    return {
        session,
        group
    };
}

module.exports = {
    getOwnedGroups,
    prepareSettings,
    getSelectedGroup,
    getSettingsContext
};