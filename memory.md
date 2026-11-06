# Project Memory — MYNT: Material You New Tab

**Last Updated:** 2026-11-06  
**Repository Branch:** `main` (`origin/main`)  
**Git Remote:** `https://github.com/ANShKhare-ux/MYNT-2.0.git`  
**License:** GNU General Public License v3.0 (GPL-3.0)  

---

## 1. Project Identity and Purpose

**MYNT (Material You New Tab)** is a privacy-first, highly customizable browser extension that replaces the browser's default New Tab page (`chrome_url_overrides.newtab`) with a clean dashboard inspired by Google's **Material You** design language.

Core goals:
- **Zero Data Collection**: No user tracking, telemetry, or remote analytics; all settings and data reside locally.
- **Material You Design**: Dynamic color palette adaptation, dark/light/system theme toggling, widget transparency controls, and adaptive icons.
- **Productivity & Utilities**: Integrated search with multi-engine switching and voice typing, live weather, shortcuts with drag-and-drop, AI tools launcher, daily to-do list, bookmarks sidebar, Google apps launcher, and motivational quotes.
- **Global Accessibility**: Full internationalization supporting 32 languages, including RTL layouts (Arabic, Persian, Urdu) and native numeral localization.

---

## 2. Current Implementation Status

### Implemented Features (Verified)
- **Manifest V3 Core**: Manifest defined with MV3 compliance, split incognito mode, and service worker background lifecycle.
- **Theming & Appearance**:
  - Segmented control for Light / Dark / System themes (`scripts/theme.js`).
  - Preload script (`scripts/preload.js`) running in `<head>` to prevent Flash of Unstyled Content (FOUC).
  - Custom color picker setting CSS custom property accent colors.
  - Interactive transparency slider (`scripts/widgets-transparency.js`) controlling `--transparency` on widgets.
  - **Glassmorphism System**: Native, hardware-accelerated frosted glass layer (`backdrop-filter: blur(...) saturate(...)`) with specular edge reflections, inner glows, and floating elevation across all widgets, sidebars, shortcuts, and modals in wallpaper mode. Adapts smoothly to light/dark themes and provides accessibility fallback for `prefers-reduced-transparency`.
- **Clock Subsystem (`scripts/clock.js`)**:
  - Dual modes: Analog (smooth rotating hands) and Digital (12h/24h formats).
  - Contextual time-of-day greetings (Morning / Afternoon / Evening).
  - Customizable visibility toggles with responsive auto-adaptation for mobile viewports.
- **Weather Subsystem (`scripts/weather.js`)**:
  - Real-time weather via WeatherAPI integration.
  - GPS geolocation (`navigator.geolocation`) and manual location lookup with autocomplete.
  - Temperature display in Celsius (°C) and Fahrenheit (°F), humidity, condition text, and min/max metrics.
- **Search & Suggestions (`scripts/search.js`, `scripts/search-suggestions.js`, `scripts/voice-search.js`)**:
  - 9 search engines supported: Google, DuckDuckGo, Bing, Brave, YouTube, Google Images, Reddit, Wikipedia, Quora.
  - **Google AI Search Mode**: Interactive Material pill button (`[Sparkle-Lens Icon] AI Mode`) in `.searchControls`. Directs queries to Google AI Search via official parameter `udm=50` (`https://www.google.com/search?q=${query}&udm=50` or `https://www.google.com/search?udm=50`). Automatically displays for Google (`engine1`) and Default browser engine (`engine0`), while dynamically hiding for non-Google engines.
  - Dynamic autocomplete suggestions routed through a dedicated proxy (`https://mynt-proxy.rhythmcorehq.com/proxy?url=`) or user-configured proxy.
  - Speech-to-text voice search using the Web Speech API on supported Chromium browsers.
- **Shortcuts & AI Launchers (`scripts/shortcuts.js`, `scripts/ai-tools.js`)**:
  - Up to 50 customizable shortcuts with adaptive Material You icons or user-supplied SVG/image URLs.
  - Strict SVG sanitization (`sanitizeSvg`) and URL validation preventing XSS injection.
  - Drag-and-drop shortcut reordering and numerical keyboard hotkeys (1–9).
  - AI launcher drawer with toggles and reordering for 10 AI platforms (ChatGPT, Gemini, Copilot, Claude, DeepSeek, Perplexity, Grok, Meta AI, Qwen, Firefly).
- **Bookmarks & Tasks (`scripts/bookmarks.js`, `scripts/todo-list.js`)**:
  - Bookmarks sidebar supporting grid and list views, search filtering, and sorting (alphabetical / date added).
  - Daily to-do list with pin feature and automatic new-day cleanup.
- **Wallpaper Engine (`scripts/wallpaper.js`)**:
  - Local image upload stored as Blobs in IndexedDB (`ImageDB`).
  - Daily random wallpaper integration via Lorem Picsum.
- **Backup & Restore (`scripts/backup-restore.js`)**:
  - Full state export to a timestamped JSON file (`localStorage` preferences and `IndexedDB` wallpapers).
  - Validation and restoration engine.
- **Internationalization (`scripts/languages.js`, `locales/*.js`)**:
  - 32 complete or partial language dictionaries.
  - RTL styling for Arabic, Persian, and Urdu with Left-to-Right Mark (`\u200E`) injection for mixed-direction text.
  - Numeral mapping for Bengali, Tamil, Marathi, Nepali, Persian, and Arabic.
  - Decimal point to comma replacement for 19 languages.
- **Extension Pages (`docs/`)**:
  - `docs/whats-new.html`: Update changelog opened on extension update.
  - `docs/feedback.html`: User feedback and contact page.
  - `docs/Get_WeatherAPI_Key.html`: Step-by-step tutorial for obtaining a free WeatherAPI key.

### Planned / Incomplete Features
- **Firefox MV3 Separate Manifest**: A Firefox-specific manifest (`manifest(firefox).json`) was previously removed. Current manifest is Chromium MV3 focused.
- **Automated CI Workflow**: GitHub Actions workflow for running tests on push/PR is not yet configured in `.github/workflows/`.

---

## 3. Verified Technology Stack

| Component | Technology | Version / Specification |
|---|---|---|
| Platform | Browser Extension | Manifest V3 (MV3) |
| Runtime Environment | Web Browser | Chromium 88+, Edge 88+, Firefox 109+ |
| Core Languages | HTML5, CSS3, JavaScript | ES6+ (vanilla, no transpilers) |
| Fonts | Poppins | `fonts/Poppins-Regular.ttf` |
| Local Storage | Web Storage API | `localStorage` (key-value strings) |
| Binary Storage | IndexedDB | Database: `ImageDB`, Store: `backgroundImages` |
| Test Runner | Node.js Built-in Runner | Node.js v22.23.2 (`node:test`, `node:assert`) |
| Build Tooling | None | Zero build step; pure static files |

---

## 4. Architecture and Data Flow

```mermaid
graph TD
    User([User opens New Tab]) --> Manifest[manifest.json: chrome_url_overrides]
    Manifest --> HTML[index.html]
    
    subgraph Pre-Paint Phase
        HTML --> Preload[scripts/preload.js]
        Preload --> LS1[(localStorage)]
        Preload --> CSSVars[Apply CSS Variables to html node]
    end
    
    subgraph Initialization Phase
        CSSVars --> DOM[Parse DOM Body]
        DOM --> Scripts[Load Deferred Scripts]
        DOM --> Locales[Load locales/*.js]
        Scripts --> Languages[scripts/languages.js: Build translations]
        Languages --> DOMText[Localize Text Nodes & RTL Layout]
    end
    
    subgraph Feature Hydration
        DOMText --> Clock[clock.js: Start Timers]
        DOMText --> Weather[weather.js: Fetch WeatherAPI]
        DOMText --> Shortcuts[shortcuts.js: Render Grid & Load Icons]
        DOMText --> Wallpaper[wallpaper.js: Read IndexedDB ImageDB]
        Wallpaper --> IDB[(IndexedDB: ImageDB)]
    end
```

---

## 5. Important Files and Their Responsibilities

- **`manifest.json`**: Root configuration declaring MV3 metadata, permissions (`search`, optional `bookmarks`/`favicon`), service worker, and `index.html` newtab override.
- **`index.html`**: Master markup document defining widget shells, modals, drawer navigation, and script tags.
- **`style.css`**: Complete stylesheet specifying Material You tokens, responsive grid layouts, and light/dark theme rules.
- **`scripts/preload.js`**: Runs in `<head>` to bind CSS properties before first layout, preventing screen flashing.
- **`scripts/theme.js`**: Controls active palette, segmented mode switcher, and color picker events.
- **`scripts/languages.js`**: Translations hub, RTL layout toggler, numeral localizer, and comma-decimal transformer.
- **`scripts/shortcuts.js`**: Manages shortcut item rendering, drag-and-drop reordering, keyboard navigation, and SVG security filtering.
- **`scripts/weather.js`**: Handles WeatherAPI communication, GPS querying, city autocomplete, and metric/imperial conversions.
- **`scripts/clock.js`**: Runs analog and digital clock renderers, interval timers, and greeting computations.
- **`scripts/backup-restore.js`**: Serializes/deserializes `localStorage` and `IndexedDB` state to/from JSON.
- **`scripts/background.js`**: Service worker listening for extension update events and registering uninstall survey URL.
- **`locales/*.js`**: 32 standalone translation dictionary files.
- **`docs/`**: Dual-purpose directory holding extension HTML pages (`whats-new.html`, `feedback.html`, `Get_WeatherAPI_Key.html`) and engineering documentation (`architecture.md`, `development.md`).
- **`tests/`**: Automated test suite containing `manifest.test.js`, `locales.test.js`, `localization-helpers.test.js`, `security-helpers.test.js`, `backup-validation.test.js`, `glassmorphism.test.js`, and `ai-search-mode.test.js`.

---

## 6. Coding and Design Conventions

1. **No External Libraries**: Do not add runtime dependencies, frameworks (React, Vue, Tailwind), or bundling utilities.
2. **Synchronous Preload in Head**: Any property needed to prevent visual pop-in (theme, opacity, background color) must be handled in `scripts/preload.js`.
3. **Defense Against XSS**:
   - Never inject raw user inputs directly with `innerHTML`.
   - Use `escapeHtml()` for text rendering and `sanitizeSvg()` for custom SVG icons.
   - SVG sanitization rejects `<script>`, inline event handlers (`onload`, `onclick`, `onerror`), `<iframe>`, and `<foreignObject>`.
4. **License Header**: All JavaScript files must include the GNU General Public License v3.0 header block.
5. **Localization Fallbacks**: Always write `translations[currentLanguage]?.key || translations["en"].key` so unlocalized strings safely default to English.

---

## 7. Available Development Commands

All testing and validation commands use the host's native Node.js runtime:

| Command | Purpose |
|---|---|
| `node --test` | Runs the full automated test suite (47 tests across 7 test suites). |
| `node --test tests/ai-search-mode.test.js` | Validates Google AI Mode pill button, udm=50 search synthesis, engine filtering, and styles. |
| `node --test tests/glassmorphism.test.js` | Validates glassmorphism tokens, component filters, and accessibility. |
| `node --test tests/manifest.test.js` | Validates Manifest V3 schema, permissions, and file existence. |
| `node --test tests/locales.test.js` | Validates all 32 locale dictionaries, syntax, and baseline keys. |
| `node --test tests/localization-helpers.test.js` | Validates numeral localization, decimal commas, and RTL LRM markers. |
| `node --test tests/security-helpers.test.js` | Tests XSS escaping, SVG sanitization, and URL normalization. |
| `node --test tests/backup-validation.test.js` | Tests JSON backup structure validation. |

---

## 8. Configuration Requirements (Without Secrets)

- **WeatherAPI**: Requires a free personal API key from `weatherapi.com`. Users configure this in the Settings drawer under the Weather section. Stored locally in `localStorage.weatherApiKey`.
- **Search Suggestions Proxy**: Defaults to `https://mynt-proxy.rhythmcorehq.com/proxy?url=`. Can be overridden by the user in Search Settings. Stored locally in `localStorage.proxy`.
- **Quotes API**: Fetches from `https://prem-k-r.github.io/multilingual-quotes-api/minified/metadata.json`. Falls back to local constants when offline.

---

## 9. Known Issues and Limitations

1. **`isValidBackupFile` null evaluation**: In `scripts/backup-restore.js`, `!(typeof backup.localStorage !== "object" || typeof backup.indexedDB !== "object")` evaluates `true` when properties are `null` because `typeof null === "object"` in JavaScript.
2. **Partial Translations**: While 67 core keys are universally translated across all 32 languages, some newer keys (e.g. `newTabTitle`, `feedback` in Urdu/Arabic) rely on the English fallback mechanism.
3. **Web Speech API Availability**: Speech recognition is only supported on Chromium-based desktop browsers (Chrome, Edge) and is unavailable in Brave (by design), Firefox, or mobile environments.
4. **Commented-out Blocks**:
   - `scripts/preload.js`: Wallpaper MutationObserver (lines 30–38) is commented out.
   - `scripts/search-suggestions.js`: `resultBox.style.display = "none"` in `hideResultBox()` (line 67) is commented out.

---

## 10. Important Decisions and Constraints

- **Dual Role of `docs/`**: The `docs/` folder is part of the extension bundle (`chrome.runtime.getURL("/docs/whats-new.html")`). Do NOT move or rename the `.html` files in `docs/`.
- **Zero Build Artifacts**: The repository is designed to be loaded directly via "Load unpacked" in developer mode without running any compilation commands.
- **Shared Global Scope**: Because `scripts/*.js` are loaded as standard script tags, functions and top-level variables are shared across modules. Preserve script inclusion order in `index.html`.

---

## 11. Prioritized Next Steps

1. **CI/CD Test Pipeline**: Add `.github/workflows/test.yml` to automatically execute `node --test` on pull requests and pushes.
2. **Harden Backup Validator**: Update `isValidBackupFile` in `scripts/backup-restore.js` to ensure `backup.localStorage` and `backup.indexedDB` are truthy objects and not `null`.
3. **Firefox Add-on Manifest Synchronization**: Create a reproducible packaging script to produce Firefox-compatible manifests if publishing to AMO.
4. **Translation Coverage Audit**: Synchronize missing keys in secondary locales against `locales/en.js`.

---

## 12. Areas That Could Not Be Verified

- **Live Web Store Publishing**: Production signing keys, Chrome Web Store developer dashboard status, and AMO listing credentials are not in the repository and cannot be verified locally.
- **Live Chrome Bookmarks API**: Tested via mocking and structure validation; live interaction with real user bookmarks requires an active browser profile with granted permissions.
