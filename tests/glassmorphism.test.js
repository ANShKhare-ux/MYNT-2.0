const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./helpers/loader');

test('Glassmorphism System Design and Implementation', async (t) => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    await t.test('style.css defines essential glassmorphism design tokens', () => {
        const expectedTokens = [
            '--glass-blur-sm',
            '--glass-blur',
            '--glass-blur-lg',
            '--glass-saturate',
            '--glass-border-color',
            '--glass-border-dark',
            '--glass-specular',
            '--glass-specular-dark',
            '--glass-shadow',
            '--glass-shadow-lg'
        ];

        for (const token of expectedTokens) {
            assert.ok(
                cssContent.includes(token),
                `style.css must declare token "${token}" in design tokens`
            );
        }
    });

    await t.test('applies backdrop-filter and -webkit-backdrop-filter across core components', () => {
        const requiredSelectors = [
            'body[data-bg="wallpaper"] .searchbar',
            'body[data-bg="wallpaper"] .rightDiv .topDiv .lrectangle',
            'body[data-bg="wallpaper"] .todo-container',
            'body[data-bg="wallpaper"] .bookmark-sidebar',
            'body[data-bg="wallpaper"] .icon-container',
            'body[data-bg="wallpaper"] .shortcutsContainer .shortcuts .shortcutLogoContainer',
            'body[data-bg="wallpaper"] .dot-icon'
        ];

        for (const selector of requiredSelectors) {
            assert.ok(
                cssContent.includes(selector),
                `style.css must define glassmorphism styles for selector "${selector}"`
            );
        }

        // Verify dual vendor prefixing
        assert.ok(cssContent.includes('backdrop-filter: blur(var(--glass-blur))'), 'Must include standard backdrop-filter');
        assert.ok(cssContent.includes('-webkit-backdrop-filter: blur(var(--glass-blur))'), 'Must include -webkit-backdrop-filter prefix');
    });

    await t.test('settings drawer cards apply glassmorphism and header layout is cleaned', () => {
        // Settings drawer and cards glassmorphism selectors
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .sectionInner'),
            'style.css must apply glassmorphism to .sectionInner cards'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .sectionOuter'),
            'style.css must apply glassmorphism to .sectionOuter container'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .tilesCont .tiles'),
            'style.css must apply glassmorphism to GitHub and Feedback tiles'
        );

        // Header cleanup and broken arch removal
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .menuBar .menuCont .topRounder') &&
            cssContent.includes('display: none !important'),
            'Must eliminate outer topRounder SVG wedge in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .menuCont .topDiv::after') &&
            cssContent.includes('display: none !important'),
            'Must eliminate broken topDiv::after arched cutout in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .menuCont .topDiv') &&
            cssContent.includes('background-color: transparent'),
            'Must make menuCont topDiv transparent in wallpaper mode'
        );
    });

    await t.test('shortcut edit page topBar and action buttons apply glassmorphism and theme contrast', () => {
        // Sticky topBar glassmorphism in wallpaper mode
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .topBar'),
            'style.css must apply glassmorphism to .topBar in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] #backButton'),
            'style.css must style #backButton with frosted glass in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] #resetButton'),
            'style.css must style #resetButton with frosted glass in wallpaper mode'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] #newShortcutButton'),
            'style.css must style #newShortcutButton with frosted glass in wallpaper mode'
        );

        // Dark theme wallpaper overrides
        assert.ok(
            cssContent.includes('.black-theme body[data-bg="wallpaper"] .topBar') ||
            cssContent.includes('body[data-bg="wallpaper"]:has(.themeSegment[data-active="dark"]) .topBar'),
            'Must provide dark theme glass styling for .topBar'
        );
        assert.ok(
            cssContent.includes('.black-theme body[data-bg="wallpaper"] .pageTitle') ||
            cssContent.includes('body[data-bg="wallpaper"]:has(.themeSegment[data-active="dark"]) .pageTitle'),
            'Must provide high-contrast text color for .pageTitle in dark mode'
        );
    });

    await t.test('dark theme adaptation defines contrast-adjusted glass borders and shadows', () => {
        assert.ok(
            cssContent.includes('--glass-border-dark'),
            'Must specify darker specular border tokens for dark themes'
        );
        assert.ok(
            cssContent.includes('--glass-specular-dark'),
            'Must specify darker inner specular tokens'
        );
        assert.ok(
            cssContent.includes('html[data-preferred-theme="dark"]') &&
            cssContent.includes('body[sysTheme="systemDark"]'),
            'Dark theme selectors must adapt glassmorphism variables'
        );
    });

    await t.test('accessibility: includes prefers-reduced-transparency media query', () => {
        assert.ok(
            cssContent.includes('@media (prefers-reduced-transparency: reduce)'),
            'Must provide prefers-reduced-transparency accessibility fallback'
        );
        assert.ok(
            cssContent.includes('backdrop-filter: none !important'),
            'Reduced transparency must disable backdrop blur'
        );
    });

    await t.test('applies glassmorphism to all buttons across wallpaper mode with dark theme adaptations', () => {
        const requiredButtonSelectors = [
            'body[data-bg="wallpaper"] .uploadButton',
            'body[data-bg="wallpaper"] .randomButton',
            'body[data-bg="wallpaper"] .videoButton',
            'body[data-bg="wallpaper"] .switchMediaButton',
            'body[data-bg="wallpaper"] .clearButton',
            'body[data-bg="wallpaper"] .themeSegment',
            'body[data-bg="wallpaper"] .themeIndicator',
            'body[data-bg="wallpaper"] .themingStuff .btn',
            'body[data-bg="wallpaper"] .languageIcon',
            'body[data-bg="wallpaper"] .colorsContainer',
            'body[data-bg="wallpaper"] .colorPickerLabel',
            'body[data-bg="wallpaper"] .opacitySlider',
            'body[data-bg="wallpaper"] #enterBtn',
            'body[data-bg="wallpaper"] #todoAdd',
            'body[data-bg="wallpaper"] .savebtn',
            'body[data-bg="wallpaper"] .backupRestoreBtn',
            'body[data-bg="wallpaper"] .resetbtn',
            'body[data-bg="wallpaper"] #dontShowTips',
            'body[data-bg="wallpaper"] .prompt-modal-button',
            'body[data-bg="wallpaper"] .bookmark-sort-button'
        ];

        for (const selector of requiredButtonSelectors) {
            assert.ok(
                cssContent.includes(selector),
                `style.css must apply glassmorphism to button selector: ${selector}`
            );
        }

        // Dark theme button rules
        assert.ok(
            cssContent.includes('.black-theme body[data-bg="wallpaper"] .uploadButton'),
            'Must provide dark mode glass styling for .uploadButton'
        );
        assert.ok(
            cssContent.includes('.black-theme body[data-bg="wallpaper"] .clearButton'),
            'Must provide dark mode glass styling for .clearButton'
        );
    });
});
