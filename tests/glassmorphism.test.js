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
});
