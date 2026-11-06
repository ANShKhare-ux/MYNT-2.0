/**
 * Test helper module for MYNT (Material You New Tab).
 * Extracts and compiles standalone functions from browser scripts without modifying source files.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

/**
 * Loads a locale file from locales/ and returns its dictionary object.
 * @param {string} localeCode - e.g. 'en', 'es', 'zh', 'ar_SA'
 * @returns {Record<string, string>}
 */
function loadLocale(localeCode) {
    const filePath = path.join(ROOT_DIR, 'locales', `${localeCode}.js`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Each locale file declares: const <code_or_identifier> = { ... };
    // We wrap it in a function and return the object.
    const fn = new Function(content + `\nreturn ${localeCode};`);
    return fn();
}

/**
 * Loads localization helper functions and maps from scripts/languages.js.
 */
function loadLocalizationHelpers() {
    const filePath = path.join(ROOT_DIR, 'scripts', 'languages.js');
    const content = fs.readFileSync(filePath, 'utf8');

    const startIdx = content.indexOf('const numberMappings =');
    const endIdx = content.indexOf('const rtlLanguages =');
    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Unable to extract numberMappings block from scripts/languages.js');
    }
    const snippet = content.substring(startIdx, endIdx);

    const fn = new Function(snippet + `
        return {
            numberMappings,
            LRM,
            localizeNumbers
        };
    `);
    return fn();
}

/**
 * Loads security and sanitization helpers from scripts/shortcuts.js.
 * @param {object} mockLocalStorage - Optional mock for localStorage.
 */
function loadShortcutSecurityHelpers(mockLocalStorage = { getItem: () => null }) {
    const filePath = path.join(ROOT_DIR, 'scripts', 'shortcuts.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract escapeHtml
    const escapeHtmlMatch = content.match(/function escapeHtml[\s\S]*?\n    \}/);
    if (!escapeHtmlMatch) throw new Error('Could not find escapeHtml in scripts/shortcuts.js');
    const escapeHtml = new Function('return (' + escapeHtmlMatch[0] + ')')();

    // Extract isValidCustomIconUrl
    const isValidUrlMatch = content.match(/function isValidCustomIconUrl[\s\S]*?\n    \}/);
    if (!isValidUrlMatch) throw new Error('Could not find isValidCustomIconUrl in scripts/shortcuts.js');
    const isValidCustomIconUrl = new Function('return (' + isValidUrlMatch[0] + ')')();

    // Extract applyCustomSvgAccentColor and sanitizeSvg
    const startSvg = content.indexOf('function applyCustomSvgAccentColor');
    const endSvg = content.indexOf('function processIconInput');
    if (startSvg === -1 || endSvg === -1) {
        throw new Error('Could not find sanitizeSvg block in scripts/shortcuts.js');
    }
    const svgSnippet = content.substring(startSvg, endSvg);
    const svgModule = new Function('localStorage', svgSnippet + `
        return {
            applyCustomSvgAccentColor,
            sanitizeSvg
        };
    `)(mockLocalStorage);

    // Extract normalizeUrl
    const normalizeUrlMatch = content.match(/function normalizeUrl[\s\S]*?\n    \}/);
    if (!normalizeUrlMatch) throw new Error('Could not find normalizeUrl in scripts/shortcuts.js');
    const normalizeUrl = new Function('return (' + normalizeUrlMatch[0] + ')')();

    return {
        escapeHtml,
        isValidCustomIconUrl,
        applyCustomSvgAccentColor: svgModule.applyCustomSvgAccentColor,
        sanitizeSvg: svgModule.sanitizeSvg,
        normalizeUrl
    };
}

/**
 * Loads isValidBackupFile helper from scripts/backup-restore.js.
 */
function loadBackupValidator() {
    const filePath = path.join(ROOT_DIR, 'scripts', 'backup-restore.js');
    const content = fs.readFileSync(filePath, 'utf8');

    const match = content.match(/function isValidBackupFile[\s\S]*?\n\}/);
    if (!match) throw new Error('Could not find isValidBackupFile in scripts/backup-restore.js');

    const isValidBackupFile = new Function('return (' + match[0] + ')')();
    return { isValidBackupFile };
}

module.exports = {
    ROOT_DIR,
    loadLocale,
    loadLocalizationHelpers,
    loadShortcutSecurityHelpers,
    loadBackupValidator
};
