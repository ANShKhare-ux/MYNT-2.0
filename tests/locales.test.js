const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR, loadLocale } = require('./helpers/loader');

test('Locales and Internationalization Integrity', async (t) => {
    const localesDir = path.join(ROOT_DIR, 'locales');
    const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.js'));

    await t.test(`exactly 32 locale dictionary files exist`, () => {
        assert.equal(localeFiles.length, 32, `Expected 32 locale files, found ${localeFiles.length}`);
    });

    const en = loadLocale('en');

    await t.test('English (en) baseline contains all critical translation keys', () => {
        const requiredCoreKeys = [
            'newTabTitle',
            'personalizationSectionTitle',
            'clockSectionTitle',
            'searchSectionTitle',
            'weatherSectionTitle',
            'appearanceSectionTitle',
            'settingsSectionTitle',
            'shortcutsText',
            'bookmarksText',
            'ai_tools_button',
            'googleAppsMenuText',
            'todoListText'
        ];

        for (const key of requiredCoreKeys) {
            assert.ok(key in en, `Baseline en.js missing required key: ${key}`);
            assert.ok(typeof en[key] === 'string' && en[key].length > 0, `en[${key}] must be a non-empty string`);
        }
    });

    await t.test('all 32 locale files parse correctly and contain standard common keys', () => {
        // Universal keys that are translated across all 32 locales in MYNT
        const universalKeys = ['shortcutsText', 'github', 'digitalclocktitle', 'searchWithHint', 'days', 'months'];

        for (const file of localeFiles) {
            const localeCode = path.basename(file, '.js');
            const dict = loadLocale(localeCode);

            assert.ok(dict && typeof dict === 'object', `${file} must export an object`);
            const keys = Object.keys(dict);
            assert.ok(keys.length >= 60, `${file} must contain at least 60 translation keys (found ${keys.length})`);

            for (const uKey of universalKeys) {
                assert.ok(uKey in dict, `${file} must define universal key "${uKey}"`);
            }
        }
    });

    await t.test('fallback mechanism resolves partially translated keys to English default', () => {
        // e.g. ar_SA omits newTabTitle, simulating MYNT runtime fallback: translations[lang]?.key || translations["en"].key
        const ar = loadLocale('ar_SA');
        const resolvedTitle = ar.newTabTitle || en.newTabTitle;
        assert.equal(resolvedTitle, 'New Tab', 'Fallback to English baseline must resolve missing keys');
    });

    await t.test('index.html includes script tags for every locale file', () => {
        const indexPath = path.join(ROOT_DIR, 'index.html');
        const indexHtml = fs.readFileSync(indexPath, 'utf8');

        for (const file of localeFiles) {
            const expectedScript = `locales/${file}`;
            assert.ok(
                indexHtml.includes(expectedScript),
                `index.html must include <script> tag for "${expectedScript}"`
            );
        }
    });
});
