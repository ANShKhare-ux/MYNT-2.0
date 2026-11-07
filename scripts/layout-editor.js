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
            type: 'flow'
        },
        {
            id: 'dateGreeting',
            name: 'Date & Greeting',
            selector: '.ttteexxtt',
            type: 'flow'
        },
        {
            id: 'weather',
            name: 'Weather',
            selector: '#hideWeather',
            type: 'flow'
        },
        {
            id: 'searchbar',
            name: 'Search Bar',
            selector: '#searchbar',
            type: 'flow',
            syncSelectors: ['#resultBox', '#search-with-container']
        },
        {
            id: 'quotes',
            name: 'Quotes',
            selector: '#motivationalQuotesCont',
            type: 'flow'
        },
        {
            id: 'shortcuts',
            name: 'Shortcuts Dock',
            selector: '#shortcuts-section .shortcutsContainer',
            type: 'flow'
        },
        {
            id: 'todo',
            name: 'ToDo Icon',
            selector: '#todoListCont',
            type: 'fixed'
        },
        {
            id: 'bookmarks',
            name: 'Bookmarks Icon',
            selector: '#bookmarkButton',
            type: 'fixed'
        },
        {
            id: 'googleApps',
            name: 'Google Apps',
            selector: '#googleAppsCont',
            type: 'fixed'
        },
        {
            id: 'aiTools',
            name: 'AI Tools',
            selector: '#aiToolsCont',
            type: 'fixed'
        },
        {
            id: 'menuButton',
            name: 'Menu Button',
            selector: '#menuButton',
            type: 'fixed'
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
     * Generates CSS rules for all saved positions and injects them into #custom-layout-positions-style.
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
            return;
        }

        let css = '';
        EDITABLE_ELEMENTS.forEach(item => {
            const pos = positions[item.id];
            if (!pos) return;

            if (item.type === 'fixed') {
                const left = typeof pos.left === 'number' ? pos.left : 0;
                const top = typeof pos.top === 'number' ? pos.top : 0;
                css += `
                    ${item.selector} {
                        left: ${left}px !important;
                        top: ${top}px !important;
                        right: auto !important;
                        bottom: auto !important;
                    }
                `;
            } else {
                const x = typeof pos.x === 'number' ? pos.x : 0;
                const y = typeof pos.y === 'number' ? pos.y : 0;
                css += `
                    ${item.selector} {
                        position: relative !important;
                        left: ${x}px !important;
                        top: ${y}px !important;
                    }
                `;
                if (item.syncSelectors && item.syncSelectors.length > 0) {
                    css += `
                        ${item.syncSelectors.join(', ')} {
                            left: ${x}px !important;
                            top: ${y}px !important;
                        }
                    `;
                }
            }
        });

        styleEl.textContent = css;
    }

    /**
     * Saves updated positions map to localStorage and updates style tag.
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

        // Animate elements back to origin smoothly
        EDITABLE_ELEMENTS.forEach(item => {
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                el.style.transition = 'left 0.4s var(--fluid-spring, cubic-bezier(0.34, 1.35, 0.64, 1)), top 0.4s var(--fluid-spring, cubic-bezier(0.34, 1.35, 0.64, 1))';
                setTimeout(() => {
                    el.style.transition = '';
                }, 400);
            });
        });

        showToast('Layout positions reset to default');
    }

    /**
     * Creates badges and sets data attributes on editable elements.
     */
    function setupEditableElements() {
        EDITABLE_ELEMENTS.forEach(item => {
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                el.setAttribute('data-editable-element', item.id);
                el.setAttribute('data-element-name', item.name);

                // Add visual badge if not already present
                if (!el.querySelector(':scope > .layout-element-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'layout-element-badge';
                    badge.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/>
                        </svg>
                        <span>${item.name}</span>
                    `;
                    el.appendChild(badge);
                }

                // Attach drag handlers
                attachDragListener(el, item);
            });
        });
    }

    /**
     * Binds pointerdown listeners for dragging in Edit Mode or Alt+Drag.
     */
    function attachDragListener(element, itemConfig) {
        if (element._layoutDragAttached) return;
        element._layoutDragAttached = true;

        const onPointerDown = function (e) {
            // Only left click or primary touch
            if (e.button && e.button !== 0) return;

            // In regular mode, only drag if Alt key is pressed
            if (!isEditMode && !e.altKey) return;

            // Ignore if clicked on settings/buttons inside the toolbar
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
        const positions = getSavedPositions();
        const currentPos = positions[itemConfig.id] || (itemConfig.type === 'fixed' ? { left: rect.left, top: rect.top } : { x: 0, y: 0 });

        element.classList.add('is-dragging');

        activeDrag = {
            element,
            config: itemConfig,
            startX: clientX,
            startY: clientY,
            initialLeft: typeof currentPos.left === 'number' ? currentPos.left : rect.left,
            initialTop: typeof currentPos.top === 'number' ? currentPos.top : rect.top,
            initialX: currentPos.x || 0,
            initialY: currentPos.y || 0,
            elemWidth: rect.width,
            elemHeight: rect.height,
            isTouch
        };

        const onPointerMove = function (ev) {
            if (!activeDrag) return;
            const curX = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientX : activeDrag.startX) : ev.clientX;
            const curY = activeDrag.isTouch ? (ev.touches ? ev.touches[0].clientY : activeDrag.startY) : ev.clientY;

            const deltaX = curX - activeDrag.startX;
            const deltaY = curY - activeDrag.startY;

            requestAnimationFrame(() => {
                if (!activeDrag) return;

                if (activeDrag.config.type === 'fixed') {
                    let newLeft = activeDrag.initialLeft + deltaX;
                    let newTop = activeDrag.initialTop + deltaY;

                    // Keep inside viewport bounds
                    newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - activeDrag.elemWidth - 10));
                    newTop = Math.max(10, Math.min(newTop, window.innerHeight - activeDrag.elemHeight - 10));

                    // Magnetic center snap
                    if (snapEnabled) {
                        const centerX = newLeft + activeDrag.elemWidth / 2;
                        if (Math.abs(centerX - window.innerWidth / 2) < 18) {
                            newLeft = Math.round(window.innerWidth / 2 - activeDrag.elemWidth / 2);
                        }
                    }

                    activeDrag.element.style.setProperty('left', `${newLeft}px`, 'important');
                    activeDrag.element.style.setProperty('top', `${newTop}px`, 'important');
                    activeDrag.element.style.setProperty('right', 'auto', 'important');
                    activeDrag.element.style.setProperty('bottom', 'auto', 'important');

                    activeDrag.currentPos = { left: newLeft, top: newTop };
                } else {
                    let newX = activeDrag.initialX + deltaX;
                    let newY = activeDrag.initialY + deltaY;

                    // Magnetic center snap for flow widgets
                    if (snapEnabled) {
                        const currentRect = activeDrag.element.getBoundingClientRect();
                        const currentCenterX = currentRect.left + currentRect.width / 2;
                        if (Math.abs(currentCenterX - window.innerWidth / 2) < 18) {
                            newX += Math.round(window.innerWidth / 2 - currentCenterX);
                        }
                    }

                    activeDrag.element.style.setProperty('position', 'relative', 'important');
                    activeDrag.element.style.setProperty('left', `${newX}px`, 'important');
                    activeDrag.element.style.setProperty('top', `${newY}px`, 'important');

                    if (activeDrag.config.syncSelectors) {
                        activeDrag.config.syncSelectors.forEach(sel => {
                            const syncEl = document.querySelector(sel);
                            if (syncEl) {
                                syncEl.style.setProperty('left', `${newX}px`, 'important');
                                syncEl.style.setProperty('top', `${newY}px`, 'important');
                            }
                        });
                    }

                    activeDrag.currentPos = { x: newX, y: newY };
                }
            });
        };

        const onPointerUp = function () {
            if (!activeDrag) return;

            activeDrag.element.classList.remove('is-dragging');

            if (activeDrag.currentPos) {
                const updatedPositions = getSavedPositions();
                updatedPositions[activeDrag.config.id] = activeDrag.currentPos;
                savePositions(updatedPositions);
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
     * Builds and inserts the floating Layout Editor Toolbar.
     */
    function renderToolbar() {
        if (document.getElementById('layoutEditorToolbar')) return;

        const toolbar = document.createElement('div');
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
            <div class="toolbar-hint">Drag any element to move it</div>
            <div class="toolbar-actions">
                <button type="button" id="layoutSnapToggle" class="toolbar-btn ${snapEnabled ? 'active' : ''}" title="Toggle magnetic snapping">
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
            showToast(snapEnabled ? 'Snap to center enabled' : 'Snap disabled');
        });

        // Reset button
        toolbar.querySelector('#layoutResetBtn').addEventListener('click', () => {
            resetPositions();
        });

        // Done button
        toolbar.querySelector('#layoutDoneBtn').addEventListener('click', () => {
            exitEditMode();
        });
    }

    /**
     * Activates position edit mode.
     */
    function enterEditMode() {
        if (isEditMode) return;
        isEditMode = true;

        document.body.classList.add('layout-edit-mode');

        // Close menu drawer if open so user has full view
        const menuCloseBtn = document.getElementById('menuCloseButton');
        if (menuCloseBtn && document.querySelector('.menuBar.open, .menuBar.active, .menuCont.open')) {
            menuCloseBtn.click();
        }

        renderToolbar();
        setupEditableElements();

        const toolbar = document.getElementById('layoutEditorToolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }

        showToast('Layout Edit Mode active: drag any element');
    }

    /**
     * Exits position edit mode.
     */
    function exitEditMode() {
        if (!isEditMode) return;
        isEditMode = false;

        document.body.classList.remove('layout-edit-mode');

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

    // Attach keyboard hotkeys
    window.addEventListener('keydown', function (e) {
        // Alt + L or Alt + E toggles layout edit mode
        if (e.altKey && (e.key === 'l' || e.key === 'L' || e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            if (isEditMode) {
                exitEditMode();
            } else {
                enterEditMode();
            }
        }
        // Esc exits edit mode
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
