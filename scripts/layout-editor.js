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
 * Uses CSS 2D translations (translate: dx dy) so widgets never distort containing blocks,
 * never jump off-screen, and never conflict with :hover/:active transforms.
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
            selector: '#analogClock, #digitalClock'
        },
        {
            id: 'dateGreeting',
            name: 'Date & Greeting',
            selector: '.ttteexxtt'
        },
        {
            id: 'weather',
            name: 'Weather',
            selector: '#hideWeather'
        },
        {
            id: 'searchbar',
            name: 'Search Bar',
            selector: '#searchbar',
            syncSelectors: ['#resultBox', '#search-with-container']
        },
        {
            id: 'quotes',
            name: 'Quotes',
            selector: '#motivationalQuotesCont'
        },
        {
            id: 'shortcuts',
            name: 'Shortcuts Dock',
            selector: '#shortcuts-section .wrapper'
        },
        {
            id: 'todo',
            name: 'ToDo Icon',
            selector: '#todoListCont'
        },
        {
            id: 'bookmarks',
            name: 'Bookmarks Icon',
            selector: '#bookmarkButton'
        },
        {
            id: 'googleApps',
            name: 'Google Apps',
            selector: '#googleAppsCont'
        },
        {
            id: 'aiTools',
            name: 'AI Tools',
            selector: '#aiToolsCont'
        },
        {
            id: 'menuButton',
            name: 'Menu Button',
            selector: '#menuButton'
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
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null) return {};
            const sanitized = {};
            for (const key in parsed) {
                const item = parsed[key];
                if (item && typeof item === 'object') {
                    sanitized[key] = {
                        dx: typeof item.dx === 'number' ? Math.round(item.dx) : 0,
                        dy: typeof item.dy === 'number' ? Math.round(item.dy) : 0
                    };
                }
            }
            return sanitized;
        } catch (e) {
            console.error('Error reading custom element positions:', e);
            return {};
        }
    }

    /**
     * Generates clean declarative CSS rules using the modern CSS `translate` property.
     * This avoids containing block bugs, layout gaps, and hover transform overrides.
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
            document.querySelectorAll('[data-custom-pos]').forEach(el => {
                el.removeAttribute('data-custom-pos');
            });
            return;
        }

        let css = '';
        EDITABLE_ELEMENTS.forEach(item => {
            const pos = positions[item.id];
            if (!pos) return;

            const dx = Math.round(pos.dx || 0);
            const dy = Math.round(pos.dy || 0);

            if (dx === 0 && dy === 0) return;

            const els = document.querySelectorAll(item.selector);
            els.forEach(el => el.setAttribute('data-custom-pos', 'true'));

            css += `
                ${item.selector} {
                    translate: ${dx}px ${dy}px !important;
                }
            `;

            if (item.syncSelectors) {
                item.syncSelectors.forEach(syncSel => {
                    css += `
                        ${syncSel} {
                            translate: ${dx}px ${dy}px !important;
                        }
                    `;
                });
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
     * Resets all positions back to default and cleans up styles with smooth transition.
     */
    function resetPositions() {
        localStorage.removeItem(STORAGE_KEY);
        applySavedPositions({});

        // Clear any inline translate properties
        EDITABLE_ELEMENTS.forEach(item => {
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                el.style.translate = '';
                el.removeAttribute('data-custom-pos');
            });
            if (item.syncSelectors) {
                item.syncSelectors.forEach(syncSel => {
                    const syncEls = document.querySelectorAll(syncSel);
                    syncEls.forEach(syncEl => {
                        syncEl.style.translate = '';
                    });
                });
            }
        });

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

        const positions = getSavedPositions();
        const currentPos = positions[itemConfig.id] || { dx: 0, dy: 0 };
        const initialDx = currentPos.dx || 0;
        const initialDy = currentPos.dy || 0;

        const rect = element.getBoundingClientRect();

        element.classList.add('is-dragging');
        showCenterGuide(false);

        activeDrag = {
            element,
            config: itemConfig,
            startX: clientX,
            startY: clientY,
            initialDx,
            initialDy,
            rect,
            isTouch
        };

        const onPointerMove = function (ev) {
            if (!activeDrag) return;
            const curX = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientX : clientX) : ev.clientX;
            const curY = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientY : clientY) : ev.clientY;

            const deltaX = curX - activeDrag.startX;
            const deltaY = curY - activeDrag.startY;

            let targetDx = activeDrag.initialDx + deltaX;
            let targetDy = activeDrag.initialDy + deltaY;

            // Magnetic snap to center vertical axis
            let isSnapped = false;
            if (snapEnabled) {
                const currentRect = activeDrag.element.getBoundingClientRect();
                const widgetCenterX = currentRect.left + currentRect.width / 2;
                const screenCenterX = window.innerWidth / 2;
                if (Math.abs(widgetCenterX - screenCenterX) < 18) {
                    targetDx += Math.round(screenCenterX - widgetCenterX);
                    isSnapped = true;
                }
            }

            showCenterGuide(isSnapped);

            requestAnimationFrame(() => {
                if (!activeDrag) return;

                activeDrag.element.style.setProperty('translate', `${targetDx}px ${targetDy}px`, 'important');

                // Sync search dropdowns
                if (activeDrag.config.syncSelectors) {
                    activeDrag.config.syncSelectors.forEach(syncSel => {
                        const syncEl = document.querySelector(syncSel);
                        if (syncEl) {
                            syncEl.style.setProperty('translate', `${targetDx}px ${targetDy}px`, 'important');
                        }
                    });
                }

                activeDrag.currentPos = { dx: targetDx, dy: targetDy };
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

            // Remove inline style so style tag manages the state
            activeDrag.element.style.translate = '';
            if (activeDrag.config.syncSelectors) {
                activeDrag.config.syncSelectors.forEach(syncSel => {
                    const syncEl = document.querySelector(syncSel);
                    if (syncEl) syncEl.style.translate = '';
                });
            }

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
            <div class="toolbar-hint">Drag any element to reposition</div>
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
            const closeBtn = document.getElementById('menuCloseButton');
            if (closeBtn) closeBtn.click();
        }

        const toolbar = renderToolbar();
        setupEditableElements();
        toolbar.style.display = 'flex';
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
     * Displays a clean transient toast notification at the top of the screen (never covers dock).
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
