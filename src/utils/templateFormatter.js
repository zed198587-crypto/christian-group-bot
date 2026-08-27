function getUtf16Length(text) {
    return Buffer.byteLength(text, 'utf16le') / 2;
}

function getUtf16Offset(text, charIndex) {
    return getUtf16Length(
        text.slice(0, charIndex)
    );
}

function findReplacements(text, user, group) {
    const replacements = [
        {
            value: '{name}',
            replacement: user.first_name || ''
        },
        {
            value: '{surname}',
            replacement: user.last_name || ''
        },
        {
            value: '{group}',
            replacement: group.title || ''
        }
    ];

    const result = [];

    for (const item of replacements) {
        let index = text.indexOf(item.value);

        while (index !== -1) {
            result.push({
                start: index,
                end: index + item.value.length,
                replacement: item.replacement
            });

            index = text.indexOf(
                item.value,
                index + item.value.length
            );
        }
    }

    return result.sort(
        (a, b) => a.start - b.start
    );
}

function applyTemplate(template, user, group) {

    const sourceText = template.text || '';
    const sourceEntities = template.entities || [];

    const replacements = findReplacements(
        sourceText,
        user,
        group
    );

    let resultText = '';
    let sourcePosition = 0;

    for (const item of replacements) {

        if (item.start < sourcePosition) {
            continue;
        }

        resultText += sourceText.slice(
            sourcePosition,
            item.start
        );

        resultText += item.replacement;

        sourcePosition = item.end;
    }

    resultText += sourceText.slice(
        sourcePosition
    );

    const resultEntities = sourceEntities.map(
        entity => {

            const entityStart = entity.offset;
            const entityEnd =
                entity.offset + entity.length;

            let newOffset = entityStart;
            let newLength = entity.length;

            for (const replacement of replacements) {

                const replacementStart =
                    getUtf16Offset(
                        sourceText,
                        replacement.start
                    );

                const replacementEnd =
                    getUtf16Offset(
                        sourceText,
                        replacement.end
                    );

                const replacementLength =
                    getUtf16Length(
                        replacement.replacement
                    );

                const originalLength =
                    replacementEnd -
                    replacementStart;

                const difference =
                    replacementLength -
                    originalLength;

                if (replacementEnd <= entityStart) {

                    newOffset += difference;

                } else if (
                    replacementStart < entityEnd
                ) {

                    newLength += difference;
                }
            }

            return {
                ...entity,
                offset: newOffset,
                length: newLength
            };
        }
    );

    return {
        text: resultText,
        entities: resultEntities
    };
}

module.exports = {
    applyTemplate
};