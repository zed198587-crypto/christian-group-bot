const birthdayRepository =
    require('../database/repositories/birthdayRepository');

const groupRepository =
    require('../database/repositories/groupRepository');

async function processBirthdayGroup(
    bot,
    group
) {
    const timezone =
        group.birthday_timezone || 'Asia/Tashkent';

    const now =
        new Date();

    const today =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        ).format(now);

    const birthdayDateParts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone: timezone,
                day: '2-digit',
                month: '2-digit'
            }
        ).formatToParts(now);

    const day =
        birthdayDateParts.find(
            part => part.type === 'day'
        ).value;

    const month =
        birthdayDateParts.find(
            part => part.type === 'month'
        ).value;

    const birthdayDate =
        `${day}.${month}`;

    console.log(
        `Birthday check: ${group.title} ` +
        `(${timezone}) ${today} ${birthdayDate}`
    );

    if (
        group.birthday_last_run_date === today
    ) {
        return;
    }

    const birthdays =
        birthdayRepository.findByBirthDate(
            birthdayDate,
            today
        );

    for (const birthday of birthdays) {

        try {

            await bot.api.sendMessage({
                chat_id: group.chat_id,
                text: `🎂 Поздравляем, ${birthday.display_name}!`
            });

            birthdayRepository.markCongratulated(
                birthday.id,
                today
            );

            console.log(
                `Birthday sent: ${birthday.display_name} ` +
                `(${birthday.user_id})`
            );

        } catch (error) {

            console.error(
                `Ошибка отправки поздравления ` +
                `${birthday.user_id}:`,
                error
            );
        }
    }

    groupRepository.setBirthdayLastRunDate(
        group.chat_id,
        today
    );
}

async function processBirthdays(bot) {

    const groups =
        groupRepository.findBirthdayGroups();

    for (const group of groups) {

        try {
            await processBirthdayGroup(
                bot,
                group
            );
        } catch (error) {

            console.error(
                `Ошибка обработки дней рождения ` +
                `группы ${group.chat_id}:`,
                error
            );
        }
    }
}

module.exports = {
    processBirthdays,
    processBirthdayGroup
};