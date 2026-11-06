const test = require('node:test');
const assert = require('node:assert/strict');
const { loadShortcutSecurityHelpers } = require('./helpers/loader');

test('Shortcut Security and Sanitization Helpers', async (t) => {
    const {
        escapeHtml,
        isValidCustomIconUrl,
        sanitizeSvg,
        normalizeUrl
    } = loadShortcutSecurityHelpers({
        getItem: (key) => (key === 'selectedTheme' ? 'dark' : '#bfbfbf')
    });

    await t.test('escapeHtml prevents XSS injection by escaping HTML entities', () => {
        assert.equal(
            escapeHtml('<script>alert("XSS")</script>'),
            '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
        );
        assert.equal(
            escapeHtml('Tom & Jerry\'s "Adventure"'),
            'Tom &amp; Jerry&#39;s &quot;Adventure&quot;'
        );
    });

    await t.test('isValidCustomIconUrl accepts valid image protocols and data URIs', () => {
        assert.equal(isValidCustomIconUrl('https://example.com/icon.png'), true);
        assert.equal(isValidCustomIconUrl('http://example.com/icon.svg'), true);
        assert.equal(isValidCustomIconUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), true);
        assert.equal(isValidCustomIconUrl('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E'), true);
    });

    await t.test('isValidCustomIconUrl rejects invalid or unsafe URL schemes', () => {
        assert.equal(isValidCustomIconUrl('javascript:alert(1)'), false);
        assert.equal(isValidCustomIconUrl('file:///etc/passwd'), false);
        assert.equal(isValidCustomIconUrl('ftp://example.com'), false);
        assert.equal(isValidCustomIconUrl('https://example.com/icon with spaces.png'), false);
        assert.equal(isValidCustomIconUrl(null), false);
        assert.equal(isValidCustomIconUrl(123), false);
    });

    await t.test('sanitizeSvg allows safe SVG structures and formats as data URI', () => {
        const safeSvg = '<svg viewBox="0 0 24 24"><path d="M10 10" fill="currentColor"/></svg>';
        const result = sanitizeSvg(safeSvg);
        assert.ok(result && result.startsWith('data:image/svg+xml;charset=utf-8,'), 'Must return SVG data URI');
        assert.ok(result.includes('%23bfbfbf'), 'currentColor should be substituted with accent color');
    });

    await t.test('sanitizeSvg rejects malicious SVG payloads with embedded scripts or handlers', () => {
        assert.equal(sanitizeSvg('<svg><script>alert(1)</script></svg>'), null, 'Must reject <script>');
        assert.equal(sanitizeSvg('<svg onload="alert(1)"></svg>'), null, 'Must reject onload handler');
        assert.equal(sanitizeSvg('<svg><circle onclick="alert(1)" r="5"/></svg>'), null, 'Must reject onclick handler');
        assert.equal(sanitizeSvg('<svg><foreignObject><div>x</div></foreignObject></svg>'), null, 'Must reject foreignObject');
        assert.equal(sanitizeSvg('<svg><iframe></iframe></svg>'), null, 'Must reject iframe');
        assert.equal(sanitizeSvg('<svg><a href="javascript:alert(1)"></a></svg>'), null, 'Must reject javascript: URI');
        assert.equal(sanitizeSvg('<div>not an svg</div>'), null, 'Must reject non-SVG markup');
    });

    await t.test('normalizeUrl prepends https:// when protocol is missing and trims input', () => {
        assert.equal(normalizeUrl('github.com'), 'https://github.com');
        assert.equal(normalizeUrl('https://github.com'), 'https://github.com');
        assert.equal(normalizeUrl('http://localhost:8080'), 'http://localhost:8080');
        assert.equal(normalizeUrl('   duckduckgo.com  '), 'https://duckduckgo.com');
    });
});
