# Modernization Plan for Redirector

## Executive Summary

This document outlines a roadmap to modernize the **Redirector** browser extension. The goal is to transition from a legacy, vanilla JavaScript codebase (Manifest V2) to a robust, type-safe, and maintainable TypeScript project (Manifest V3) powered by modern tooling.

## 1. Current State Analysis

- **Manifest Version**: V2 (Deprecated in Chrome, phasing out).
- **Language**: ES5/ES6 JavaScript (No modules, global scope usage).
- **Build System**: Custom Python script (`build.py`) for zipping artifacts.
- **Testing**: No visible unit or integration tests.
- **UI**: Vanilla HTML/CSS/JS with manual DOM manipulation.
- **Core Logic**: `webRequestBlocking` API, which is restricted in Manifest V3.

## 2. Modernization Stages

### Stage 1: Foundation & Tooling

_Goal: Establish a standard development environment._

1.  **Initialize Package Management**: Create `package.json` to manage dependencies.
2.  **Linting & Formatting**: Install **ESLint** and **Prettier** to enforce code style and catch errors early.
3.  **Git Hooks**: Set up `husky` / `lint-staged` to ensure quality on commit.

### Stage 2: Build System & modularization

_Goal: Replace custom scripts with industry-standard tools._

1.  **Bundler**: integrated **Vite** or **Webpack**. Vite is recommended for speed and ease of use with extensions (via `@crxjs/vite-plugin` or similar).
2.  **Modules**: Convert `js/*.js` files to ES Modules (`import`/`export`) to eliminate global scope pollution and manage dependencies explicitly.
3.  **Asset Handling**: improved handling of CSS and images through the bundler.

### Stage 3: TypeScript Migration

_Goal: Improve type safety and maintainability._

1.  **Setup**: Configure `tsconfig.json`.
2.  **Migration**: Rename `.js` files to `.ts` incrementally.
3.  **Typing**: Add type definitions for Chrome APIs (`@types/chrome`) and internal data structures (e.g., `Redirect` object).

### Stage 4: Testing Strategy

_Goal: Ensure reliability during refactoring._

1.  **Unit Tests**: Install **Vitest** or **Jest**. Write tests for the core `Redirect` class (`js/redirect.js`) to verify matching logic and regex processing.
2.  **E2E Tests**: Consider **Playwright** or **Puppeteer** to test the extension in a headless browser context.

### Stage 5: Manifest V3 Migration (Critical)

_Goal: Future-proof the extension for the Chrome Web Store._

1.  **Background Context**: Migrate `background.js` to a **Service Worker**. Handle the non-persistent nature of service workers (state management).
2.  **Blocking API**: Transition from `webRequestBlocking` to **`declarativeNetRequest`**.
    - _Challenge_: DNR has static rule limits and less flexibility than dynamic JS blocking.
    - _Strategy_: Map user-defined redirects to dynamic DNR rules where possible. Identify unsupported complex redirects (e.g., specific JS-based transformations) and determine if they can be supported or need deprecation/alternatives.
3.  **API Updates**: Update `chrome.browserAction` to `chrome.action`.

### Stage 6: UI Refresh (Optional)

_Goal: Enhance user experience and code organization._

1.  **Framework**: Adopt a lightweight component framework like **Preact**, **React**, or **Svelte** for `popup.html` and `redirector.html`.
2.  **Components**: Create reusable components for the rule list, editors, and settings.

## 3. Immediate Next Steps

1.  Initialize `package.json`.
2.  Install ESLint, Prettier, and TypeScript.
3.  Create a standard directory structure (`src/`, `tests/`).
