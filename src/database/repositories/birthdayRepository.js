const db = require('../db');

function findByUserAndGroup(userId, groupId) {
    return db
        .prepare(`
            SELECT *
            FROM birthdays
            WHERE user_id = ?
              AND group_id = ?
        `)
        .get(userId, groupId);
}

function create(userId, groupId, displayName) {
    return db
        .prepare(`
            INSERT INTO birthdays (
                user_id,
                group_id,
                display_name
            )
            VALUES (?, ?, ?)
        `)
        .run(
            userId,
            groupId,
            displayName
        );
}

function updateDisplayName(
    userId,
    groupId,
    displayName
) {
    return db
        .prepare(`
            UPDATE birthdays
            SET
                display_name = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
              AND group_id = ?
        `)
        .run(
            displayName,
            userId,
            groupId
        );
}

function updateBirthDate(
    userId,
    groupId,
    birthDate
) {
    return db
        .prepare(`
            UPDATE birthdays
            SET
                birth_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
              AND group_id = ?
        `)
        .run(
            birthDate,
            userId,
            groupId
        );
}

function deleteByUserAndGroup(userId, groupId) {
    return db
        .prepare(`
            DELETE FROM birthdays
            WHERE user_id = ?
              AND group_id = ?
        `)
        .run(
            userId,
            groupId
        );
}

module.exports = {
    findByUserAndGroup,
    create,
    updateDisplayName,
    updateBirthDate,
    deleteByUserAndGroup
};