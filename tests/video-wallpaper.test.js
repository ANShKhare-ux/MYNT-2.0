const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./helpers/loader');

test('Video Wallpaper Feature and Hardware Performance Optimization', async (t) => {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    const cssPath = path.join(ROOT_DIR, 'style.css');
    const styleCss = fs.readFileSync(cssPath, 'utf8');

    const wallpaperJsPath = path.join(ROOT_DIR, 'scripts', 'wallpaper.js');
    const wallpaperJs = fs.readFileSync(wallpaperJsPath, 'utf8');

    await t.test('index.html contains hardware-optimized background video element', () => {
        assert.ok(indexHtml.includes('id="bgVideo"'), 'index.html must define <video id="bgVideo">');
        assert.ok(indexHtml.includes('class="bgVideo"'), 'video element must have class "bgVideo"');
        assert.ok(indexHtml.includes('autoplay'), 'video element must have autoplay attribute');
        assert.ok(indexHtml.includes('loop'), 'video element must have loop attribute');
        assert.ok(indexHtml.includes('muted'), 'video element must be muted for smooth autoplay');
        assert.ok(indexHtml.includes('playsinline'), 'video element must have playsinline attribute');
        assert.ok(indexHtml.includes('disablepictureinpicture'), 'video element must disable picture-in-picture');
        assert.ok(indexHtml.includes('disableremoteplayback'), 'video element must disable remote playback');
    });

    await t.test('index.html contains video upload and play/pause toggle controls', () => {
        assert.ok(indexHtml.includes('id="uploadVideoTrigger"'), 'index.html must include video upload button');
        assert.ok(indexHtml.includes('id="videoPlayPauseTrigger"'), 'index.html must include play/pause toggle button');
        assert.ok(indexHtml.includes('id="videoPauseIcon"'), 'index.html must include pause icon');
        assert.ok(indexHtml.includes('id="videoPlayIcon"'), 'index.html must include play icon');
        assert.ok(indexHtml.includes('id="videoUpload"'), 'index.html must include video file input');
    });

    await t.test('checkIsVideo correctly distinguishes video and image formats', () => {
        // Extract checkIsVideo function from scripts/wallpaper.js
        const checkIsVideoMatch = wallpaperJs.match(/function checkIsVideo\s*\([^)]*\)\s*\{[\s\S]*?return\s+false;\s*\}/);
        assert.ok(checkIsVideoMatch, 'scripts/wallpaper.js must define checkIsVideo function');

        const fn = new Function(`${checkIsVideoMatch[0]}; return checkIsVideo;`)();

        // Valid video types
        assert.equal(fn({ type: 'video/mp4' }), true, 'video/mp4 must be recognized as video');
        assert.equal(fn({ type: 'video/webm' }), true, 'video/webm must be recognized as video');
        assert.equal(fn({ type: 'video/ogg' }), true, 'video/ogg must be recognized as video');
        assert.equal(fn({ name: 'background.mp4' }), true, '.mp4 filename must be recognized as video');
        assert.equal(fn({ name: 'clip.webm' }), true, '.webm filename must be recognized as video');
        assert.equal(fn({ name: 'movie.mov' }), true, '.mov filename must be recognized as video');

        // Images must return false
        assert.equal(fn({ type: 'image/png' }), false, 'image/png must not be treated as video');
        assert.equal(fn({ type: 'image/jpeg' }), false, 'image/jpeg must not be treated as video');
        assert.equal(fn({ type: 'image/webp' }), false, 'image/webp must not be treated as video');
        assert.equal(fn({ name: 'photo.jpg' }), false, '.jpg must not be treated as video');
        assert.equal(fn(null), false, 'null must safely return false');
    });

    await t.test('visibilitychange API listener immediately pauses video when tab is hidden', () => {
        assert.ok(
            wallpaperJs.includes('document.addEventListener("visibilitychange"'),
            'Must register visibilitychange listener to save CPU/GPU cycles'
        );
        assert.ok(
            wallpaperJs.includes('if (document.hidden)'),
            'Must check document.hidden state'
        );
        assert.ok(
            wallpaperJs.includes('video.pause()'),
            'Must call video.pause() when tab is hidden to drop decoding to 0%'
        );
    });

    await t.test('memory and decoder sessions are properly cleaned up to prevent RAM bloat on 8GB systems', () => {
        assert.ok(
            wallpaperJs.includes('URL.revokeObjectURL'),
            'Must revoke previous object URLs to prevent RAM leaks'
        );
        assert.ok(
            wallpaperJs.includes('video.removeAttribute("src")'),
            'Must remove src attribute when switching/clearing background'
        );
        assert.ok(
            wallpaperJs.includes('video.load()'),
            'Must call video.load() to flush hardware decoder buffers from memory'
        );
    });

    await t.test('style.css hardware-accelerates .bgVideo for Intel HD Graphics 630', () => {
        assert.ok(styleCss.includes('.bgVideo {'), 'style.css must declare .bgVideo rule');
        assert.ok(
            styleCss.includes('transform: translateZ(0)'),
            'Must promote video to hardware compositor layer via translateZ(0)'
        );
        assert.ok(
            styleCss.includes('will-change: transform'),
            'Must hint browser compositor via will-change: transform'
        );
        assert.ok(
            styleCss.includes('pointer-events: none'),
            'Must disable pointer-events to eliminate hit-testing repaints'
        );
        assert.ok(
            styleCss.includes('body[data-has-video="true"]'),
            'Must set transparent body background when video is active'
        );
    });

    await t.test('style.css excludes #bgVideo from dark inversion filter', () => {
        assert.ok(
            styleCss.includes('> *:not(.menuBar, #bookmarksContainer, #bgVideo)'),
            'Must exclude #bgVideo from dark invert filter to protect natural colors and GPU performance'
        );
    });
});
