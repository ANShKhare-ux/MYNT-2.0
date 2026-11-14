/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Neomorphism Design System in Settings Menu Suite', async (t) => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    await t.test('style.css defines comprehensive neomorphic design tokens in :root', () => {
        const requiredTokens = [
            '--neu-canvas',
            '--neu-card-bg',
            '--neu-card-outer-bg',
            '--neu-surface',
            '--neu-surface-raised',
            '--neu-surface-pressed',
            '--neu-shadow-dark',
            '--neu-shadow-light',
            '--neu-shadow-dark-sm',
            '--neu-shadow-light-sm',
            '--neu-inset-dark',
            '--neu-inset-light',
            '--neu-border-highlight'
        ];

        for (const token of requiredTokens) {
            assert.ok(
                cssContent.includes(token),
                `style.css must declare neomorphic token "${token}"`
            );
        }
    });

    await t.test('dark theme adapts neomorphic tokens for dark soft-UI surfaces', () => {
        const darkThemeIndex = cssContent.search(/\.black-theme,\s*html\[data-preferred-theme="dark"\]/);
        assert.ok(darkThemeIndex !== -1, 'Must find dark theme definition block');
        const darkThemeBlock = cssContent.slice(darkThemeIndex);

        assert.ok(
            darkThemeBlock.includes('--neu-canvas: #1e1e23;'),
            'Dark theme must define solid dark canvas'
        );
        assert.ok(
            darkThemeBlock.includes('--neu-card-bg: #27272d;'),
            'Dark theme must define solid dark card background'
        );
        assert.ok(
            darkThemeBlock.includes('--neu-shadow-dark: rgba(0, 0, 0, 0.55);'),
            'Dark theme must define high-contrast dark shadows'
        );
        assert.ok(
            darkThemeBlock.includes('--neu-shadow-light: rgba(255, 255, 255, 0.065);'),
            'Dark theme must define subtle light rim highlights'
        );
    });

    await t.test('settings menu backdrop and drawer canvas completely remove glassmorphism blur', () => {
        // .menuBar has no backdrop-filter blur
        assert.ok(
            cssContent.includes('.menuBar') &&
            cssContent.includes('backdrop-filter: none') &&
            cssContent.includes('-webkit-backdrop-filter: none'),
            '.menuBar must disable backdrop-filter blur'
        );

        // .menuBar .menuCont has solid opaque canvas and no blur
        assert.ok(
            cssContent.includes('background-color: var(--neu-canvas)'),
            '.menuBar .menuCont must have solid background-color: var(--neu-canvas)'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .menuBar .menuCont') &&
            cssContent.includes('backdrop-filter: none !important') &&
            cssContent.includes('-webkit-backdrop-filter: none !important'),
            '.menuCont must explicitly disable backdrop-filter in wallpaper mode'
        );
    });

    await t.test('cards inside settings menu implement neomorphic extruded and recessed surfaces', () => {
        // Outer cards (.sectionOuter)
        assert.ok(
            cssContent.includes('.sectionOuter') &&
            cssContent.includes('var(--neu-shadow-dark)') &&
            cssContent.includes('var(--neu-shadow-light)'),
            '.sectionOuter must use neomorphic dual shadows'
        );

        // Inner recessed surfaces (.sectionInner, .appearanceSection .innerSurface)
        assert.ok(
            cssContent.includes('.sectionInner') &&
            cssContent.includes('var(--neu-inset-dark)') &&
            cssContent.includes('var(--neu-inset-light)'),
            '.sectionInner must use neomorphic inset shadows'
        );

        // Wallpaper mode cards must have backdrop-filter: none !important
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .sectionOuter') &&
            cssContent.includes('backdrop-filter: none !important'),
            '.sectionOuter must disable backdrop-filter in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .sectionInner') &&
            cssContent.includes('backdrop-filter: none !important'),
            '.sectionInner must disable backdrop-filter in wallpaper mode'
        );
    });

    await t.test('buttons inside settings menu implement neomorphic raised and inset states', () => {
        const settingsButtons = [
            '.tilesCont .tiles',
            '.uploadButton',
            '.randomButton',
            '.videoButton',
            '.switchMediaButton',
            '.clearButton',
            '.savebtn',
            '.backupRestoreBtn',
            '.resetbtn',
            '#dontShowTips',
            '.layoutEditBtn',
            '.layoutResetBtn',
            '#shortcutEditButton',
            '#aiToolsEditButton',
            '#backButton',
            '#newShortcutButton',
            '#resetButton',
            '.shortcutDelete button',
            '.uploadCustomIconButton'
        ];

        for (const btnSelector of settingsButtons) {
            assert.ok(
                cssContent.includes(btnSelector),
                `style.css must define neomorphic styles for settings button "${btnSelector}"`
            );
        }

        // Active state depression
        assert.ok(
            cssContent.includes('var(--neu-inset-dark)') &&
            cssContent.includes('var(--neu-inset-light)'),
            'Settings buttons must define tactile inset depression on :active'
        );

        // Settings buttons disable backdrop blur in wallpaper mode
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .tilesCont .tiles') &&
            cssContent.includes('backdrop-filter: none !important'),
            'Settings tiles must disable backdrop-filter in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .uploadButton') &&
            cssContent.includes('backdrop-filter: none !important'),
            'Wallpaper action buttons must disable backdrop-filter in wallpaper mode'
        );
    });

    await t.test('light theme harmonization enforces light neomorphic tokens and prevents dark leakage', () => {
        assert.ok(
            cssContent.includes('body:has(.themeSegment[data-active="light"])'),
            'style.css must define explicit light theme harmonization rule for data-active="light"'
        );
        assert.ok(
            cssContent.includes('--neu-canvas: var(--accentLightTint-blue);'),
            'style.css must enforce light canvas token in light mode'
        );
        // Verify dark theme does not leak into light mode unconditionally on dark OS
        assert.ok(
            !cssContent.includes('\nbody[sysTheme="systemDark"] {'),
            'style.css must not apply dark theme tokens to body[sysTheme="systemDark"] unconditionally'
        );
    });

    await t.test('outside widgets strictly preserve glassmorphism in wallpaper mode', () => {
        const outsideWidgets = [
            'body[data-bg="wallpaper"] .searchbar',
            'body[data-bg="wallpaper"] .rightDiv .topDiv .lrectangle',
            'body[data-bg="wallpaper"] .todo-container',
            'body[data-bg="wallpaper"] .bookmark-sidebar',
            'body[data-bg="wallpaper"] .shortcutsContainer .shortcuts .shortcutLogoContainer',
            'body[data-bg="wallpaper"] #menuButton'
        ];

        for (const widget of outsideWidgets) {
            assert.ok(
                cssContent.includes(widget),
                `Outside widget "${widget}" must preserve glassmorphism styles`
            );
        }

        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] #menuButton') &&
            cssContent.includes('backdrop-filter: blur(var(--glass-blur))'),
            '#menuButton floating action button must preserve glassmorphism blur in wallpaper mode'
        );
    });
});
