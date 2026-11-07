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

    await t.test('index.html contains video upload controls and removes manual play/pause toggle controls', () => {
        assert.ok(indexHtml.includes('id="uploadVideoTrigger"'), 'index.html must include video upload button');
        assert.ok(indexHtml.includes('id="videoUpload"'), 'index.html must include video file input');
        assert.equal(indexHtml.includes('id="videoPlayPauseTrigger"'), false, 'play/pause button removed so video always plays cleanly');
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

    await t.test('scripts/wallpaper.js enforces Chromium-compliant muted autoplay pipeline with gesture recovery', () => {
        assert.ok(
            wallpaperJs.includes('function attemptAutoplay'),
            'Must implement attemptAutoplay pipeline function'
        );
        assert.ok(
            wallpaperJs.includes('video.setAttribute("muted", "")'),
            'Must explicitly set muted attribute for Chromium autoplay policy'
        );
        assert.ok(
            wallpaperJs.includes('video.load()'),
            'Must call video.load() when source is attached to kick off decoder loading'
        );
        assert.ok(
            wallpaperJs.includes('canplay') && wallpaperJs.includes('loadeddata'),
            'Must hook canplay and loadeddata readiness events to trigger playback once buffered'
        );
        assert.ok(
            wallpaperJs.includes('registerGestureRecovery'),
            'Must implement gesture recovery fallback on first interaction if browser blocks initial autoplay'
        );
    });

    await t.test('index.html and style.css define dual-media switch button', () => {
        assert.ok(indexHtml.includes('id="switchMediaTrigger"'), 'index.html must include #switchMediaTrigger button');
        assert.ok(indexHtml.includes('class="switchMediaButton"'), 'index.html must use switchMediaButton class');
        assert.ok(styleCss.includes('.switchMediaButton'), 'style.css must style .switchMediaButton');
        assert.ok(styleCss.includes('.black-theme .switchMediaButton'), 'style.css must theme .switchMediaButton for dark mode');
    });

    await t.test('scripts/wallpaper.js implements dual-media switching and persistence (uploadedImage & uploadedVideo)', () => {
        assert.ok(
            wallpaperJs.includes('function switchBetweenMedia'),
            'scripts/wallpaper.js must define switchBetweenMedia function'
        );
        assert.ok(
            wallpaperJs.includes('"uploadedImage"') && wallpaperJs.includes('"uploadedVideo"'),
            'scripts/wallpaper.js must manage separate storage slots for uploadedImage and uploadedVideo'
        );
        assert.ok(
            wallpaperJs.includes('"activeUploadedMedia"'),
            'scripts/wallpaper.js must track activeUploadedMedia state'
        );
        assert.ok(
            wallpaperJs.includes('switchMediaTrigger.addEventListener("click", switchBetweenMedia)'),
            'Must bind switchMediaTrigger click event to switchBetweenMedia'
        );
        assert.ok(
            wallpaperJs.includes('function updateSwitchButtonUI'),
            'Must define updateSwitchButtonUI for dynamic tooltip and mode indication'
        );
    });

    await t.test('Dynamic Video Color Engine: low-overhead hardware optimization for Intel HD 630 / i5-7400', () => {
        // UI & Settings toggle
        assert.ok(indexHtml.includes('id="dynamicVideoColorControl"'), 'index.html must include dynamic video color control container');
        assert.ok(indexHtml.includes('id="dynamicVideoColorToggle"'), 'index.html must include dynamic video color toggle input');
        assert.ok(styleCss.includes('.dynamicVideoColorControl'), 'style.css must style .dynamicVideoColorControl');
        assert.ok(styleCss.includes('body[data-has-video="true"] .dynamicVideoColorControl'), 'Dynamic color toggle only displayed when video is active');

        // Ambient fluid transitions
        assert.ok(
            styleCss.includes('body[data-has-video="true"] .searchbar') &&
            styleCss.includes('transition: background-color 0.8s ease'),
            'style.css must define 0.8s fluid ambient color transitions during video playback'
        );

        // Core extraction functions in wallpaper.js
        assert.ok(wallpaperJs.includes('function initVideoColorSampler'), 'Must implement sampler initialization');
        assert.ok(wallpaperJs.includes('videoColorCanvas.width = 16'), 'Must downsample to 16px width (only 144 total pixels) for minimal RAM/CPU');
        assert.ok(wallpaperJs.includes('videoColorCanvas.height = 9'), 'Must downsample to 9px height for 16:9 aspect ratio');
        assert.ok(wallpaperJs.includes('willReadFrequently: true'), 'Must hint 2D canvas context with willReadFrequently for GPU readback performance');
        assert.ok(wallpaperJs.includes('setInterval(sampleVideoColorStep, 800)'), 'Must throttle color sampling to 800ms interval (~0.01% CPU usage)');

        // Delta thresholding
        assert.ok(wallpaperJs.includes('function colorDistance'), 'Must implement colorDistance for Euclidean delta calculation');
        assert.ok(wallpaperJs.includes('colorDistance(rgb.r, rgb.g, rgb.b, lr, lg, lb) < 18'), 'Must discard color mutations < 18 units to eliminate layout thrash');

        // Tab visibility and motion lifecycle
        assert.ok(wallpaperJs.includes('function startVideoColorExtraction'), 'Must implement startVideoColorExtraction');
        assert.ok(wallpaperJs.includes('function stopVideoColorExtraction'), 'Must implement stopVideoColorExtraction');
        assert.ok(wallpaperJs.includes('function saveOriginalTheme'), 'Must save user original theme before dynamic extraction');
        assert.ok(wallpaperJs.includes('function restoreOriginalTheme'), 'Must restore user original theme when video stops or toggle disabled');

        // Toggle event handling
        assert.ok(
            wallpaperJs.includes('dynamicVideoColorToggle.addEventListener("change"'),
            'Must bind dynamicVideoColorToggle change event listener'
        );
        assert.ok(
            wallpaperJs.includes('localStorage.setItem("dynamicVideoColor"'),
            'Must persist dynamic video color user preference in localStorage'
        );
    });

    await t.test('Dynamic Image Color Engine: adapts theme when photo wallpaper is set or changed', () => {
        const themeJsPath = path.join(ROOT_DIR, 'scripts', 'theme.js');
        const themeJs = fs.readFileSync(themeJsPath, 'utf8');

        // Core image extraction functions in wallpaper.js
        assert.ok(wallpaperJs.includes('function extractColorFromImage'), 'Must define extractColorFromImage');
        assert.ok(wallpaperJs.includes('function extractCanvasSampleColor'), 'Must define extractCanvasSampleColor');
        assert.ok(wallpaperJs.includes('createImageBitmap(blobOrUrl'), 'Must use hardware-accelerated off-thread decoding when available');
        assert.ok(wallpaperJs.includes('loadAndProcessImage(url'), 'Must support fallback Image element loading');

        // Integration with setBackground
        assert.ok(
            wallpaperJs.includes('extractColorFromImage(blob || newUrl)'),
            'Must invoke extractColorFromImage when an image wallpaper is applied in setBackground'
        );

        // Fluid ambient CSS transitions in wallpaper mode
        assert.ok(
            styleCss.includes('body[data-bg="wallpaper"] .searchbar') &&
            styleCss.includes('body[data-bg="wallpaper"] .switchMediaButton'),
            'style.css must apply 0.8s fluid color transitions when an image wallpaper is active'
        );

        // Dynamic wallpaper theme toggle shown in wallpaper mode
        assert.ok(
            styleCss.includes('body[data-bg="wallpaper"] .dynamicVideoColorControl'),
            'style.css must display dynamic color toggle when any wallpaper is active'
        );

        // Manual theme change sync in theme.js
        assert.ok(
            themeJs.includes('window.onThemeManuallyChanged("preset"'),
            'theme.js must notify wallpaper engine when preset theme is manually selected'
        );
        assert.ok(
            themeJs.includes('window.onThemeManuallyChanged("custom"'),
            'theme.js must notify wallpaper engine when custom color is manually selected'
        );
    });
});
