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

// Determine if a Blob/File is a video
function checkIsVideo(blob) {
    if (!blob) return false;
    if (blob.type && blob.type.startsWith("video/")) return true;
    if (blob.name && /\.(mp4|webm|ogg|mov|mkv)$/i.test(blob.name)) return true;
    return false;
}

// Retrieve or cache the background video element
function getBgVideoElement() {
    if (!bgVideo) {
        bgVideo = document.getElementById("bgVideo");
    }
    return bgVideo;
}

// Update play/pause toggle button UI
function updateVideoControlsUI(isPlaying) {
    const playIcon = document.getElementById("videoPlayIcon");
    const pauseIcon = document.getElementById("videoPauseIcon");
    const videoPlayPauseTrigger = document.getElementById("videoPlayPauseTrigger");

    if (playIcon && pauseIcon) {
        if (isPlaying) {
            pauseIcon.style.display = "block";
            playIcon.style.display = "none";
            if (videoPlayPauseTrigger) videoPlayPauseTrigger.setAttribute("title", "Pause Video Background");
        } else {
            pauseIcon.style.display = "none";
            playIcon.style.display = "block";
            if (videoPlayPauseTrigger) videoPlayPauseTrigger.setAttribute("title", "Play Video Background");
        }
    }
}

// Play and configure video background with hardware acceleration
function setVideoBackground(url) {
    const video = getBgVideoElement();
    if (!video) return;

    isVideoActive = true;
    document.body.setAttribute("data-has-video", "true");

    video.src = url;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.style.display = "block";

    const isUserPaused = localStorage.getItem("bgVideoPaused") === "true";
    const isReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isUserPaused || isReducedMotion) {
        video.pause();
        updateVideoControlsUI(false);
    } else {
        video.play().catch(err => {
            console.warn("Video background playback interrupted:", err);
            updateVideoControlsUI(false);
        });
        updateVideoControlsUI(true);
    }

    const videoPlayPauseTrigger = document.getElementById("videoPlayPauseTrigger");
    if (videoPlayPauseTrigger) {
        videoPlayPauseTrigger.style.display = "flex";
    }
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

    const videoPlayPauseTrigger = document.getElementById("videoPlayPauseTrigger");
    if (videoPlayPauseTrigger) {
        videoPlayPauseTrigger.style.display = "none";
    }
}

// Set background media (image or video) using a Blob
function setBackground(blob) {
    const isVideo = checkIsVideo(blob);
    const previousUrl = currentBgUrl;
    const newUrl = URL.createObjectURL(blob);
    currentBgUrl = newUrl;

    if (isVideo) {
        document.body.style.removeProperty("--bg-image");
        setVideoBackground(newUrl);
    } else {
        removeVideoBackground();
        document.body.style.setProperty("--bg-image", `url(${newUrl})`);
    }

    toggleBackgroundType(true);
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
        setBackground(file);
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
        setBackground(blob);
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
                setBackground(blob);
                return;
            }

            if (lastUpdate.toDateString() !== now.toDateString()) {
                applyRandomImage(false);
            } else {
                setBackground(blob);
            }
        })
        .catch((error) => {
            console.warn("Unable to load media details:", error);
            toggleBackgroundType(false);
            removeVideoBackground();
        });
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

// Event listener for video play/pause toggle button
const videoPlayPauseTrigger = document.getElementById("videoPlayPauseTrigger");
if (videoPlayPauseTrigger) {
    videoPlayPauseTrigger.addEventListener("click", () => {
        const video = getBgVideoElement();
        if (!video || !video.src) return;

        if (video.paused) {
            video.play().then(() => {
                localStorage.setItem("bgVideoPaused", "false");
                updateVideoControlsUI(true);
            }).catch(err => console.error(err));
        } else {
            video.pause();
            localStorage.setItem("bgVideoPaused", "true");
            updateVideoControlsUI(false);
        }
    });
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
        const isUserPaused = localStorage.getItem("bgVideoPaused") === "true";
        const isReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!isUserPaused && !isReducedMotion) {
            video.play().catch(() => {});
            updateVideoControlsUI(true);
        }
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
                updateVideoControlsUI(false);
            } else {
                const isUserPaused = localStorage.getItem("bgVideoPaused") === "true";
                if (!isUserPaused) {
                    video.play().catch(() => {});
                    updateVideoControlsUI(true);
                }
            }
        });
    }
}

// Start media check on page load
checkAndUpdateImage();
