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
}

// Stop and flush video background to completely release RAM and GPU decoder sessions
function removeVideoBackground() {
    isVideoActive = false;
    document.body.removeAttribute("data-has-video");

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
        removeVideoBackground();
        document.body.style.setProperty("--bg-image", `url(${newUrl})`);
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

// ---------------- Performance & CPU/GPU Power Optimizations ----------------
// Tab Visibility API: Immediately halt hardware video decoding when tab is hidden (drops GPU/CPU usage to 0%)
document.addEventListener("visibilitychange", () => {
    if (!isVideoActive) return;
    const video = getBgVideoElement();
    if (!video) return;

    if (document.hidden) {
        video.pause();
    } else {
        attemptAutoplay(video);
    }
});

// Also trigger playback on window focus to ensure video immediately plays on open/return
window.addEventListener("focus", () => {
    if (!isVideoActive) return;
    const video = getBgVideoElement();
    if (video && video.paused) {
        attemptAutoplay(video);
    }
});

// Reduced motion listener: Auto-pause video if user has Windows animations disabled
if (typeof window !== "undefined" && window.matchMedia) {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.addEventListener) {
        motionQuery.addEventListener("change", (e) => {
            if (!isVideoActive) return;
            const video = getBgVideoElement();
            if (!video) return;

            if (e.matches) {
                video.pause();
            } else {
                attemptAutoplay(video);
            }
        });
    }
}

// Start media check on page load
checkAndUpdateImage();
