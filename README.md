# Redirector

Web browser extension (Firefox, Vivaldi, Chrome, Opera, Edge) to redirect URLs based on regex or wildcard patterns.

## Tribute

In loving memory of Einar Egilsson, who gave us Redirector and selflessly nurtured it for many years. We miss you Einar, and will always remember your kindness and generosity.

## Technical Modernization

This project has been modernized to follow current web extension standards:

- **Manifest V3**: Updated to use the latest browser extension standard for improved security and performance.
- **TypeScript**: The entire codebase is now type-safe for better maintainability.
- **Vite**: Uses a modern build system for faster development and optimized production builds.
- **Vitest**: Automated unit tests ensure the core redirection logic remains reliable.
- **ES Modules**: Code is modularized using standard `import`/`export` syntax.
- **GitHub Actions**: Integrated CI/CD pipeline for automated testing and releases.

## Development

### Prerequisites

- Node.js (v20 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Commands

- `npm run dev`: Start Vite development server with HMR.
- `npm run build`: Build the extension for both Chrome and Firefox into the `dist/` directory.
- `npm run build:chrome`: Build only the Chrome version into `dist/chrome/`.
- `npm run build:firefox`: Build only the Firefox version into `dist/firefox/`.
- `npm run test`: Run the test suite using Vitest.
- `npm run lint`: Check for code style and logic issues using ESLint.
- `npm run format`: Automatically format the codebase using Prettier.

### Testing in Browser

1. Run `npm run build`.
2. Open your browser's extension management page:
   - **Chrome**: `chrome://extensions` (Enable "Developer mode", click "Load unpacked", select `dist/chrome`).
   - **Firefox**: `about:debugging#/runtime/this-firefox` (Click "Load Temporary Add-on", select `dist/firefox/manifest.json`).

## Download Links

- [Firefox](https://addons.mozilla.org/firefox/addon/redirector/)
- [Chromium-based browsers](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd)

## Examples

### De-mobilizer

- Example URL: `https://en.m.wikipedia.org/`
- Include pattern: `^(https?://)([a-z0-9-]*\.)m(?:obile)?\.(.*)`
- Redirect to: `$1$2$3`
- Pattern type: Regular Expression
- Description: Always show the desktop version of websites

### AMP redirect

- Example URL: `https://www.google.com/amp/www.example.com/amp/document`
- Include pattern: `^(?:https?://)www.(?:google|bing).com/amp/(?:s/)?(.*)`
- Redirect to: `https://$1`
- Pattern type: Regular Expression
- Description: AMP is bad

### YouTube Shorts to YouTube

- Example URL: `https://www.youtube.com/shorts/video-id`
- Include pattern: `^(?:https?://)(?:www.)?youtube.com/shorts/([a-zA-Z0-9_-]+)(.*)`
- Redirect to: `https://www.youtube.com/watch?v=$1$2`
- Pattern type: Regular Expression
- Description: Redirect YouTube Shorts to regular YouTube
