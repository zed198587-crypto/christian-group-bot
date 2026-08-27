CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    private_chat_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_selected INTEGER NOT NULL DEFAULT 0,

    welcome_join_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_join_template TEXT,

    welcome_leave_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_leave_template TEXT,

    service_messages_enabled INTEGER NOT NULL DEFAULT 0,

    edit_protection_enabled INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    user_id INTEGER,
    group_id INTEGER,
    type TEXT NOT NULL,
    state TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(chat_id, user_id, type)
);