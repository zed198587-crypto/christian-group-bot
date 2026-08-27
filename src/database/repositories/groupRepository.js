const db = require('../db');

function findByChatId(chatId) {
    return db
        .prepare('SELECT * FROM groups WHERE chat_id = ?')
        .get(chatId);
}

function findByOwnerId(ownerId) {
    return db
        .prepare(`
            SELECT *
            FROM groups
            WHERE owner_id = ?
              AND is_active = 1
        `)
        .all(ownerId);
}

function findSelectedByOwnerId(ownerId) {
    return db
        .prepare(`
            SELECT *
            FROM groups
            WHERE owner_id = ?
              AND is_active = 1
              AND is_selected = 1
            LIMIT 1
        `)
        .get(ownerId);
}

function createGroup(chatId, title, ownerId, privateChatId) {
    const result = db
        .prepare(`
            INSERT INTO groups (
                chat_id,
                title,
                owner_id,
                private_chat_id
            )
            VALUES (?, ?, ?, ?)
        `)
        .run(
            chatId,
            title,
            ownerId,
            privateChatId
        );

    return result.lastInsertRowid;
}

function updateGroup(chatId, title, ownerId, privateChatId) {
    db
        .prepare(`
            UPDATE groups
            SET
                title = ?,
                owner_id = ?,
                private_chat_id = ?,
                is_active = 1
            WHERE chat_id = ?
        `)
        .run(
            title,
            ownerId,
            privateChatId,
            chatId
        );
}

function setPrivateChatId(ownerId, privateChatId) {
    db
        .prepare(`
            UPDATE groups
            SET private_chat_id = ?
            WHERE owner_id = ?
        `)
        .run(privateChatId, ownerId);
}

function selectGroup(ownerId, groupChatId) {
    const transaction = db.transaction(() => {

        db
            .prepare(`
                UPDATE groups
                SET is_selected = 0
                WHERE owner_id = ?
            `)
            .run(ownerId);

        db
            .prepare(`
                UPDATE groups
                SET is_selected = 1
                WHERE owner_id = ?
                  AND chat_id = ?
                  AND is_active = 1
            `)
            .run(ownerId, groupChatId);
    });

    transaction();
}

function deactivateGroup(chatId) {
    db
        .prepare(`
            UPDATE groups
            SET
                is_active = 0,
                is_selected = 0
            WHERE chat_id = ?
        `)
        .run(chatId);
}

function clearSelectedGroups(ownerId) {
    db
        .prepare(`
            UPDATE groups
            SET is_selected = 0
            WHERE owner_id = ?
        `)
        .run(ownerId);
}

function setWelcomeJoinEnabled(groupId, enabled) {
    db
        .prepare(`
            UPDATE groups
            SET welcome_join_enabled = ?
            WHERE chat_id = ?
        `)
        .run(enabled ? 1 : 0, groupId);
}

function setWelcomeJoinTemplate(chatId, template) {
    db
        .prepare(`
            UPDATE groups
            SET welcome_join_template = ?
            WHERE chat_id = ?
        `)
        .run(template, chatId);
}

function setWelcomeLeaveEnabled(chatId, enabled) {
    db
        .prepare(`
            UPDATE groups
            SET welcome_leave_enabled = ?
            WHERE chat_id = ?
        `)
        .run(enabled ? 1 : 0, chatId);
}

function getWelcomeJoinTemplate(chatId) {
    return db
        .prepare(`
            SELECT
                welcome_join_enabled,
                welcome_join_template,
                title
            FROM groups
            WHERE chat_id = ?
              AND is_active = 1
        `)
        .get(chatId);
}

function setWelcomeLeaveTemplate(chatId, template) {
    db
        .prepare(`
            UPDATE groups
            SET welcome_leave_template = ?
            WHERE chat_id = ?
        `)
        .run(template, chatId);
}

function getWelcomeSettings(chatId) {
    return db
        .prepare(`
            SELECT
                title,
                welcome_join_enabled,
                welcome_join_template,
                welcome_leave_enabled,
                welcome_leave_template
            FROM groups
            WHERE chat_id = ?
              AND is_active = 1
        `)
        .get(chatId);
}

function setServiceMessagesEnabled(chatId, enabled) {
    db
        .prepare(`
            UPDATE groups
            SET service_messages_enabled = ?
            WHERE chat_id = ?
        `)
        .run(enabled ? 1 : 0, chatId);
}

module.exports = {
    findByChatId,
    findByOwnerId,
    findSelectedByOwnerId,
    clearSelectedGroups,
    createGroup,
    updateGroup,
    setPrivateChatId,
    selectGroup,
    deactivateGroup,
    setWelcomeJoinEnabled,
    setWelcomeJoinTemplate,
    getWelcomeJoinTemplate,
    setWelcomeLeaveEnabled,
    setWelcomeLeaveTemplate,
    getWelcomeSettings,
    setServiceMessagesEnabled
};