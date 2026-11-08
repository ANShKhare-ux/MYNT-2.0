// GNU General Public License v3.0 - MYNT: Material You New Tab
// Tests for Fluid Motion System, Micro-interactions, Spring Physics & Accessibility

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '..', 'style.css');
const cssContent = fs.readFileSync(stylePath, 'utf8');

test('Fluid Motion System & Micro-Interactions Suite', async (t) => {

    await t.test('style.css defines physics-based fluid motion tokens in :root', () => {
        assert.ok(
            cssContent.includes('--fluid-spring: cubic-bezier(0.34, 1.35, 0.64, 1);'),
            'Must define --fluid-spring token with tactile overshoot curve'
        );
        assert.ok(
            cssContent.includes('--fluid-spring-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1);'),
            'Must define --fluid-spring-bouncy token for playful micro-interactions'
        );
        assert.ok(
            cssContent.includes('--fluid-ease-out: cubic-bezier(0.16, 1, 0.3, 1);'),
            'Must define --fluid-ease-out token for smooth sheet/drawer deceleration'
        );
        assert.ok(
            cssContent.includes('--fluid-press: cubic-bezier(0.4, 0, 0.2, 1);'),
            'Must define --fluid-press token for low-latency active depression'
        );
    });

    await t.test('shortcuts implement staggered entrance animation and fluid hover/active states', () => {
        assert.ok(
            cssContent.includes('@keyframes shortcutStaggerIn'),
            'Must define @keyframes shortcutStaggerIn for staggered entrance'
        );
        assert.ok(
            cssContent.includes('.shortcutsContainer .shortcuts:nth-child(1)') &&
            cssContent.includes('.shortcutsContainer .shortcuts:nth-child(2)'),
            'Must configure staggered animation delays on shortcut children'
        );
        assert.ok(
            cssContent.includes('.shortcutsContainer .shortcuts:hover') &&
            cssContent.includes('transform: translateY(-8px) scale(1.08)'),
            'Shortcuts must elevate smoothly on hover'
        );
        assert.ok(
            cssContent.includes('.shortcutsContainer .shortcuts:active') &&
            cssContent.includes('--fluid-press'),
            'Shortcuts must provide immediate tactile feedback on active press'
        );
    });

    await t.test('menu floating action button implements spring rotation and active depression', () => {
        assert.ok(
            cssContent.includes('#menuButton') &&
            cssContent.includes('--fluid-spring'),
            '#menuButton must use --fluid-spring transition'
        );
        assert.ok(
            cssContent.includes('#menuButton:hover') &&
            cssContent.includes('rotate(45deg)'),
            '#menuButton must rotate smoothly on hover'
        );
        assert.ok(
            cssContent.includes('#menuButton:active') &&
            cssContent.includes('--fluid-press'),
            '#menuButton must depress with --fluid-press on pointerdown'
        );
    });

    await t.test('settings drawer replaces expensive transition: all with compositor-friendly properties', () => {
        // .menuBar .menuCont must not use transition: all 0.5s
        assert.ok(
            !cssContent.includes('.menuBar .menuCont {\n\tposition: fixed;\n\ttop: 0;\n\tinset-inline-end: 0;\n\theight: 100%;\n\twidth: 400px;\n\t/* change on some languages for fix the buttons */\n\ttransition: all 0.5s;'),
            '.menuBar .menuCont must not use transition: all 0.5s'
        );
        assert.ok(
            cssContent.includes('.menuBar .menuCont') &&
            cssContent.includes('transition: transform 0.42s var(--fluid-ease-out);'),
            '.menuBar .menuCont must transition transform using --fluid-ease-out'
        );
        assert.ok(
            cssContent.includes('.menuCont .optCont') &&
            cssContent.includes('var(--fluid-ease-out)'),
            '.menuCont .optCont must transition using --fluid-ease-out'
        );
    });

    await t.test('collapsible sections chevron and cards animate with spring physics and smooth unrolling', () => {
        assert.ok(
            cssContent.includes('.sectionChevron') &&
            cssContent.includes('transition: transform 0.35s var(--fluid-spring);'),
            '.sectionChevron must rotate using --fluid-spring'
        );
        assert.ok(
            cssContent.includes('.sectionInner') &&
            cssContent.includes('var(--fluid-ease-out)'),
            '.sectionInner must smoothly expand and collapse using --fluid-ease-out'
        );
    });

    await t.test('all action and navigation buttons define tactile active states with --fluid-press', () => {
        const expectedActiveSelectors = [
            '.uploadButton:active',
            '.randomButton:active',
            '.videoButton:active',
            '.switchMediaButton:active',
            '.clearButton:active',
            '.backupRestoreBtn:active',
            '.resetbtn:active',
            '#backButton:active',
            '#resetButton:active',
            '#newShortcutButton:active',
            '.prompt-modal-button:active',
            '#todoAdd:active',
            '#enterBtn:active'
        ];

        for (const selector of expectedActiveSelectors) {
            assert.ok(
                cssContent.includes(selector),
                `Must define active press state for ${selector}`
            );
        }
    });

    await t.test('theme segmented control indicator glides smoothly using --fluid-spring', () => {
        assert.ok(
            cssContent.includes('.themeIndicator') &&
            cssContent.includes('transition: transform 0.38s var(--fluid-spring);'),
            '.themeIndicator pill must slide with --fluid-spring physics'
        );
    });

    await t.test('color swatches define playful bounce on selection and tactile depression', () => {
        assert.ok(
            cssContent.includes('@keyframes swatchSelectBounce'),
            'Must define @keyframes swatchSelectBounce'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .colorsContainer input[type="radio"]:active') &&
            cssContent.includes('--fluid-press'),
            'Color swatches must depress on active press'
        );
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"] .colorsContainer input[type="radio"]:checked') &&
            cssContent.includes('swatchSelectBounce'),
            'Color swatches must bounce on check'
        );
    });

    await t.test('dialog modals and overlays define spring entrance keyframe animations', () => {
        assert.ok(
            cssContent.includes('@keyframes modalSpringIn'),
            'Must define @keyframes modalSpringIn'
        );
        assert.ok(
            cssContent.includes('@keyframes modalOverlayFadeIn'),
            'Must define @keyframes modalOverlayFadeIn'
        );
        assert.ok(
            cssContent.includes('#prompt-modal-container') &&
            cssContent.includes('modalSpringIn'),
            '#prompt-modal-container must animate with modalSpringIn'
        );
        assert.ok(
            cssContent.includes('#editBookmarkModal') &&
            cssContent.includes('modalSpringIn'),
            '#editBookmarkModal must animate with modalSpringIn'
        );
    });

    await t.test('accessibility: defines comprehensive prefers-reduced-motion media query', () => {
        assert.ok(
            cssContent.includes('@media (prefers-reduced-motion: reduce)'),
            'Must include @media (prefers-reduced-motion: reduce)'
        );
        assert.ok(
            cssContent.includes('animation-duration: 0.001ms !important;') &&
            cssContent.includes('transition-duration: 0.001ms !important;'),
            'Must collapse animations and transitions for users with reduced motion preferences'
        );
    });

    await t.test('motion & GSAP physics: defines linear spring curves, hero cascade, and corner button interactions', () => {
        assert.ok(
            cssContent.includes('--motion-spring:') && cssContent.includes('--motion-bounce:') && cssContent.includes('--motion-elastic:'),
            'style.css must define Motion & GSAP linear spring and bounce tokens'
        );
        assert.ok(
            cssContent.includes('@keyframes heroSpringIn') && cssContent.includes('@keyframes cornerItemIn'),
            'style.css must define heroSpringIn and cornerItemIn choreographed keyframes'
        );
        assert.ok(
            cssContent.includes('@keyframes drawerSectionIn'),
            'style.css must define drawerSectionIn timeline cascade for settings drawer'
        );
        assert.ok(
            cssContent.includes('.todoListCont:hover') && cssContent.includes('.bookmark-button:hover') && cssContent.includes('.googleAppsCont:hover'),
            'Corner action buttons must define spring scale hover states'
        );
    });

    await t.test('motion preferences: supports in-app UI animation toggle and OS reduced-motion independence', () => {
        const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        const preloadJs = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'preload.js'), 'utf8');
        const motionJs = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'motion.js'), 'utf8');

        assert.ok(indexHtml.includes('<script defer src="scripts/motion.js"></script>'), 'index.html must load scripts/motion.js');
        assert.ok(indexHtml.includes('id="uiAnimationsCheckbox"'), 'index.html must contain uiAnimationsCheckbox toggle');
        assert.ok(preloadJs.includes('mynt_ui_animations') && preloadJs.includes('data-motion'), 'preload.js must synchronously configure data-motion attribute');
        assert.ok(motionJs.includes('GNU General Public License v3.0'), 'motion.js must contain GPL-3.0 header');
        assert.ok(motionJs.includes('window.MYNT_Motion ='), 'motion.js must expose window.MYNT_Motion API');
        assert.ok(
            cssContent.includes('html[data-motion="disabled"]') && cssContent.includes('html:not([data-motion="enabled"])'),
            'style.css must decouple animations from OS Windows setting via data-motion attribute'
        );
    });
});
