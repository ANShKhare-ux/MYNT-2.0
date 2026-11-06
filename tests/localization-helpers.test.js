const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLocalizationHelpers } = require('./helpers/loader');

test('Localization Number and Format Helpers', async (t) => {
    const { numberMappings, LRM, localizeNumbers } = loadLocalizationHelpers();

    await t.test('numberMappings defines expected numeral sets', () => {
        const expectedLanguages = ['bn', 'ta', 'mr', 'ne', 'fa', 'ar_SA'];
        for (const lang of expectedLanguages) {
            assert.ok(numberMappings[lang], `numberMappings must include "${lang}"`);
            assert.equal(Object.keys(numberMappings[lang]).length, 10, `${lang} must map all 10 digits (0-9)`);
        }
    });

    await t.test('converts western digits to Bengali numerals', () => {
        assert.equal(localizeNumbers('12345', 'bn'), '১২৩৪৫');
    });

    await t.test('converts western digits to Tamil numerals', () => {
        assert.equal(localizeNumbers('2026', 'ta'), '௨௦௨௬');
    });

    await t.test('converts western digits to Marathi numerals', () => {
        assert.equal(localizeNumbers('7890', 'mr'), '७८९०');
    });

    await t.test('converts western digits to Nepali numerals', () => {
        assert.equal(localizeNumbers('100', 'ne'), '१००');
    });

    await t.test('converts western digits to Farsi numerals', () => {
        assert.equal(localizeNumbers('350', 'fa'), '۳۵۰');
    });

    await t.test('formats Arabic numerals with bidirectional LRM markers', () => {
        const result = localizeNumbers('12', 'ar_SA');
        assert.equal(result, `${LRM}۱۲${LRM}`);
        assert.ok(result.startsWith(LRM) && result.endsWith(LRM), 'Arabic numbers must be wrapped with LRM');
    });

    await t.test('replaces decimal point with comma for special decimal languages', () => {
        const commaLanguages = ['de', 'es', 'fr', 'it', 'pt', 'ru', 'cs', 'tr'];
        for (const lang of commaLanguages) {
            assert.equal(
                localizeNumbers('24.5', lang),
                '24,5',
                `Language "${lang}" should use comma as decimal separator`
            );
        }
    });

    await t.test('preserves decimal point for default English and dot-separator languages', () => {
        assert.equal(localizeNumbers('24.5', 'en'), '24.5');
        assert.equal(localizeNumbers('99.9%', 'en'), '99.9%');
    });

    await t.test('leaves unmapped language text unchanged', () => {
        assert.equal(localizeNumbers('Hello 123', 'en'), 'Hello 123');
    });
});
