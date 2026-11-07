/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Element Position Editor & Custom Layout Suite', async (t) => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
    const layoutEditorJs = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'layout-editor.js'), 'utf8');
    const preloadJs = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'preload.js'), 'utf8');

    await t.test('index.html references layout-editor.js and defines layout customization controls', () => {
        assert.ok(indexHtml.includes('<script defer src="scripts/layout-editor.js"></script>'), 'index.html must load layout-editor.js');
        assert.ok(indexHtml.includes('id="openLayoutEditorBtn"'), 'index.html must contain customize layout button');
        assert.ok(indexHtml.includes('id="resetLayoutBtn"'), 'index.html must contain reset layout button');
        assert.ok(indexHtml.includes('id="layoutEditorText"'), 'index.html must contain layout editor title');
    });

    await t.test('scripts/layout-editor.js includes GNU GPL-3.0 header and defines all 11 core editable elements', () => {
        assert.ok(layoutEditorJs.includes('GNU General Public License v3.0'), 'layout-editor.js must contain GPL-3.0 header');
        
        const expectedElementIds = [
            'clock',
            'dateGreeting',
            'weather',
            'searchbar',
            'quotes',
            'shortcuts',
            'todo',
            'bookmarks',
            'googleApps',
            'aiTools',
            'menuButton'
        ];

        expectedElementIds.forEach(id => {
            assert.ok(layoutEditorJs.includes(`id: '${id}'`), `layout-editor.js must define editable element: ${id}`);
        });
    });

    await t.test('scripts/layout-editor.js manages storage persistence under mynt_element_positions key', () => {
        assert.ok(layoutEditorJs.includes("'mynt_element_positions'"), 'layout-editor.js must use mynt_element_positions localStorage key');
        assert.ok(layoutEditorJs.includes('localStorage.getItem'), 'must read positions from localStorage');
        assert.ok(layoutEditorJs.includes('localStorage.setItem'), 'must write positions to localStorage');
        assert.ok(layoutEditorJs.includes('localStorage.removeItem'), 'must support resetting positions from localStorage');
    });

    await t.test('style.css defines layout edit mode canvas, badges, toolbar, and toast styling', () => {
        assert.ok(styleCss.includes('body.layout-edit-mode'), 'style.css must define body.layout-edit-mode');
        assert.ok(styleCss.includes('.layout-element-badge'), 'style.css must define .layout-element-badge');
        assert.ok(styleCss.includes('.layout-editor-toolbar'), 'style.css must define .layout-editor-toolbar');
        assert.ok(styleCss.includes('.layout-editor-toast'), 'style.css must define .layout-editor-toast');
        assert.ok(styleCss.includes('.layoutEditBtn'), 'style.css must define .layoutEditBtn');
    });

    await t.test('style.css provides glassmorphism and dark mode support for layout-editor-toolbar', () => {
        assert.ok(styleCss.includes('body[data-bg="wallpaper"] .layout-editor-toolbar'), 'must support wallpaper glassmorphism for toolbar');
        assert.ok(styleCss.includes('.black-theme .layout-editor-toolbar'), 'must support dark theme for toolbar');
    });

    await t.test('scripts/preload.js implements synchronous preloading of custom positions to eliminate FOUC', () => {
        assert.ok(preloadJs.includes('mynt_element_positions'), 'preload.js must check mynt_element_positions');
        assert.ok(preloadJs.includes('custom-layout-positions-style'), 'preload.js must inject custom-layout-positions-style early in <head>');
    });

    await t.test('scripts/layout-editor.js exposes public API on window.LayoutEditor with edit and reset methods', () => {
        assert.ok(layoutEditorJs.includes('window.LayoutEditor ='), 'layout-editor.js must expose window.LayoutEditor API');
        assert.ok(layoutEditorJs.includes('enterEditMode'), 'window.LayoutEditor must have enterEditMode');
        assert.ok(layoutEditorJs.includes('exitEditMode'), 'window.LayoutEditor must have exitEditMode');
        assert.ok(layoutEditorJs.includes('resetPositions'), 'window.LayoutEditor must have resetPositions');
    });
});
