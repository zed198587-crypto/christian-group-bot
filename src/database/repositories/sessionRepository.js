const db = require('../db');

function findSession(chatId, userId, type) {
    return db
        .prepare(`
            SELECT *
            FROM sessions
            WHERE chat_id = ?
              AND user_id = ?
              AND type = ?
        `)
        .get(chatId, userId, type);
}

function createSession(chatId, userId, groupId, type, state) {
    const result = db
        .prepare(`
            INSERT INTO sessions (
                chat_id,
                user_id,
                group_id,
                type,
                state
            )
            VALUES (?, ?, ?, ?, ?)
        `)
        .run(
            chatId,
            userId,
            groupId,
            type,
            state
        );

    return result.lastInsertRowid;
}

function updateSession(chatId, userId, type, groupId, state) {
    db
        .prepare(`
            UPDATE sessions
            SET
                group_id = ?,
                state = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE chat_id = ?
              AND user_id = ?
              AND type = ?
        `)
        .run(
            groupId,
            state,
            chatId,
            userId,
            type
        );
}

function saveSession(chatId, userId, groupId, type, state) {
    const existing = findSession(
        chatId,
        userId,
        type
    );

    if (existing) {
        updateSession(
            chatId,
            userId,
            type,
            groupId,
            state
        );

        return existing.id;
    }

    return createSession(
        chatId,
        userId,
        groupId,
        type,
        state
    );
}

function updateState(chatId, userId, type, state) {
    db
        .prepare(`
            UPDATE sessions
            SET
                state = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE chat_id = ?
              AND user_id = ?
              AND type = ?
        `)
        .run(
            state,
            chatId,
            userId,
            type
        );
}

function clearSession(chatId, userId, type) {
    db
        .prepare(`
            DELETE FROM sessions
            WHERE chat_id = ?
              AND user_id = ?
              AND type = ?
        `)
        .run(chatId, userId, type);
}

function findSettingsSession(chatId, userId) {
    return db
        .prepare(`
            SELECT *
            FROM sessions
            WHERE chat_id = ?
              AND user_id = ?
              AND type = 'settings'
        `)
        .get(chatId, userId);
}

module.exports = {
    findSession,
    saveSession,
    updateState,
    clearSession,
    findSettingsSession
};