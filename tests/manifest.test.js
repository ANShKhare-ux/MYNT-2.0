const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./helpers/loader');

test('Manifest V3 Integrity and Schema Validation', async (t) => {
    const manifestPath = path.join(ROOT_DIR, 'manifest.json');

    await t.test('manifest.json exists and is valid JSON', () => {
        assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist at root');
        const content = fs.readFileSync(manifestPath, 'utf8');
        assert.doesNotThrow(() => JSON.parse(content), 'manifest.json must be valid JSON');
    });

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    await t.test('manifest specifies MV3 and required metadata', () => {
        assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
        assert.ok(typeof manifest.name === 'string' && manifest.name.length > 0, 'name must be non-empty');
        assert.ok(typeof manifest.version === 'string' && /^\d+\.\d+(\.\d+)?(\.\d+)?$/.test(manifest.version), 'version must follow semver-like format');
        assert.ok(typeof manifest.description === 'string' && manifest.description.length > 0, 'description must be non-empty');
    });

    await t.test('new tab override points to an existing file', () => {
        assert.ok(manifest.chrome_url_overrides, 'chrome_url_overrides must be defined');
        assert.ok(manifest.chrome_url_overrides.newtab, 'chrome_url_overrides.newtab must be defined');
        const targetPath = path.join(ROOT_DIR, manifest.chrome_url_overrides.newtab);
        assert.ok(fs.existsSync(targetPath), `Override target "${manifest.chrome_url_overrides.newtab}" must exist on disk`);
    });

    await t.test('background service worker points to an existing file', () => {
        assert.ok(manifest.background, 'background configuration must exist');
        assert.ok(manifest.background.service_worker, 'service_worker path must be defined');
        const swPath = path.join(ROOT_DIR, manifest.background.service_worker);
        assert.ok(fs.existsSync(swPath), `Service worker "${manifest.background.service_worker}" must exist on disk`);
    });

    await t.test('all referenced icon assets exist on disk', () => {
        assert.ok(manifest.icons, 'icons definition must exist');
        for (const [size, relPath] of Object.entries(manifest.icons)) {
            const iconPath = path.join(ROOT_DIR, relPath);
            assert.ok(fs.existsSync(iconPath), `Icon (${size}px) at "${relPath}" must exist on disk`);
        }
    });

    await t.test('permissions configuration matches extension scope', () => {
        assert.deepEqual(manifest.permissions, ['search'], 'Core permissions should be limited to search');
        assert.ok(Array.isArray(manifest.optional_permissions), 'optional_permissions must be an array');
        assert.ok(manifest.optional_permissions.includes('bookmarks'), 'Bookmarks permission should be optional');
        assert.ok(manifest.optional_permissions.includes('favicon'), 'Favicon permission should be optional');
    });
});
