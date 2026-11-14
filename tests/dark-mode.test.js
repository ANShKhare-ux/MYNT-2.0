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

test('Dark Mode Integrity and Negative Effect Prevention Suite', async (t) => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const preloadJsPath = path.join(ROOT_DIR, 'scripts', 'preload.js');
    const themeJsPath = path.join(ROOT_DIR, 'scripts', 'theme.js');

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const preloadJs = fs.readFileSync(preloadJsPath, 'utf8');
    const themeJs = fs.readFileSync(themeJsPath, 'utf8');

    await t.test('solid color dark mode counter-inverts settings drawer and modals to prevent negative effect', () => {
        // Find solid color dark mode block
        const solidColorRuleIndex = cssContent.indexOf('html:has(body[data-bg="color"] .menuBar .themeSegment[data-active="dark"])');
        assert.ok(solidColorRuleIndex !== -1, 'Must define solid color dark mode rule');
        const solidColorBlock = cssContent.slice(solidColorRuleIndex, solidColorRuleIndex + 1400);

        // Verify .menuBar and modal containers are counter-inverted
        assert.ok(
            solidColorBlock.includes('& .menuBar') &&
            solidColorBlock.includes('& #bookmarksContainer') &&
            solidColorBlock.includes('& #prompt-modal-container') &&
            solidColorBlock.includes('filter: invert(1) hue-rotate(180deg)'),
            'Must counter-invert .menuBar and modals inside inverted html to prevent negative effect'
        );

        // Verify background-color: #0000000f is not applied to .menuBar
        assert.ok(
            !solidColorBlock.includes('& .menuBar,\n\t& #bookmarksContainer {\n\t\tbackground-color: #0000000f;'),
            'Must not apply #0000000f to .menuBar in solid color dark mode'
        );
    });

    await t.test('wallpaper dark mode excludes shortcuts and menuButton from invert filter', () => {
        // Verify shortcuts and menuButton have filter: none !important
        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"]:has(.themeSegment[data-active="dark"]) #shortcuts-section') &&
            cssContent.includes('filter: none !important'),
            'Must set filter: none !important on #shortcuts-section in wallpaper dark mode'
        );

        assert.ok(
            cssContent.includes('body[data-bg="wallpaper"]:has(.themeSegment[data-active="dark"]) #menuButton') &&
            cssContent.includes('filter: none !important'),
            'Must set filter: none !important on #menuButton in wallpaper dark mode'
        );
    });

    await t.test('wallpaper dark mode counter-inverts aiModeIcon inside inverted center container', () => {
        const wallpaperRuleIndex = cssContent.indexOf('body[data-bg="wallpaper"]:has(.menuBar .themeSegment[data-active="dark"])');
        assert.ok(wallpaperRuleIndex !== -1, 'Must define wallpaper dark mode rule');
        const wallpaperBlock = cssContent.slice(wallpaperRuleIndex, wallpaperRuleIndex + 1200);

        assert.ok(
            wallpaperBlock.includes('& .aiModeIcon') &&
            wallpaperBlock.includes('filter: invert(1) hue-rotate(180deg)'),
            'Must counter-invert .aiModeIcon inside inverted .centerDiv to protect dark pill colors'
        );
    });

    await t.test('custom shortcut icons are strictly protected from inversion in all dark modes', () => {
        const customIconMatch = cssContent.match(
            /body\[data-bg="wallpaper"\]\[sysTheme="systemDark"\]:has\(\s*\.themeSegment\[data-active="system"\]\s*\):not\(:has\(#darkTheme:checked\)\)\s*\.shortcuts\s*\.shortcutLogoContainer\s*img\[data-icon-type="custom"\]\s*\{([^}]+)\}/
        );
        assert.ok(customIconMatch, 'Must match custom icon selector in dark mode');
        assert.ok(
            customIconMatch[1].includes('filter: none !important'),
            'Custom icon rule must use filter: none !important, never invert'
        );
    });

    await t.test('preload script detects wallpaper mode to prevent wallpaper flash and negative inversion', () => {
        assert.ok(
            preloadJs.includes("root.setAttribute('data-has-wallpaper', 'true')"),
            'preload.js must set data-has-wallpaper="true" when hasWallpaper is true'
        );

        assert.ok(
            cssContent.includes('html[data-preferred-theme="dark"]:not([data-has-wallpaper="true"])'),
            'style.css early-paint rule must exclude data-has-wallpaper="true" from root invert'
        );

        assert.ok(
            themeJs.includes('document.documentElement.removeAttribute("data-has-wallpaper")'),
            'theme.js must clean up data-has-wallpaper on DOMContentLoaded'
        );
    });
});
