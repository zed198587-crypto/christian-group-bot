const db = require('../db');

function create(requestId, groupId, messageId) {
    db.prepare(`
        INSERT INTO birthday_requests (
            request_id,
            group_id,
            message_id
        )
        VALUES (?, ?, ?)
    `).run(
        requestId,
        groupId,
        messageId
    );
}

function findByRequestId(requestId) {
    return db.prepare(`
        SELECT *
        FROM birthday_requests
        WHERE request_id = ?
    `).get(requestId);
}

function deleteByRequestId(requestId) {
    db.prepare(`
        DELETE FROM birthday_requests
        WHERE request_id = ?
    `).run(requestId);
}

module.exports = {
    create,
    findByRequestId,
    deleteByRequestId
};