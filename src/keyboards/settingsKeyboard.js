function groupsKeyboard(groups) {
    return groups.map((group) => [
        {
            text: group.title,
            callback_data: `settings_group:${group.chat_id}`
        }
    ]);
}

function mainSettingsKeyboard() {
    return {
        keyboard: [
            [
                { text: '👋 Приветствие' }
            ],
            [
                { text: '🗑 Служебные сообщения' }
            ],
            [
                { text: '✏️ Запрет редактирования' }
            ]
        ],
        resize_keyboard: true
    };
}

function welcomeKeyboard() {
    return {
        keyboard: [
            [
                { text: 'При входе' }
            ],
            [
                { text: 'При выходе' }
            ],
            [
                { text: '◀️ Назад' },
                { text: '🏠 Главное меню' }
            ]
        ],
        resize_keyboard: true
    };
}

function welcomeJoinKeyboard(enabled) {
    return {
        keyboard: [
            [
                {
                    text: enabled
                        ? '🔴 Выключить'
                        : '🟢 Включить'
                }
            ],
            [
                { text: '⚙️ Настроить' }
            ],
            [
                { text: '◀️ Назад' },
                { text: '🏠 Главное меню' }
            ]
        ],
        resize_keyboard: true
    };
}

function welcomeLeaveKeyboard(enabled) {
    return {
        keyboard: [
            [
                {
                    text: enabled
                        ? '🔴 Выключить'
                        : '🟢 Включить'
                }
            ],
            [
                { text: '⚙️ Настроить' }
            ],
            [
                { text: '◀️ Назад' },
                { text: '🏠 Главное меню' }
            ]
        ],
        resize_keyboard: true
    };
}

function serviceMessagesKeyboard(enabled) {
    return {
        keyboard: [
            [
                {
                    text: enabled
                        ? '🔴 Выключить'
                        : '🟢 Включить'
                }
            ],
            [
                { text: '◀️ Назад' },
                { text: '🏠 Главное меню' }
            ]
        ],
        resize_keyboard: true
    };
}

module.exports = {
    groupsKeyboard,
    mainSettingsKeyboard,
    welcomeKeyboard,
    welcomeJoinKeyboard,
    welcomeLeaveKeyboard,
    serviceMessagesKeyboard
};