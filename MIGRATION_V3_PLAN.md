# Manifest V3 Migration Plan for Redirector

## Executive Summary
Migrating to Manifest V3 (MV3) requires a fundamental architectural shift. The current extension relies on the blocking `webRequest` API to intercept and redirect requests using JavaScript logic. MV3 removes blocking web requests for security and performance, replacing them with the `declarativeNetRequest` (DNR) API.

**Key Consequence:** We can no longer execute arbitrary JavaScript (like `base64decode` or complex custom logic) to decide the redirect URL at the moment of the request. We must "compile" user rules into static JSON rulesets that the browser enforces.

## 1. Compatibility Analysis

### Fully Supported Features (via DNR)
*   **Wildcard Patterns:** Can be converted to glob or regex filters.
*   **Regex Patterns:** Supported via `regexFilter` (with some limitations on complexity/memory).
*   **Capture Groups ($1, $2...):** Supported via `regexSubstitution`.
*   **Request Type Filtering:** Supported (e.g., `main_frame`, `xmlhttprequest`).
*   **Exclusion Patterns:** Supported via `excludedRegexFilter`.

### At-Risk Features (No direct DNR support)
*   **Process Matches (URL Decode, Base64 Decode, etc.):** DNR regex substitution cannot perform functions like `decodeURIComponent` or `atob`.
    *   *Mitigation:* These rules cannot use the fast DNR path. We may need to use a non-blocking `webRequest` listener to detect these, then use `chrome.tabs.update` (which is slower and allows the initial request to hit the network) or deprecate these features.

## 2. Migration Roadmap

### Phase 1: Service Worker & State Management
*Goal: Ensure the background script survives the transition to an ephemeral Service Worker.*

1.  **Remove Persistent State:** The `background.ts` currently uses global variables (`partitionedRedirects`, `ignoreNextRequest`). These are wiped when the Service Worker goes to sleep.
2.  **Event-Driven Architecture:** Refactor logic so that we don't cache rules in memory. Instead, we rely on the browser's DNR engine to hold the state.
3.  **Update Manifest:** Change `background.scripts` to `background.service_worker`.

### Phase 2: The DNR Converter (`js/dnr-converter.ts`)
*Goal: Create a "Compiler" that turns a `Redirect` object into a `chrome.declarativeNetRequest.Rule`.*

1.  **Regex Conversion:**
    *   Browser DNR uses RE2 syntax (no lookaheads/lookbehinds).
    *   Our "Wildcard" patterns need to be converted to RE2 compatible regexes.
2.  **Rule ID Management:**
    *   DNR rules require unique integer IDs. We need a stable hashing algorithm or ID management strategy to map User Rules <-> DNR Rules.
3.  **Action definition:**
    *   Map `redirectUrl` to `action: { type: "redirect", redirect: { regexSubstitution: ... } }`.

### Phase 3: Background Script Overhaul
*Goal: Replace the request listener loop with a rule synchronization engine.*

1.  **Delete:** `chrome.webRequest.onBeforeRequest.addListener`.
2.  **Create:** `syncRules()` function.
    *   Triggered on `chrome.storage.onChanged`.
    *   Reads all user redirects.
    *   Converts them to DNR Rules.
    *   Calls `chrome.declarativeNetRequest.updateDynamicRules` to replace the active ruleset.

### Phase 4: Handling "Advanced Processing" (Legacy Support)
1.  **Identify Incompatible Rules:** Rules using `processMatches != 'noProcessing'`.
2.  **Fallback Implementation:**
    *   Keep a (non-blocking) `webRequest` listener *only* for these specific rules.
    *   When matched, execute the JS logic and perform a Javascript-based redirect (e.g., `chrome.tabs.update`).
    *   *Note:* This is less efficient and may result in a "flash" of the original page, but preserves functionality.

### Phase 5: UI & Permissions Updates
1.  **Manifest Permissions:**
    *   Remove `webRequestBlocking`.
    *   Add `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`.
    *   Add `host_permissions` for `<all_urls>`.
2.  **Action API:** Rename `browser_action` to `action` in `manifest.json`.

## 3. Technical Specifications

### New `manifest.json` Structure
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "js/background.js"
  },
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "action": { ... }
}
```

### Proposed `DNRConverter` Interface
```typescript
interface DNRRule {
    id: number;
    priority: number;
    action: {
        type: 'redirect';
        redirect: { regexSubstitution: string };
    };
    condition: {
        regexFilter: string;
        resourceTypes: string[];
        excludedRegexFilter?: string;
    };
}

function convert(redirect: Redirect): DNRRule | null {
    // Return null if rule cannot be converted (requires legacy handling)
}
```

## 4. Execution Steps
1.  Create `js/dnr-converter.ts` and write unit tests for it (crucial).
2.  Create `js/background-mv3.ts` (draft) to implement the sync logic.
3.  Update `manifest.json` and switch build to MV3.
4.  Test extensively, as regex behavior might differ slightly between JS Regex and Chrome's DNR Regex.
