# Redirector

Web browser extension to redirect URLs based on regex or wildcard patterns. Works with Firefox- and Chromium-based browsers.

## Tribute

In loving memory of the original author, Einar Egilsson. He gave us Redirector and selflessly nurtured it for many years. We miss you Einar and will always remember your kindness and generosity.

## Download Links

Currently, the extension must be manually loaded. See [Development](#development) below.
<!--- TODO
- [Firefox](https://addons.mozilla.org/firefox/addon/redirector/)
- [Chromium-based browsers](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd) TODO
--->

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

## Development

### Prerequisites

- Node.js (v20 or higher recommended)
- npm

### Installation

```bash
git clone https://github.com/pngdeity/Redirector/
cd Redirector
npm install
```

### Commands

- `npm run dev`: Start Vite development server with HMR.
- `npm run build`: Build the extension for both Chrome and Firefox into the `dist/` directory.
   - `npm run build:firefox`: Build only the Firefox version into `dist/firefox/`.
   - `npm run build:chrome`: Build only the Chrome version into `dist/chrome/`.
- `npm run test`: Run the test suite using Vitest.
- `npm run lint`: Check for code style and logic issues using ESLint.
- `npm run format`: Automatically format the codebase using Prettier.

### Testing in Browser

1. Run `npm run build`.
2. Open your browser's extension management page:
   - **Firefox**: `about:debugging#/runtime/this-firefox` (Click "Load Temporary Add-on", select `dist/firefox/manifest.json`).
   - **Chrome**: `chrome://extensions` (Enable "Developer mode", click "Load unpacked", select `dist/chrome`).
