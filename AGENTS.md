# AI Agent Instructions — MYNT: Material You New Tab

These instructions govern all AI coding assistants and autonomous engineering agents operating within this repository.

---

## 1. Mandatory Core Rules

1. **Read Before Working**: Read `AGENTS.md` and `memory.md` before initiating substantial development, refactoring, or documentation tasks.
2. **Inspect First**: Inspect the relevant source files and directory structure before proposing or applying code modifications. Never assume an implementation based on filenames alone.
3. **Respect Local Guidelines**: Follow any existing directory-specific agent instructions or conventions discovered during reconnaissance.
4. **Preserve Functionality**: Preserve all functioning features, user-facing behavior, and the established architecture. The extension must remain working at all times.
5. **Zero Unrelated Churn**: Avoid unrelated refactoring, speculative features, cosmetic rewrites, or unsolicited cleanup of working code.
6. **Reuse Existing Patterns**: Reuse existing utilities (e.g., `scripts/browser-utils.js`, `scripts/save-load-states.js`, `scripts/alert-modal.js`), styles, and components whenever implementing new functionality.
7. **No Unjustified Dependencies**: Do not add dependencies or alter manifests without explicit justification and prior authorization. MYNT is intentionally a zero-dependency vanilla JS project.
8. **Preserve User Changes**: Never overwrite user changes or discard uncommitted Git modifications without explicit authorization.
9. **Never Expose Secrets**: Never commit, log, or hardcode API keys, credentials, tokens, or environment secrets.
10. **Follow Project Conventions**: Adhere strictly to the project's established conventions: vanilla ES6+ JavaScript, CSS custom properties, GNU GPL-3.0 header blocks on script files, and synchronous FOUC prevention.
11. **Verify with Tests**: Run relevant tests and validation checks whenever practical (`node --test`).
12. **Report Results Honestly**: Report actual execution outputs honestly; never claim that an unrun or failing test has passed.
13. **Maintain Project Memory**: Update `memory.md` whenever significant architectural decisions, feature implementations, constraints, or known bugs change.
14. **Maintain Documentation Accuracy**: Keep documentation in `docs/` and `memory.md` strictly aligned with the real implementation.
15. **Confirm High-Stakes Actions**: Ask the user before performing destructive operations, deleting files, or making architectural modifications.

---

## 2. Project-Specific Directives for MYNT

### 2.1 Extension Architecture & Build Constraints
- **Zero-Build Architecture**: This project runs directly in the browser as an unpacked Manifest V3 extension. Do NOT introduce build tools (Webpack, Vite, Rollup), transpilers (Babel, TypeScript), or package managers (`package.json`, `npm`) into the core extension bundle.
- **Dual Role of `docs/`**: Be aware that `docs/` contains both user-facing runtime pages (`whats-new.html`, `feedback.html`, `Get_WeatherAPI_Key.html` used by the extension) and developer documentation (`architecture.md`, `development.md`). Never delete or move the HTML files in `docs/`.
- **Global Scope Awareness**: Scripts in `scripts/*.js` are loaded as deferred classic scripts in `index.html`. They share global scope. Avoid naming collisions and preserve the script order in `index.html`.

### 2.2 Security Guidelines
- Always sanitize user-provided icons with `sanitizeSvg()` or `isValidCustomIconUrl()` before injecting them into the DOM.
- Never concatenate unescaped user input into `innerHTML`. Use `escapeHtml()` or `textContent`.

### 2.3 Verification Commands
- Execute tests:
  ```powershell
  node --test
  ```
- All automated unit tests run through Node.js built-in `node:test` runner.
