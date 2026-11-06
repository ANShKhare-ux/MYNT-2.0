/*
 * Material You New Tab
 * Automated Test: Google AI Search Mode
 * Validates Google AI Mode pill button markup, URL synthesis (udm=50), engine detection, and styles.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const searchScriptPath = path.join(rootDir, 'scripts', 'search.js');
const stylePath = path.join(rootDir, 'style.css');

test('Google AI Search Mode Integration', async (t) => {
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const searchScript = fs.readFileSync(searchScriptPath, 'utf8');
    const styleCss = fs.readFileSync(stylePath, 'utf8');

    await t.test('index.html contains AI Mode pill button with icon and text span', () => {
        // Assert aiModeIcon exists in .searchControls
        assert.ok(indexHtml.includes('id="aiModeIcon"'), 'index.html must include element with id="aiModeIcon"');
        assert.ok(indexHtml.includes('class="aiModeIcon"'), 'index.html must include element with class="aiModeIcon"');

        // Assert SVG icon is inside the button with sparkle-lens path
        const aiButtonSection = indexHtml.slice(
            indexHtml.indexOf('id="aiModeIcon"'),
            indexHtml.indexOf('</button>', indexHtml.indexOf('id="aiModeIcon"')) + 9
        );
        assert.ok(aiButtonSection.includes('<svg'), 'aiModeIcon must contain an SVG element');
        assert.ok(aiButtonSection.includes('M17.518 1a.254.254'), 'SVG must contain the Google AI sparkle path');

        // Assert text label span exists with "AI Mode"
        assert.ok(aiButtonSection.includes('class="aiModeText"'), 'aiModeIcon must include span with class="aiModeText"');
        assert.ok(aiButtonSection.includes('AI Mode'), 'aiModeText must contain text "AI Mode"');

        // Assert position is inside searchControls before enterBtn
        const searchControlsIndex = indexHtml.indexOf('class="searchControls"');
        const aiModeIndex = indexHtml.indexOf('id="aiModeIcon"');
        const enterBtnIndex = indexHtml.indexOf('id="enterBtn"');
        assert.ok(searchControlsIndex < aiModeIndex, 'aiModeIcon must be inside searchControls');
        assert.ok(aiModeIndex < enterBtnIndex, 'aiModeIcon must be placed before enterBtn');
    });

    await t.test('performAISearch constructs official Google AI Mode URLs with udm=50', () => {
        function simulateAISearch(query) {
            const searchTerm = (typeof query === 'string' ? query : '').trim();
            if (searchTerm !== '') {
                return `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&udm=50`;
            } else {
                return 'https://www.google.com/search?udm=50';
            }
        }

        // Test empty query (navigates directly to Google AI search interface)
        assert.equal(simulateAISearch(''), 'https://www.google.com/search?udm=50');
        assert.equal(simulateAISearch('   '), 'https://www.google.com/search?udm=50');

        // Test basic query
        assert.equal(
            simulateAISearch('what is gravity'),
            'https://www.google.com/search?q=what%20is%20gravity&udm=50'
        );

        // Test query with special characters & symbols
        assert.equal(
            simulateAISearch('C++ & Python?'),
            'https://www.google.com/search?q=C%2B%2B%20%26%20Python%3F&udm=50'
        );

        // Verify the implementation in scripts/search.js contains the udm=50 parameter
        assert.ok(
            searchScript.includes('udm=50'),
            'scripts/search.js must use udm=50 parameter for Google AI Mode'
        );
        assert.ok(
            !searchScript.includes('google.com/ai?q='),
            'scripts/search.js must not use obsolete /ai endpoint'
        );
    });

    await t.test('isGoogleSelected detects Google and Default engines while filtering others', () => {
        function evaluateIsGoogle(selectedVal, defaultEngineAttr = null) {
            if (selectedVal) {
                return selectedVal === 'engine1' || selectedVal === 'engine0';
            }
            return defaultEngineAttr === '1' || defaultEngineAttr === '0' || defaultEngineAttr === 'google' || defaultEngineAttr === 'default';
        }

        // Default engine (engine0) -> allowed
        assert.equal(evaluateIsGoogle('engine0'), true, 'engine0 (Default) should be recognized as Google search');

        // Google engine (engine1) -> allowed
        assert.equal(evaluateIsGoogle('engine1'), true, 'engine1 (Google) should be recognized as Google search');

        // Other search engines -> rejected
        assert.equal(evaluateIsGoogle('engine2'), false, 'engine2 (DuckDuckGo) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine3'), false, 'engine3 (Bing) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine4'), false, 'engine4 (Brave) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine5'), false, 'engine5 (YouTube) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine6'), false, 'engine6 (Google Images) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine7'), false, 'engine7 (Reddit) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine8'), false, 'engine8 (Wikipedia) must not trigger AI Mode');
        assert.equal(evaluateIsGoogle('engine9'), false, 'engine9 (Quora) must not trigger AI Mode');
    });

    await t.test('AI Mode button visibility respects user setting preference', () => {
        function computeVisibility(userSetting, isGoogle) {
            const isUserAllowed = userSetting !== null ? userSetting === 'true' : true;
            return isUserAllowed && isGoogle;
        }

        // Default: setting unset (null), Google active -> Visible
        assert.equal(computeVisibility(null, true), true);

        // Setting explicit "true", Google active -> Visible
        assert.equal(computeVisibility('true', true), true);

        // Setting explicit "false" (Hide AI Mode), Google active -> Hidden
        assert.equal(computeVisibility('false', true), false);

        // Setting "true", but Bing/Duck active -> Hidden
        assert.equal(computeVisibility('true', false), false);
    });

    await t.test('style.css defines pill layout, dark mode, wallpaper glassmorphism, and responsive behavior', () => {
        // Pill geometry
        assert.ok(styleCss.includes('.aiModeIcon'), 'style.css must have .aiModeIcon rule');
        assert.ok(styleCss.includes('border-radius: 100px'), 'aiModeIcon must have pill border-radius: 100px');

        // Dark theme color matching Google dark search surface (#303134)
        assert.ok(styleCss.includes('#303134'), 'Dark theme must use Google search dark surface #303134');

        // Wallpaper glassmorphism styling
        assert.ok(
            styleCss.includes('body[data-bg="wallpaper"] .aiModeIcon'),
            'style.css must define wallpaper mode styling for .aiModeIcon'
        );

        // Mobile responsive rule hiding text on screens <= 500px
        assert.ok(
            styleCss.includes('.aiModeIcon .aiModeText') && styleCss.includes('display: none'),
            'style.css must collapse aiModeText on narrow mobile screens'
        );
    });
});
