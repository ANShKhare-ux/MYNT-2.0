/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Fluid Motion & GSAP-Inspired Animation Engine
 * 
 * Manages user animation preferences (independent from OS-level reduced motion flags),
 * dynamic spring physics micro-interactions, and choreographed timeline-style cascades.
 */

(function () {
    const STORAGE_KEY = 'mynt_ui_animations';

    /**
     * Determines whether UI animations are currently enabled.
     * Defaults to true so OS-level flags (e.g. Windows "Animate controls and elements inside windows")
     * do not disable animations unless explicitly toggled off by the user in MYNT.
     */
    function isMotionEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) !== 'disabled';
        } catch (e) {
            return true;
        }
    }

    /**
     * Updates the motion preference, syncing localStorage and document state.
     */
    function setMotionEnabled(enabled) {
        try {
            const state = enabled ? 'enabled' : 'disabled';
            localStorage.setItem(STORAGE_KEY, state);
            document.documentElement.setAttribute('data-motion', state);

            const toggle = document.getElementById('uiAnimationsCheckbox');
            if (toggle && toggle.checked !== enabled) {
                toggle.checked = enabled;
            }
        } catch (e) {
            console.error('Failed to update motion preference:', e);
        }
    }

    /**
     * Initializes the settings drawer toggle control.
     */
    function initToggle() {
        const toggle = document.getElementById('uiAnimationsCheckbox');
        if (!toggle) return;

        toggle.checked = isMotionEnabled();
        toggle.addEventListener('change', () => {
            setMotionEnabled(toggle.checked);
        });
    }

    /**
     * Enhances interactive buttons with tactile GSAP/Motion-style spring physics.
     */
    function initTactileInteractions() {
        // Subtle press squash feedback for tactile feel
        const pressTargets = [
            '#menuButton',
            '#todoListCont',
            '#bookmarkButton',
            '#googleAppsCont',
            '.aiToolsCont .hangno',
            '.uploadButton',
            '.randomButton',
            '.videoButton',
            '.switchMediaButton',
            '.clearButton',
            '.layoutEditBtn',
            '.layoutResetBtn',
            '#backButton',
            '#newShortcutButton'
        ];

        document.addEventListener('pointerdown', (e) => {
            if (!isMotionEnabled()) return;
            const target = e.target.closest(pressTargets.join(', '));
            if (!target) return;
            target.classList.add('motion-pressed');
        });

        const clearPress = () => {
            document.querySelectorAll('.motion-pressed').forEach(el => {
                el.classList.remove('motion-pressed');
            });
        };

        document.addEventListener('pointerup', clearPress);
        document.addEventListener('pointercancel', clearPress);
    }

    /**
     * Public API exposed on window.MYNT_Motion
     */
    window.MYNT_Motion = {
        isEnabled: isMotionEnabled,
        enable: () => setMotionEnabled(true),
        disable: () => setMotionEnabled(false),
        toggle: () => setMotionEnabled(!isMotionEnabled())
    };

    // Initialize as soon as DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initToggle();
            initTactileInteractions();
        });
    } else {
        initToggle();
        initTactileInteractions();
    }
})();
