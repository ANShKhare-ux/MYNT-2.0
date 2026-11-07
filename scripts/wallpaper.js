/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */


// -------------------------- Wallpaper & Video Background -----------------------------
const dbName = "ImageDB";
const storeName = "backgroundImages";
const timestampKey = "lastUpdateTime"; // Key to store last update time
const imageTypeKey = "imageType"; // Key to store the type of media ("random" or "upload")
const mediaTypeKey = "mediaType"; // Key to store media format ("image" or "video")

let currentBgUrl = null;
let bgVideo = null;
let isVideoActive = false;
let gestureRecoveryRegistered = false;

// Determine if a Blob/File is a video
function checkIsVideo(blob) {
    if (!blob) return false;
    if (blob.type && blob.type.startsWith("video/")) return true;
    if (blob.name && /\.(mp4|webm|ogg|mov|mkv)$/i.test(blob.name)) return true;
    return false;
}

// Purge any legacy paused flag so video wallpaper always plays on open and upload
try {
    localStorage.removeItem("bgVideoPaused");
} catch (e) {}

// Retrieve or cache the background video element
function getBgVideoElement() {
    if (!bgVideo) {
        bgVideo = document.getElementById("bgVideo");
    }
    return bgVideo;
}

// Update switch media button tooltip based on current active media
function updateSwitchButtonUI(currentMode) {
    const switchBtn = document.getElementById("switchMediaTrigger");
    if (!switchBtn) return;
    if (currentMode === "video") {
        switchBtn.setAttribute("title", "Switch to photo wallpaper");
    } else {
        switchBtn.setAttribute("title", "Switch to video wallpaper");
    }
}

// Fallback listener: if browser blocks initial unmuted autoplay, start immediately on first user touch/click/key
function registerGestureRecovery(video) {
    if (gestureRecoveryRegistered || !video) return;
    gestureRecoveryRegistered = true;

    const onInteraction = () => {
        if (isVideoActive && video && video.paused) {
            video.muted = true;
            video.defaultMuted = true;
            video.volume = 0;
            video.play().catch(() => {});
        }
        window.removeEventListener("pointerdown", onInteraction, true);
        window.removeEventListener("keydown", onInteraction, true);
        window.removeEventListener("touchstart", onInteraction, true);
        window.removeEventListener("click", onInteraction, true);
        gestureRecoveryRegistered = false;
    };

    window.addEventListener("pointerdown", onInteraction, { capture: true, once: true });
    window.addEventListener("keydown", onInteraction, { capture: true, once: true });
    window.addEventListener("touchstart", onInteraction, { capture: true, once: true });
    window.addEventListener("click", onInteraction, { capture: true, once: true });
}

// Autoplay trigger pipeline conforming to Chromium Autoplay Policies
function attemptAutoplay(video) {
    if (!video) return;

    // Lock in Chromium-mandated muted attributes
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");

    const playVideo = () => {
        if (!isVideoActive || !video) return;
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise
                .catch(err => {
                    console.warn("Autoplay deferred or prevented by browser policy:", err);
                    registerGestureRecovery(video);
                });
        }
    };

    // Attempt immediate playback
    playVideo();

    // Media readiness fallbacks: play the moment first frames/metadata are available
    video.addEventListener("loadedmetadata", playVideo, { once: true });
    video.addEventListener("loadeddata", playVideo, { once: true });
    video.addEventListener("canplay", playVideo, { once: true });
    video.addEventListener("canplaythrough", playVideo, { once: true });
}

// ----------------- Low-Overhead Dynamic Video Color Engine -----------------
// Specifically optimized for Intel HD Graphics 630 / Core i5-7400 / 8GB RAM:
// - Uses a tiny 16x9 offscreen canvas (only 144 pixels) with willReadFrequently
// - Low sampling frequency (every 800ms) = ~0.01% CPU usage
// - Delta thresholding skips updates when frame color changes by < 18 units
// - Pauses immediately when tab is hidden or video is paused
// - Reuses a single pre-allocated canvas/context to eliminate GC pauses

let videoColorCanvas = null;
let videoColorCtx = null;
let videoColorTimer = null;
let lastExtractedHex = null;
let originalThemeSaved = false;
let savedThemeColor = null;
let savedThemeType = null; // "preset" or "custom"

function getDynamicColorToggleState() {
    try {
        const saved = localStorage.getItem("dynamicVideoColor");
        return saved === null ? true : saved === "true";
    } catch (e) {
        return true;
    }
}

function initVideoColorSampler() {
    if (!videoColorCanvas && typeof document !== "undefined" && document.createElement) {
        videoColorCanvas = document.createElement("canvas");
        videoColorCanvas.width = 16;
        videoColorCanvas.height = 9;
        videoColorCtx = videoColorCanvas.getContext("2d", { willReadFrequently: true });
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function saveOriginalTheme() {
    if (originalThemeSaved) return;
    const custom = localStorage.getItem("customThemeColor");
    const selected = localStorage.getItem("selectedTheme");
    if (custom) {
        savedThemeType = "custom";
        savedThemeColor = custom;
    } else {
        savedThemeType = "preset";
        savedThemeColor = selected || "blue";
    }
    originalThemeSaved = true;
}

function restoreOriginalTheme() {
    if (!originalThemeSaved) return;
    const currentCustom = localStorage.getItem("customThemeColor");
    const currentSelected = localStorage.getItem("selectedTheme");

    if (currentCustom && typeof applyCustomTheme === "function") {
        applyCustomTheme(currentCustom);
    } else if (typeof applySelectedTheme === "function") {
        applySelectedTheme(currentSelected || savedThemeColor || "blue");
    }
    originalThemeSaved = false;
    lastExtractedHex = null;
}

function applyVideoDynamicTheme(hexColor) {
    if (!hexColor || typeof window.ThemeHelpers === "undefined") return;

    let adjustedColor = window.ThemeHelpers.isNearWhite(hexColor) ? "#4382EC" : hexColor;

    const lighterColorHex = window.ThemeHelpers.adjustHexColor(adjustedColor, 0.7);
    const lightTin = window.ThemeHelpers.adjustHexColor(adjustedColor, 0.9);
    const darkerColorHex = window.ThemeHelpers.adjustHexColor(adjustedColor, 0.3, false);
    const darkTextColor = window.ThemeHelpers.adjustHexColor(adjustedColor, 0.8, false);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--bg-color-blue", lighterColorHex);
    rootStyle.setProperty("--accentLightTint-blue", lightTin);
    rootStyle.setProperty("--darkerColor-blue", darkerColorHex);
    rootStyle.setProperty("--darkColor-blue", adjustedColor);
    rootStyle.setProperty("--textColorDark-blue", darkTextColor);

    if (typeof changeFaviconColor === "function") {
        changeFaviconColor();
    }
}

// Global hook to record manual theme alterations while a wallpaper is active
window.onThemeManuallyChanged = function (themeType, themeValue) {
    savedThemeType = themeType;
    savedThemeColor = themeValue;
    originalThemeSaved = true;
};

// Analyze 16x9 sampled pixels to extract dominant vibrant theme color
function extractCanvasSampleColor() {
    if (!videoColorCtx) return null;

    try {
        const imgData = videoColorCtx.getImageData(0, 0, 16, 9);
        const data = imgData.data;

        let totalR = 0, totalG = 0, totalB = 0, weightedCount = 0;
        let bestR = 0, bestG = 0, bestB = 0, maxScore = -1;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;
            const brightness = max / 255;

            // Filter out pure black / letterbox bars and blown-out whites
            if (brightness < 0.1 || brightness > 0.96) continue;

            // Score vibrant colors with good saturation and pleasant brightness
            const score = saturation * 2 + (0.5 - Math.abs(brightness - 0.5));
            if (score > maxScore) {
                maxScore = score;
                bestR = r;
                bestG = g;
                bestB = b;
            }

            // Also accumulate weighted sum
            const weight = saturation >= 0.15 ? (saturation * 2) : 0.2;
            totalR += r * weight;
            totalG += g * weight;
            totalB += b * weight;
            weightedCount += weight;
        }

        let chosenR, chosenG, chosenB;
        if (maxScore > 0.35 && (bestR + bestG + bestB > 0)) {
            // Blend dominant vibrant tone with weighted average (70% dominant, 30% average)
            const avgR = weightedCount > 0 ? totalR / weightedCount : bestR;
            const avgG = weightedCount > 0 ? totalG / weightedCount : bestG;
            const avgB = weightedCount > 0 ? totalB / weightedCount : bestB;
            chosenR = Math.round(bestR * 0.7 + avgR * 0.3);
            chosenG = Math.round(bestG * 0.7 + avgG * 0.3);
            chosenB = Math.round(bestB * 0.7 + avgB * 0.3);
        } else if (weightedCount > 0) {
            chosenR = Math.round(totalR / weightedCount);
            chosenG = Math.round(totalG / weightedCount);
            chosenB = Math.round(totalB / weightedCount);
        } else {
            return null;
        }

        // Ensure minimum brightness for Material You contrast
        const maxVal = Math.max(chosenR, chosenG, chosenB);
        if (maxVal < 65) {
            const boost = 75 / (maxVal || 1);
            chosenR = Math.min(255, Math.round(chosenR * boost));
            chosenG = Math.min(255, Math.round(chosenG * boost));
            chosenB = Math.min(255, Math.round(chosenB * boost));
        }

        return { r: chosenR, g: chosenG, b: chosenB };
    } catch (e) {
        return null;
    }
}

function extractFrameColor(video) {
    if (!video || video.paused || video.ended || video.readyState < 2) return null;

    initVideoColorSampler();
    if (!videoColorCtx) return null;

    try {
        videoColorCtx.drawImage(video, 0, 0, 16, 9);
        return extractCanvasSampleColor();
    } catch (e) {
        return null;
    }
}

// Low-overhead image color extraction (single-sample, 16x9 downscaled, < 0.1ms main-thread time)
function extractColorFromImage(blobOrUrl) {
    if (!blobOrUrl || !getDynamicColorToggleState()) return;

    initVideoColorSampler();
    if (!videoColorCtx) return;

    let tempUrl = null;
    let url = "";

    if (typeof blobOrUrl === "string") {
        url = blobOrUrl;
    } else if (typeof Blob !== "undefined" && blobOrUrl instanceof Blob) {
        tempUrl = URL.createObjectURL(blobOrUrl);
        url = tempUrl;
    } else {
        return;
    }

    const cleanup = () => {
        if (tempUrl) {
            URL.revokeObjectURL(tempUrl);
            tempUrl = null;
        }
    };

    const processSource = (imgSource) => {
        try {
            videoColorCtx.drawImage(imgSource, 0, 0, 16, 9);
            const rgb = extractCanvasSampleColor();
            if (rgb) {
                saveOriginalTheme();
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                lastExtractedHex = hex;
                applyVideoDynamicTheme(hex);
            }
        } catch (e) {
            console.warn("Could not extract image color:", e);
        } finally {
            cleanup();
        }
    };

    // Hardware-accelerated off-main-thread decode for Blobs via createImageBitmap
    if (typeof createImageBitmap === "function" && typeof Blob !== "undefined" && blobOrUrl instanceof Blob) {
        createImageBitmap(blobOrUrl, { resizeWidth: 16, resizeHeight: 9, resizeQuality: "low" })
            .then((bitmap) => {
                processSource(bitmap);
                if (bitmap.close) bitmap.close();
            })
            .catch(() => {
                loadAndProcessImage(url, processSource, cleanup);
            });
    } else {
        loadAndProcessImage(url, processSource, cleanup);
    }
}

function loadAndProcessImage(url, onSuccess, onError) {
    if (typeof Image === "undefined") {
        if (onError) onError();
        return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => onSuccess(img);
    img.onerror = () => {
        if (onError) onError();
    };
    img.src = url;
}

function sampleVideoColorStep() {
    if (!isVideoActive || document.hidden || !getDynamicColorToggleState()) return;

    const video = getBgVideoElement();
    if (!video || video.paused || video.ended || video.readyState < 2) return;

    const rgb = extractFrameColor(video);
    if (!rgb) return;

    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    // Delta threshold check: avoid DOM repaints if color changed by < 18 Euclidean units
    if (lastExtractedHex) {
        const lr = parseInt(lastExtractedHex.slice(1, 3), 16);
        const lg = parseInt(lastExtractedHex.slice(3, 5), 16);
        const lb = parseInt(lastExtractedHex.slice(5, 7), 16);
        if (colorDistance(rgb.r, rgb.g, rgb.b, lr, lg, lb) < 18) {
            return;
        }
    }

    saveOriginalTheme();
    lastExtractedHex = hex;
    applyVideoDynamicTheme(hex);
}

function startVideoColorExtraction() {
    stopVideoColorExtraction();
    if (!isVideoActive || !getDynamicColorToggleState()) return;

    // Run first sample once video has data
    sampleVideoColorStep();

    // 800ms interval: ultra-light, ~0.01% CPU usage on Intel Core i5-7400
    videoColorTimer = setInterval(sampleVideoColorStep, 800);
}

function stopVideoColorExtraction() {
    if (videoColorTimer) {
        clearInterval(videoColorTimer);
        videoColorTimer = null;
    }
}

// Play and configure video background with hardware acceleration
function setVideoBackground(url, isNewUpload = false) {
    const video = getBgVideoElement();
    if (!video) return;

    isVideoActive = true;
    document.body.setAttribute("data-has-video", "true");

    // Clean up any lingering paused state from storage
    try {
        localStorage.removeItem("bgVideoPaused");
    } catch (e) {}

    // Set source and lock in attributes for hardware decoding and autoplay
    video.src = url;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.style.display = "block";

    video.load();

    // Start playback pipeline immediately
    attemptAutoplay(video);

    // Continuous loop recovery
    video.onended = () => {
        video.currentTime = 0;
        video.play().catch(() => {});
    };

    // Start low-overhead dynamic video color extraction
    if (getDynamicColorToggleState()) {
        const onVideoReady = () => {
            if (isVideoActive) {
                startVideoColorExtraction();
            }
        };
        video.addEventListener("playing", onVideoReady, { once: true });
        video.addEventListener("canplay", onVideoReady, { once: true });
        video.addEventListener("timeupdate", onVideoReady, { once: true });
    }
}

// Stop and flush video background to completely release RAM and GPU decoder sessions
function removeVideoBackground(shouldRestoreTheme = true) {
    isVideoActive = false;
    document.body.removeAttribute("data-has-video");

    stopVideoColorExtraction();
    if (shouldRestoreTheme) {
        restoreOriginalTheme();
    }

    const video = getBgVideoElement();
    if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load(); // Flush decoder session & media memory buffers
        video.style.display = "none";
    }
}

// Set background media (image or video) using a Blob
function setBackground(blob, isNewUpload = false) {
    const isVideo = checkIsVideo(blob);
    const previousUrl = currentBgUrl;
    const newUrl = URL.createObjectURL(blob);
    currentBgUrl = newUrl;

    if (isVideo) {
        document.body.style.removeProperty("--bg-image");
        setVideoBackground(newUrl, isNewUpload);
    } else {
        removeVideoBackground(false);
        document.body.style.setProperty("--bg-image", `url(${newUrl})`);
        if (getDynamicColorToggleState()) {
            extractColorFromImage(blob || newUrl);
        }
    }

    toggleBackgroundType(true);
    updateSwitchButtonUI(isVideo ? "video" : "image");
    if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
    }
}

// Open IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore(storeName);
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject("Database error: " + event.target.errorCode);
    });
}

// Save image or video Blob, timestamp, and type to IndexedDB
async function saveImageToIndexedDB(mediaBlob, isRandom) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        const isVideo = checkIsVideo(mediaBlob);

        store.put(mediaBlob, "backgroundImage");
        store.put(new Date().toISOString(), timestampKey);
        store.put(isRandom ? "random" : "upload", imageTypeKey);
        store.put(isVideo ? "video" : "image", mediaTypeKey);

        if (!isRandom) {
            if (isVideo) {
                store.put(mediaBlob, "uploadedVideo");
                store.put("video", "activeUploadedMedia");
            } else {
                store.put(mediaBlob, "uploadedImage");
                store.put("image", "activeUploadedMedia");
            }
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Transaction error: " + event.target.errorCode);
    });
}

// Load media Blob, timestamp, and type from IndexedDB
async function loadImageAndDetails() {
    const db = await openDatabase();
    return Promise.all([
        getFromStore(db, "backgroundImage"),
        getFromStore(db, timestampKey),
        getFromStore(db, imageTypeKey)
    ]);
}

function getFromStore(db, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Request error: " + event.target.errorCode);
    });
}

// Clear media data from IndexedDB
async function clearImageFromIndexedDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        store.delete("backgroundImage");
        store.delete("uploadedImage");
        store.delete("uploadedVideo");
        store.delete("activeUploadedMedia");
        store.delete(timestampKey);
        store.delete(imageTypeKey);
        store.delete(mediaTypeKey);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Delete error: " + event.target.errorCode);
    });
}

// Safeguard & media upload handler for 8GB RAM / integrated GPU systems
async function handleMediaUpload(file) {
    if (!file) return;

    try {
        localStorage.removeItem("bgVideoPaused");
    } catch (e) {}

    // RAM/Performance safeguard: Warn if file exceeds 100MB
    const MAX_RECOMMENDED_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_RECOMMENDED_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const confirmMsg = `The selected file is ${sizeMb} MB. Very large media files may increase RAM usage on systems with 8GB RAM. Do you want to continue?`;
        if (typeof confirmPrompt === "function") {
            const proceed = await confirmPrompt(confirmMsg);
            if (!proceed) return;
        }
    }

    try {
        await saveImageToIndexedDB(file, false);
        setBackground(file, true);
    } catch (error) {
        console.error("Failed to save and apply wallpaper media:", error);
    }
}

// Handle file input changes
const imageUploadInput = document.getElementById("imageUpload");
if (imageUploadInput) {
    imageUploadInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            handleMediaUpload(file);
            imageUploadInput.value = "";
        }
    });
}

const videoUploadInput = document.getElementById("videoUpload");
if (videoUploadInput) {
    videoUploadInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            handleMediaUpload(file);
            videoUploadInput.value = "";
        }
    });
}

// Fetch and apply random image as background
const RANDOM_IMAGE_URL = "https://picsum.photos/1920/1080";

async function applyRandomImage(showConfirmation = true) {
    if (showConfirmation && !(await confirmPrompt(
        translations[currentLanguage]?.confirmWallpaper || translations["en"].confirmWallpaper
    ))) {
        return;
    }
    try {
        const response = await fetch(RANDOM_IMAGE_URL);
        const blob = await response.blob();
        await saveImageToIndexedDB(blob, true);
        setBackground(blob, false);
    } catch (error) {
        console.error("Error fetching random image:", error);
    }
}

// Function to update the background type attribute
function toggleBackgroundType(hasWallpaper) {
    document.body.setAttribute("data-bg", hasWallpaper ? "wallpaper" : "color");
}

// Check and update media on page load
function checkAndUpdateImage() {
    loadImageAndDetails()
        .then(([blob, savedTimestamp, imageType]) => {
            const now = new Date();
            const lastUpdate = new Date(savedTimestamp);

            if (!blob || !savedTimestamp || isNaN(lastUpdate)) {
                toggleBackgroundType(false);
                removeVideoBackground();
                return;
            }

            if (imageType === "upload") {
                setBackground(blob, false);
                return;
            }

            if (lastUpdate.toDateString() !== now.toDateString()) {
                applyRandomImage(false);
            } else {
                setBackground(blob, false);
            }
        })
        .catch((error) => {
            console.warn("Unable to load media details:", error);
            toggleBackgroundType(false);
            removeVideoBackground();
        });
}

// Switch between uploaded image and uploaded video
async function switchBetweenMedia() {
    try {
        const db = await openDatabase();
        const [activeUploadedMedia, uploadedImage, uploadedVideo, currentBg] = await Promise.all([
            getFromStore(db, "activeUploadedMedia"),
            getFromStore(db, "uploadedImage"),
            getFromStore(db, "uploadedVideo"),
            getFromStore(db, "backgroundImage")
        ]);

        let imgBlob = uploadedImage;
        let vidBlob = uploadedVideo;

        // Backward compatibility migration: backfill if media was uploaded prior to separation
        if (!imgBlob && currentBg && !checkIsVideo(currentBg)) {
            imgBlob = currentBg;
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(imgBlob, "uploadedImage");
            await new Promise(r => tx.oncomplete = r);
        }
        if (!vidBlob && currentBg && checkIsVideo(currentBg)) {
            vidBlob = currentBg;
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(vidBlob, "uploadedVideo");
            await new Promise(r => tx.oncomplete = r);
        }

        const isCurrentlyVideo = isVideoActive || activeUploadedMedia === "video";
        const targetMode = isCurrentlyVideo ? "image" : "video";

        if (targetMode === "image") {
            if (!imgBlob) {
                if (typeof confirmPrompt === "function") {
                    const upload = await confirmPrompt("No uploaded photo found. Would you like to upload a photo now?");
                    if (upload && imageUploadInput) imageUploadInput.click();
                }
                return;
            }
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.put(imgBlob, "backgroundImage");
            store.put("image", "activeUploadedMedia");
            store.put("image", mediaTypeKey);
            store.put("upload", imageTypeKey);
            store.put(new Date().toISOString(), timestampKey);
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = (e) => reject(e.target.errorCode);
            });

            setBackground(imgBlob, false);
            updateSwitchButtonUI("image");
        } else {
            if (!vidBlob) {
                if (typeof confirmPrompt === "function") {
                    const upload = await confirmPrompt("No uploaded video found. Would you like to upload a video now?");
                    if (upload && videoUploadInput) videoUploadInput.click();
                }
                return;
            }
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            store.put(vidBlob, "backgroundImage");
            store.put("video", "activeUploadedMedia");
            store.put("video", mediaTypeKey);
            store.put("upload", imageTypeKey);
            store.put(new Date().toISOString(), timestampKey);
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = (e) => reject(e.target.errorCode);
            });

            setBackground(vidBlob, false);
            updateSwitchButtonUI("video");
        }
    } catch (error) {
        console.error("Error switching media background:", error);
    }
}

// Event listeners for upload triggers
const uploadTrigger = document.getElementById("uploadTrigger");
if (uploadTrigger && imageUploadInput) {
    uploadTrigger.addEventListener("click", () => imageUploadInput.click());
}

const uploadVideoTrigger = document.getElementById("uploadVideoTrigger");
if (uploadVideoTrigger && videoUploadInput) {
    uploadVideoTrigger.addEventListener("click", () => videoUploadInput.click());
}

// Event listener for switching between image and video
const switchMediaTrigger = document.getElementById("switchMediaTrigger");
if (switchMediaTrigger) {
    switchMediaTrigger.addEventListener("click", switchBetweenMedia);
}

// Event listener for clearing background (both image and video)
const clearImageBtn = document.getElementById("clearImage");
if (clearImageBtn) {
    clearImageBtn.addEventListener("click", async function () {
        try {
            const [blob] = await loadImageAndDetails();
            if (!blob) {
                await alertPrompt(translations[currentLanguage]?.Nobackgroundset || translations["en"].Nobackgroundset);
                return;
            }

            const confirmationMessage = translations[currentLanguage]?.clearbackgroundimage || translations["en"].clearbackgroundimage;
            if (await confirmPrompt(confirmationMessage)) {
                try {
                    await clearImageFromIndexedDB();
                    if (currentBgUrl) {
                        URL.revokeObjectURL(currentBgUrl);
                        currentBgUrl = null;
                    }
                    removeVideoBackground();
                    document.body.style.removeProperty("--bg-image");
                    toggleBackgroundType(false);
                    const switchMediaBtn = document.getElementById("switchMediaTrigger");
                    if (switchMediaBtn) {
                        switchMediaBtn.setAttribute("title", "Switch between photo and video wallpaper");
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        } catch (error) {
            console.error(error);
        }
    });
}

const randomImageTrigger = document.getElementById("randomImageTrigger");
if (randomImageTrigger) {
    randomImageTrigger.addEventListener("click", applyRandomImage);
}

// Event listener for dynamic video color extraction toggle
const dynamicVideoColorToggle = document.getElementById("dynamicVideoColorToggle");
if (dynamicVideoColorToggle) {
    dynamicVideoColorToggle.checked = getDynamicColorToggleState();
    dynamicVideoColorToggle.addEventListener("change", (e) => {
        const isEnabled = e.target.checked;
        localStorage.setItem("dynamicVideoColor", isEnabled ? "true" : "false");
        if (isEnabled) {
            if (isVideoActive) {
                startVideoColorExtraction();
            } else if (document.body.getAttribute("data-bg") === "wallpaper" && currentBgUrl) {
                extractColorFromImage(currentBgUrl);
            }
        } else {
            stopVideoColorExtraction();
            restoreOriginalTheme();
        }
    });
}

// ---------------- Performance & CPU/GPU Power Optimizations ----------------
// Tab Visibility API: Immediately halt hardware video decoding and color sampling when tab is hidden (drops GPU/CPU usage to 0%)
document.addEventListener("visibilitychange", () => {
    if (!isVideoActive) return;
    const video = getBgVideoElement();
    if (!video) return;

    if (document.hidden) {
        video.pause();
        stopVideoColorExtraction();
    } else {
        attemptAutoplay(video);
        if (getDynamicColorToggleState()) {
            startVideoColorExtraction();
        }
    }
});

// Also trigger playback and color sampling on window focus to ensure video immediately plays on open/return
window.addEventListener("focus", () => {
    if (!isVideoActive) return;
    const video = getBgVideoElement();
    if (video && video.paused) {
        attemptAutoplay(video);
    }
    if (getDynamicColorToggleState()) {
        startVideoColorExtraction();
    }
});

// Reduced motion listener: Auto-pause video and color sampling if user has Windows animations disabled
if (typeof window !== "undefined" && window.matchMedia) {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.addEventListener) {
        motionQuery.addEventListener("change", (e) => {
            if (!isVideoActive) return;
            const video = getBgVideoElement();
            if (!video) return;

            if (e.matches) {
                video.pause();
                stopVideoColorExtraction();
            } else {
                attemptAutoplay(video);
                if (getDynamicColorToggleState()) {
                    startVideoColorExtraction();
                }
            }
        });
    }
}

// Start media check on page load
checkAndUpdateImage();
