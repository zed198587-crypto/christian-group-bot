const groupRepository =
    require('../database/repositories/groupRepository');

const {
    processBirthdayGroup
} = require('./birthdayService');

const DEFAULT_TIMEZONE =
    'Asia/Tashkent';

const BIRTHDAY_HOUR =
    7;

const timers =
    new Map();


function getTimeParts(
    date,
    timezone
) {
    const parts =
        new Intl.DateTimeFormat(
            'en-US',
            {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            }
        ).formatToParts(date);

    const result = {};

    for (const part of parts) {
        if (part.type !== 'literal') {
            result[part.type] = part.value;
        }
    }

    return result;
}


function getNextBirthdayRun(
    timezone
) {
    const now =
        new Date();

    const parts =
        getTimeParts(
            now,
            timezone
        );

    let year =
        Number(parts.year);

    let month =
        Number(parts.month);

    let day =
        Number(parts.day);

    const hour =
        Number(parts.hour);

    if (hour >= BIRTHDAY_HOUR) {
        const nextDay =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day + 1,
                    12
                )
            );

        year =
            nextDay.getUTCFullYear();

        month =
            nextDay.getUTCMonth() + 1;

        day =
            nextDay.getUTCDate();
    }

    /*
     * Находим UTC-время,
     * соответствующее 07:00
     * указанной локальной даты.
     */
    let guess =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                BIRTHDAY_HOUR
            )
        );

    for (let i = 0; i < 3; i++) {

        const actual =
            getTimeParts(
                guess,
                timezone
            );

        const actualAsUtc =
            Date.UTC(
                Number(actual.year),
                Number(actual.month) - 1,
                Number(actual.day),
                Number(actual.hour),
                Number(actual.minute),
                Number(actual.second)
            );

        const targetAsUtc =
            Date.UTC(
                year,
                month - 1,
                day,
                BIRTHDAY_HOUR
            );

        guess =
            new Date(
                guess.getTime() +
                (targetAsUtc - actualAsUtc)
            );
    }

    return guess;
}


function scheduleGroup(
    bot,
    group
) {
    const timezone =
        group.birthday_timezone ||
        DEFAULT_TIMEZONE;

    const nextRun =
        getNextBirthdayRun(
            timezone
        );

    const delay =
        Math.max(
            nextRun.getTime() -
            Date.now(),
            1000
        );


    const oldTimer =
        timers.get(
            group.chat_id
        );

    if (oldTimer) {
        clearTimeout(oldTimer);
    }

    const timer =
        setTimeout(
            async () => {

                try {

                    const freshGroup =
                        groupRepository.findByChatId(
                            group.chat_id
                        );

                    if (
                        freshGroup &&
                        freshGroup.is_active === 1
                    ) {
                        await processBirthdayGroup(
                            bot,
                            freshGroup
                        );
                    }

                } catch (error) {

                    console.error(
                        `Ошибка birthday-задачи ` +
                        `группы ${group.chat_id}:`,
                        error
                    );

                } finally {

                    const updatedGroup =
                        groupRepository.findByChatId(
                            group.chat_id
                        );

                    if (
                        updatedGroup &&
                        updatedGroup.is_active === 1
                    ) {
                        scheduleGroup(
                            bot,
                            updatedGroup
                        );
                    }
                }

            },
            delay
        );

    timers.set(
        group.chat_id,
        timer
    );
}


function startBirthdayScheduler(
    bot
) {
    const groups =
        groupRepository.findBirthdayGroups();


    for (const group of groups) {
        scheduleGroup(
            bot,
            group
        );
    }
}


module.exports = {
    startBirthdayScheduler
};