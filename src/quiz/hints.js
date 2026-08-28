const config = require('./config');

function getCharacterPositions(answer) {
    return [...answer]
        .map((char, index) => ({
            char,
            index
        }))
        .filter(item => item.char !== ' ')
        .map(item => item.index);
}

function getRandomPositions(positions, count) {
    const shuffled = [...positions];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return new Set(shuffled.slice(0, count));
}

function createAnswerMask(answer, revealedPositions) {
    return [...answer]
        .map((char, index) => {
            if (char === ' ') {
                return ' ';
            }

            if (revealedPositions.has(index)) {
                return `${char}  `;
            }

            return config.hiddenAnswerSymbol;
        })
        .join('');
}

function prepare(answer) {
    const characterPositions = getCharacterPositions(answer);
    const characters = characterPositions.length;

    const hint2Characters = Math.round(
        characters * config.hints.hint2
    );

    const hint3Characters = Math.round(
        characters * config.hints.hint3
    );

    const hint1Positions = new Set();

    const hint2Positions = getRandomPositions(
        characterPositions,
        hint2Characters
    );

    const remainingPositions = characterPositions.filter(
        position => !hint2Positions.has(position)
    );

    const additionalHint3Characters = Math.max(
        0,
        hint3Characters - hint2Positions.size
    );

    const additionalHint3Positions = getRandomPositions(
        remainingPositions,
        additionalHint3Characters
    );

    const hint3Positions = new Set([
        ...hint2Positions,
        ...additionalHint3Positions
    ]);

    return {
        hint1: {
            mask: createAnswerMask(answer, hint1Positions),
        },

        hint2: {
            mask: createAnswerMask(answer, hint2Positions),
        },

        hint3: {
            mask: createAnswerMask(answer, hint3Positions),
        }
    };
}

module.exports = {
    prepare
};