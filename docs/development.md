# MYNT: Material You New Tab — Development and Contribution Guide

This guide covers setup instructions, development workflows, coding conventions, and verification procedures for **MYNT: Material You New Tab**.

---

## 1. Prerequisites

To develop, inspect, and test MYNT:
- **Web Browser**: Any modern browser supporting Manifest V3:
  - Google Chrome 88+ (recommended for full feature parity, including Web Speech API)
  - Microsoft Edge 88+
  - Brave or Opera
  - Mozilla Firefox 109+ (for cross-browser compatibility testing)
- **Node.js**: Node.js v18.0.0 or later (verified on v22.23.2). Node.js is used **strictly as a test runner** (`node --test`).
- **No Package Manager Required**: There are no npm dependencies, no `node_modules`, and no build or compilation steps. The extension executes native code directly.

---

## 2. Local Extension Setup

### 2.1 Chromium-Based Browsers (Chrome, Edge, Brave, Opera)
1. Open the browser and navigate to the Extensions management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode** via the toggle switch (usually located in the top-right corner).
3. Click the **Load unpacked** button.
4. Select the project root directory (`d:\Ansh\MaterialYouNewTab`).
5. Open a new tab (`Ctrl + T` / `Cmd + T`). The MYNT dashboard will display immediately.
6. When code changes are made to `scripts/`, `style.css`, or `index.html`:
   - Reload the active tab to see UI/CSS changes.
   - If `manifest.json` or `scripts/background.js` was modified, click the reload (circular arrow) icon on the extension card in `chrome://extensions`.

### 2.2 Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file in the project root.
4. Open a new tab to preview.

---

## 3. Automated Testing Workflow

Automated unit and integration checks are powered by the native Node.js test runner (`node:test` and `node:assert`).

### 3.1 Run All Tests
Execute the full test suite from the repository root:
```powershell
node --test
```

### 3.2 Run Specific Test Suites
You can run individual test files for targeted feedback:
```powershell
# Validate Manifest V3 schema and declared asset paths
node --test tests/manifest.test.js

# Validate all 32 locale dictionaries and key presence
node --test tests/locales.test.js

# Validate numeral localization, special decimals, and RTL markers
node --test tests/localization-helpers.test.js

# Validate XSS prevention, SVG sanitization, and URL normalization
node --test tests/security-helpers.test.js

# Validate backup and restore JSON structural validator
node --test tests/backup-validation.test.js
```

### 3.3 Test Runner Architecture
The test harness located in `tests/helpers/loader.js` dynamically extracts and isolates pure functions from the browser scripts without modifying the production source code.

---

## 4. Coding Conventions and Architecture Rules

### 4.1 Zero Build Step Constraint
Do **not** introduce bundlers (Webpack, Vite, Rollup, Parcel) or transpilers (Babel, TypeScript) into the core extension. The application must remain pure, standard web files that can be inspected and loaded directly by the browser.

### 4.2 Copyright and Licensing Headers
All new JavaScript files in `scripts/` or `locales/` must start with the standard license header:
```javascript
/*
 * Material You New Tab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */
```

### 4.3 Script Inclusion and Global Namespace
All feature scripts are loaded via `<script defer src="scripts/..."></script>` in `index.html`.
- Because scripts share the global execution context in the browser, avoid polluting the global namespace with generic variable names.
- Use explicit helper functions and object properties.
- Respect the loading order in `index.html`. `scripts/preload.js` must remain in `<head>` without `defer` to ensure synchronous FOUC prevention.

### 4.4 Security and Input Sanitization
- **Never insert raw user input directly into `innerHTML`**.
- Use `escapeHtml()` from `scripts/shortcuts.js` when constructing markup containing user strings.
- Custom icon SVGs must pass through `sanitizeSvg()` to strip scripts, event handlers (`onload`, `onclick`), `<iframe>`, and `<foreignObject>` tags.
- For standard text content, always prefer `element.textContent` over `element.innerHTML`.

### 4.5 Internationalization (i18n) Workflow
When introducing a new feature or text element:
1. Add the English string to `locales/en.js`.
2. Map the element ID or key in `scripts/languages.js` within the `translationMap` or `placeholderMap`.
3. In component code, always provide a fallback to English:
   ```javascript
   const label = translations[currentLanguage]?.myFeatureKey || translations["en"].myFeatureKey;
   ```
4. Do not delete or rename existing keys in other locale files unless synchronizing across all 32 translations.

---

## 5. Production Packaging

To prepare a release ZIP bundle for publishing to the Chrome Web Store or Edge Add-ons:
1. Ensure all tests pass: `node --test`.
2. Create a clean ZIP archive of the project root.
3. Exclude internal development and repository files:
   - `.git/` and `.gitignore`
   - `tests/`
   - `docs/architecture.md` and `docs/development.md` (retain `docs/whats-new.html`, `docs/feedback.html`, and `docs/Get_WeatherAPI_Key.html` as they are referenced by the extension runtime)
4. Validate that the ZIP unpacks cleanly and loads in `chrome://extensions` without errors.
