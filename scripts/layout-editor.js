/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Layout Editor: Allows users to freely drag and edit positions of all
 * dashboard elements (Clock, Weather, Searchbar, Quotes, Shortcuts, and Corner Actions).
 * Positions are persisted in localStorage under 'mynt_element_positions' and restored
 * instantaneously without layout shifts.
 */

(function () {
    const STORAGE_KEY = 'mynt_element_positions';
    const STYLE_ID = 'custom-layout-positions-style';

    // List of all editable dashboard elements
    const EDITABLE_ELEMENTS = [
        {
            id: 'clock',
            name: 'Clock',
            selector: '#analogClock, #digitalClock',
            type: 'center',
            defaultWidth: 300
        },
        {
            id: 'dateGreeting',
            name: 'Date & Greeting',
            selector: '.ttteexxtt',
            type: 'center',
            defaultWidth: 260
        },
        {
            id: 'weather',
            name: 'Weather',
            selector: '#hideWeather',
            type: 'center',
            defaultWidth: 540
        },
        {
            id: 'searchbar',
            name: 'Search Bar',
            selector: '#searchbar',
            type: 'center',
            defaultWidth: 640
        },
        {
            id: 'quotes',
            name: 'Quotes',
            selector: '#motivationalQuotesCont',
            type: 'center',
            defaultWidth: 640
        },
        {
            id: 'shortcuts',
            name: 'Shortcuts Dock',
            selector: '.shortcutsContainer',
            type: 'fixed',
            defaultWidth: 460
        },
        {
            id: 'todo',
            name: 'ToDo Icon',
            selector: '#todoListCont',
            type: 'fixed',
            defaultWidth: 56
        },
        {
            id: 'bookmarks',
            name: 'Bookmarks Icon',
            selector: '#bookmarkButton',
            type: 'fixed',
            defaultWidth: 56
        },
        {
            id: 'googleApps',
            name: 'Google Apps',
            selector: '#googleAppsCont',
            type: 'fixed',
            defaultWidth: 56
        },
        {
            id: 'aiTools',
            name: 'AI Tools',
            selector: '#aiToolsCont',
            type: 'fixed',
            defaultWidth: 140
        },
        {
            id: 'menuButton',
            name: 'Menu Button',
            selector: '#menuButton',
            type: 'fixed',
            defaultWidth: 50
        }
    ];

    let isEditMode = false;
    let snapEnabled = true;
    let activeDrag = null;

    /**
     * Retrieves saved element positions from localStorage.
     */
    function getSavedPositions() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Error reading custom element positions:', e);
            return {};
        }
    }

    /**
     * Generates clean declarative CSS rules for all saved positions and updates #custom-layout-positions-style.
     */
    function applySavedPositions(positions) {
        let styleEl = document.getElementById(STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            document.head.appendChild(styleEl);
        }

        if (!positions || Object.keys(positions).length === 0) {
            styleEl.textContent = '';
            // Remove data-custom-pos attributes
            document.querySelectorAll('[data-custom-pos]').forEach(el => {
                el.removeAttribute('data-custom-pos');
            });
            return;
        }

        let css = '';
        EDITABLE_ELEMENTS.forEach(item => {
            const pos = positions[item.id];
            if (!pos) return;

            // Mark DOM elements as customized
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => el.setAttribute('data-custom-pos', 'true'));

            const left = Math.round(typeof pos.left === 'number' ? pos.left : 0);
            const top = Math.round(typeof pos.top === 'number' ? pos.top : 0);

            if (item.id === 'searchbar') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        width: min(640px, calc(100vw - 32px)) !important;
                        margin: 0 !important;
                        z-index: 40 !important;
                    }
                    #resultBox {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top + 68}px !important;
                        width: min(640px, calc(100vw - 32px)) !important;
                        z-index: 45 !important;
                    }
                    #search-with-container {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top + 68}px !important;
                        z-index: 44 !important;
                    }
                `;
            } else if (item.id === 'quotes') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        width: min(640px, calc(100vw - 32px)) !important;
                        margin: 0 !important;
                        z-index: 20 !important;
                    }
                `;
            } else if (item.id === 'shortcuts') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        margin: 0 !important;
                        z-index: 30 !important;
                        pointer-events: auto !important;
                    }
                `;
            } else if (item.id === 'weather') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        margin: 0 !important;
                        z-index: 20 !important;
                    }
                `;
            } else if (item.id === 'clock') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        margin: 0 !important;
                        z-index: 20 !important;
                    }
                `;
            } else if (item.id === 'dateGreeting') {
                css += `
                    ${item.selector} {
                        position: fixed !important;
                        left: ${left}px !important;
                        top: ${top}px !important;
                        margin: 0 !important;
                        z-index: 20 !important;
                        text-align: center !important;
                    }
                `;
            } else {
                css += `
                    ${item.selector} {
                        left: ${left}px !important;
                        top: ${top}px !important;
                        right: auto !important;
                        bottom: auto !important;
                        margin: 0 !important;
                    }
                `;
            }
        });

        styleEl.textContent = css;
    }

    /**
     * Saves updated positions map to localStorage and updates stylesheet.
     */
    function savePositions(positions) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
            applySavedPositions(positions);
        } catch (e) {
            console.error('Failed to save element positions:', e);
        }
    }

    /**
     * Resets all positions back to default and cleans up styles.
     */
    function resetPositions() {
        localStorage.removeItem(STORAGE_KEY);
        applySavedPositions({});

        // Clear any inline styles that might remain
        EDITABLE_ELEMENTS.forEach(item => {
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                el.style.left = '';
                el.style.top = '';
                el.style.right = '';
                el.style.bottom = '';
                el.style.position = '';
                el.style.margin = '';
                el.style.zIndex = '';
                el.removeAttribute('data-custom-pos');
            });
        });

        const resultBox = document.getElementById('resultBox');
        if (resultBox) {
            resultBox.style.left = '';
            resultBox.style.top = '';
            resultBox.style.position = '';
        }

        const searchWith = document.getElementById('search-with-container');
        if (searchWith) {
            searchWith.style.left = '';
            searchWith.style.top = '';
            searchWith.style.position = '';
        }

        showToast('Layout restored to default');
    }

    /**
     * Prepares all dashboard elements for dragging.
     */
    function setupEditableElements() {
        EDITABLE_ELEMENTS.forEach(item => {
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                el.setAttribute('data-editable-element', item.id);
                el.setAttribute('data-element-name', item.name);
                attachDragListener(el, item);
            });
        });
    }

    /**
     * Binds pointerdown listeners for dragging in Edit Mode or Shift+Drag / Alt+Drag.
     */
    function attachDragListener(element, itemConfig) {
        if (element._layoutDragAttached) return;
        element._layoutDragAttached = true;

        const onPointerDown = function (e) {
            // Only primary mouse button or touch
            if (e.button && e.button !== 0) return;

            // In normal mode, allow dragging if Shift or Alt key is held
            if (!isEditMode && !e.shiftKey && !e.altKey) return;

            // Ignore if clicked on toolbar
            if (e.target.closest('#layoutEditorToolbar')) return;

            startDrag(element, itemConfig, e);
        };

        element.addEventListener('mousedown', onPointerDown);
        element.addEventListener('touchstart', onPointerDown, { passive: false });
    }

    /**
     * Starts dragging an element.
     */
    function startDrag(element, itemConfig, e) {
        e.preventDefault();
        e.stopPropagation();

        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const rect = element.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        element.classList.add('is-dragging');
        showCenterGuide(false);

        activeDrag = {
            element,
            config: itemConfig,
            offsetX,
            offsetY,
            elemWidth: rect.width,
            elemHeight: rect.height,
            isTouch
        };

        const onPointerMove = function (ev) {
            if (!activeDrag) return;
            const curX = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientX : clientX) : ev.clientX;
            const curY = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientY : clientY) : ev.clientY;

            let targetLeft = curX - activeDrag.offsetX;
            let targetTop = curY - activeDrag.offsetY;

            // Keep within viewport bounds
            targetLeft = Math.max(10, Math.min(targetLeft, window.innerWidth - activeDrag.elemWidth - 10));
            targetTop = Math.max(10, Math.min(targetTop, window.innerHeight - activeDrag.elemHeight - 10));

            // Magnetic snap to center vertical axis
            let isSnapped = false;
            if (snapEnabled) {
                const widgetCenterX = targetLeft + activeDrag.elemWidth / 2;
                const screenCenterX = window.innerWidth / 2;
                if (Math.abs(widgetCenterX - screenCenterX) < 20) {
                    targetLeft = Math.round(screenCenterX - activeDrag.elemWidth / 2);
                    isSnapped = true;
                }
            }

            showCenterGuide(isSnapped);

            requestAnimationFrame(() => {
                if (!activeDrag) return;

                activeDrag.element.style.setProperty('position', 'fixed', 'important');
                activeDrag.element.style.setProperty('left', `${targetLeft}px`, 'important');
                activeDrag.element.style.setProperty('top', `${targetTop}px`, 'important');
                activeDrag.element.style.setProperty('right', 'auto', 'important');
                activeDrag.element.style.setProperty('bottom', 'auto', 'important');
                activeDrag.element.style.setProperty('margin', '0', 'important');
                activeDrag.element.style.setProperty('z-index', '99999', 'important');

                // Sync search dropdowns
                if (activeDrag.config.id === 'searchbar') {
                    const resultBox = document.getElementById('resultBox');
                    if (resultBox) {
                        resultBox.style.setProperty('position', 'fixed', 'important');
                        resultBox.style.setProperty('left', `${targetLeft}px`, 'important');
                        resultBox.style.setProperty('top', `${targetTop + 68}px`, 'important');
                    }
                    const searchWith = document.getElementById('search-with-container');
                    if (searchWith) {
                        searchWith.style.setProperty('position', 'fixed', 'important');
                        searchWith.style.setProperty('left', `${targetLeft}px`, 'important');
                        searchWith.style.setProperty('top', `${targetTop + 68}px`, 'important');
                    }
                }

                activeDrag.currentPos = {
                    left: targetLeft,
                    top: targetTop,
                    xRatio: (targetLeft + activeDrag.elemWidth / 2) / window.innerWidth,
                    yRatio: (targetTop + activeDrag.elemHeight / 2) / window.innerHeight
                };
            });
        };

        const onPointerUp = function () {
            if (!activeDrag) return;

            activeDrag.element.classList.remove('is-dragging');
            showCenterGuide(false);

            if (activeDrag.currentPos) {
                const updatedPositions = getSavedPositions();
                updatedPositions[activeDrag.config.id] = activeDrag.currentPos;
                savePositions(updatedPositions);
            }

            // Clean up temporary inline drag styles so CSS manages them cleanly
            activeDrag.element.style.zIndex = '';

            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);

            activeDrag = null;
        };

        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
    }

    /**
     * Displays a subtle vertical alignment centerline when magnetic snap is active.
     */
    function showCenterGuide(visible) {
        let guide = document.getElementById('layoutCenterGuide');
        if (!guide) {
            guide = document.createElement('div');
            guide.id = 'layoutCenterGuide';
            guide.className = 'layout-center-guide';
            document.body.appendChild(guide);
        }
        guide.style.display = visible ? 'block' : 'none';
    }

    /**
     * Builds and inserts the floating Layout Editor Toolbar.
     */
    function renderToolbar() {
        let toolbar = document.getElementById('layoutEditorToolbar');
        if (toolbar) return toolbar;

        toolbar = document.createElement('div');
        toolbar.id = 'layoutEditorToolbar';
        toolbar.className = 'layout-editor-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Element Position Editor');
        toolbar.innerHTML = `
            <div class="toolbar-brand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
                </svg>
                <span class="toolbar-title">Layout Editor</span>
            </div>
            <div class="toolbar-hint">Drag any element anywhere on the screen</div>
            <div class="toolbar-actions">
                <button type="button" id="layoutSnapToggle" class="toolbar-btn ${snapEnabled ? 'active' : ''}" title="Toggle center snapping">
                    <span class="btn-icon">🧲</span>
                    <span class="btn-text">Snap</span>
                </button>
                <button type="button" id="layoutResetBtn" class="toolbar-btn" title="Reset all positions to default">
                    <span class="btn-icon">↺</span>
                    <span class="btn-text">Reset</span>
                </button>
                <button type="button" id="layoutDoneBtn" class="toolbar-btn primary" title="Save and finish editing">
                    <span class="btn-icon">✓</span>
                    <span class="btn-text">Done</span>
                </button>
            </div>
        `;

        document.body.appendChild(toolbar);

        // Snap toggle button
        const snapBtn = toolbar.querySelector('#layoutSnapToggle');
        snapBtn.addEventListener('click', () => {
            snapEnabled = !snapEnabled;
            snapBtn.classList.toggle('active', snapEnabled);
            showToast(snapEnabled ? 'Center snapping enabled' : 'Snapping disabled');
        });

        // Reset button
        toolbar.querySelector('#layoutResetBtn').addEventListener('click', () => {
            resetPositions();
        });

        // Done button
        toolbar.querySelector('#layoutDoneBtn').addEventListener('click', () => {
            exitEditMode();
        });

        return toolbar;
    }

    /**
     * Activates position edit mode.
     */
    function enterEditMode() {
        if (isEditMode) return;
        isEditMode = true;

        document.body.classList.add('layout-edit-mode');

        // Close menu drawer properly using existing global closeMenuBar function
        if (typeof window.closeMenuBar === 'function') {
            window.closeMenuBar();
        } else {
            const menuBar = document.getElementById('menuBar');
            if (menuBar && menuBar.style.display !== 'none' && menuBar.style.display !== '') {
                const closeBtn = document.getElementById('menuCloseButton');
                if (closeBtn) closeBtn.click();
            }
        }

        const toolbar = renderToolbar();
        setupEditableElements();
        toolbar.style.display = 'flex';

        showToast('Layout Editor active: drag any widget to reposition');
    }

    /**
     * Exits position edit mode.
     */
    function exitEditMode() {
        if (!isEditMode) return;
        isEditMode = false;

        document.body.classList.remove('layout-edit-mode');
        showCenterGuide(false);

        const toolbar = document.getElementById('layoutEditorToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }

        showToast('Layout positions saved');
    }

    /**
     * Displays a clean transient toast notification.
     */
    function showToast(message) {
        let toast = document.getElementById('layoutEditorToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'layoutEditorToast';
            toast.className = 'layout-editor-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    // Attach safe keyboard shortcuts (Ctrl+Shift+E or Ctrl+Shift+L)
    window.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'e' || e.key === 'E' || e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            if (isEditMode) {
                exitEditMode();
            } else {
                enterEditMode();
            }
        }
        // Escape exits edit mode
        if (e.key === 'Escape' && isEditMode) {
            exitEditMode();
        }
    });

    // Handle window resize gracefully by clamping positions within the new viewport
    window.addEventListener('resize', () => {
        const positions = getSavedPositions();
        if (!positions || Object.keys(positions).length === 0) return;

        let changed = false;
        EDITABLE_ELEMENTS.forEach(item => {
            const pos = positions[item.id];
            if (!pos) return;

            const elemWidth = item.defaultWidth || 200;
            const maxLeft = Math.max(10, window.innerWidth - elemWidth - 10);
            const maxTop = Math.max(10, window.innerHeight - 60);

            if (pos.left > maxLeft) {
                pos.left = maxLeft;
                changed = true;
            }
            if (pos.top > maxTop) {
                pos.top = maxTop;
                changed = true;
            }
        });

        if (changed) {
            savePositions(positions);
        }
    });

    // Public API exposed on window.LayoutEditor
    window.LayoutEditor = {
        enterEditMode,
        exitEditMode,
        resetPositions,
        getSavedPositions,
        savePositions,
        applySavedPositions,
        isEditMode: () => isEditMode
    };

    // Initialize as soon as DOM is ready
    function init() {
        const saved = getSavedPositions();
        applySavedPositions(saved);
        setupEditableElements();

        // Wire up buttons in Settings drawer
        const openBtn = document.getElementById('openLayoutEditorBtn');
        if (openBtn) {
            openBtn.addEventListener('click', enterEditMode);
        }

        const resetBtn = document.getElementById('resetLayoutBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetPositions);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
