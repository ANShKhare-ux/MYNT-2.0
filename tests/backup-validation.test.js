const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackupValidator } = require('./helpers/loader');

test('Backup and Restore Structure Validation', async (t) => {
    const { isValidBackupFile } = loadBackupValidator();

    await t.test('accepts valid backup payloads with localStorage and indexedDB objects', () => {
        const validPayload = {
            localStorage: {
                selectedTheme: 'dark',
                selectedLanguage: 'en',
                bgOpacity: '85'
            },
            indexedDB: {
                backgroundImage: 'data:image/png;base64,...'
            }
        };

        assert.equal(isValidBackupFile(validPayload), true);
        assert.equal(isValidBackupFile({ localStorage: {}, indexedDB: {} }), true);
    });

    await t.test('rejects payloads missing localStorage or indexedDB', () => {
        assert.equal(isValidBackupFile({ localStorage: {} }), false, 'Must reject if indexedDB missing');
        assert.equal(isValidBackupFile({ indexedDB: {} }), false, 'Must reject if localStorage missing');
        assert.equal(isValidBackupFile({}), false, 'Must reject empty object');
    });

    await t.test('rejects payloads where properties are primitive types', () => {
        assert.equal(isValidBackupFile({ localStorage: 'string', indexedDB: {} }), false);
        assert.equal(isValidBackupFile({ localStorage: {}, indexedDB: 12345 }), false);
        assert.equal(isValidBackupFile({ localStorage: true, indexedDB: false }), false);
    });

    await t.test('documents edge case: typeof null is object in JavaScript', () => {
        // Due to `!(typeof backup.localStorage !== "object" || typeof backup.indexedDB !== "object")`,
        // null values evaluate to typeof "object", which currently evaluates to true.
        // This test asserts the actual current behavior and documents the limitation.
        const nullEdgeCase = { localStorage: null, indexedDB: null };
        assert.equal(
            isValidBackupFile(nullEdgeCase),
            true,
            'Current implementation accepts null because typeof null === "object"'
        );
    });
});
