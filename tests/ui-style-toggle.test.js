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

test('Interface Style Toggle: Glassmorphism vs Neomorphism Suite', async (t) => {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const preloadJsPath = path.join(ROOT_DIR, 'scripts', 'preload.js');
    const themeJsPath = path.join(ROOT_DIR, 'scripts', 'theme.js');

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const preloadJs = fs.readFileSync(preloadJsPath, 'utf8');
    const themeJs = fs.readFileSync(themeJsPath, 'utf8');

    await t.test('index.html contains style toggle segmented control and button', () => {
        assert.ok(
            indexHtml.includes('id="uiStyleSegment"'),
            'index.html must define #uiStyleSegment segmented control'
        );
        assert.ok(
            indexHtml.includes('id="neomorphismStyleBtn"') &&
            indexHtml.includes('data-style="neomorphism"'),
            'index.html must define Neomorphism style button'
        );
        assert.ok(
            indexHtml.includes('id="glassmorphismStyleBtn"') &&
            indexHtml.includes('data-style="glassmorphism"'),
            'index.html must define Glassmorphism style button'
        );
        assert.ok(
            indexHtml.includes('id="uiStyleToggle"'),
            'index.html must define #uiStyleToggle button for interactive toggling'
        );
    });

    await t.test('scripts/preload.js preloads data-ui-style attribute to prevent style FOUC', () => {
        assert.ok(
            preloadJs.includes("localStorage.getItem('mynt_ui_style')"),
            'preload.js must read mynt_ui_style from localStorage'
        );
        assert.ok(
            preloadJs.includes("root.setAttribute('data-ui-style'"),
            'preload.js must set data-ui-style on root element synchronously'
        );
    });

    await t.test('scripts/theme.js implements interactive style controller and toggleUiStyle function', () => {
        assert.ok(
            themeJs.includes('mynt_ui_style'),
            'theme.js must use mynt_ui_style storage key'
        );
        assert.ok(
            themeJs.includes('window.toggleUiStyle'),
            'theme.js must export window.toggleUiStyle for seamless switching'
        );
        assert.ok(
            themeJs.includes('applyUiStyle'),
            'theme.js must define applyUiStyle function'
        );
        assert.ok(
            themeJs.includes('moveIndicator'),
            'theme.js must animate styleIndicator position'
        );
    });

    await t.test('style.css defines styleSegment layout and fluid indicator animation', () => {
        assert.ok(
            cssContent.includes('.styleSegment') &&
            cssContent.includes('.styleIndicator') &&
            cssContent.includes('.styleSegBtn'),
            'style.css must style .styleSegment, .styleIndicator, and .styleSegBtn'
        );
        assert.ok(
            cssContent.includes('var(--fluid-spring)'),
            'style.css must animate .styleIndicator with physics-based spring curve'
        );
    });

    await t.test('style.css defines dynamic rules for Glassmorphism mode', () => {
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"] .menuBar') &&
            cssContent.includes('backdrop-filter: blur(15px)'),
            'style.css must apply backdrop-filter blur to .menuBar in glassmorphism mode'
        );
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"] .menuBar .menuCont') &&
            cssContent.includes('backdrop-filter: blur(var(--glass-blur-lg))'),
            'style.css must apply frosted glass to .menuCont in glassmorphism mode'
        );
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"] .sectionOuter') &&
            cssContent.includes('backdrop-filter: blur(var(--glass-blur))'),
            'style.css must apply frosted glass to .sectionOuter in glassmorphism mode'
        );
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"] .sectionInner') &&
            cssContent.includes('backdrop-filter: blur(var(--glass-blur-sm))'),
            'style.css must apply frosted glass to .sectionInner in glassmorphism mode'
        );
    });

    await t.test('style.css adapts glassmorphism mode for dark theme', () => {
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"]:has(.themeSegment[data-active="dark"]) .menuBar .menuCont') ||
            cssContent.includes('.black-theme[data-ui-style="glassmorphism"] .menuBar .menuCont'),
            'style.css must define dark glassmorphism rules for .menuCont'
        );
        assert.ok(
            cssContent.includes('[data-ui-style="glassmorphism"]:has(.themeSegment[data-active="dark"]) .sectionOuter') ||
            cssContent.includes('.black-theme[data-ui-style="glassmorphism"] .sectionOuter'),
            'style.css must define dark glassmorphism rules for .sectionOuter'
        );
    });
});
