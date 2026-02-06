import { RedirectClass as Redirect } from './redirect';
import { convertToDNR, DNRRule } from './dnr-converter';

interface Log {
  (msg: string, force?: boolean): void;
  enabled?: boolean;
}

const log: Log = function (msg: string, force?: boolean) {
  if (log.enabled || force) {
    console.log('REDIRECTOR: ' + msg);
  }
};
log.enabled = false;

// Global state for Legacy Fallback (In-memory, but reloaded on startup)
// Rules that cannot be handled by DNR will be stored here.
// In V3, the service worker can die, so we must ensure we reload these on startup.
let legacyRules: Redirect[] = [];

// Cache for loop detection (Legacy only)
const ignoreNextRequest: { [key: string]: number } = {};
const justRedirected: { [key: string]: { timestamp: number; count: number } } = {};
const redirectThreshold = 3;

function isDarkMode() {
  return false; // Not reliable in Service Worker context without window
}

// Icon updating
function updateIcon() {
  chrome.storage.local.get({ disabled: false }, function (obj) {
    const disabled = obj.disabled;
    if (disabled) {
      chrome.action.setBadgeText({ text: 'off' });
      chrome.action.setBadgeBackgroundColor({ color: '#fc5953' });
    } else {
      chrome.action.setBadgeText({ text: 'on' });
      chrome.action.setBadgeBackgroundColor({ color: '#35b44a' });
    }
  });
}

// --- DNR Synchronization Logic ---

async function syncRules() {
  log('Syncing rules...');
  const { redirects, disabled } = await chrome.storage.local.get({ redirects: [], disabled: false });

  if (disabled) {
    log('Extension disabled, clearing all rules.');
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(r => r.id)
    });
    legacyRules = [];
    return;
  }

  const dnrRules: chrome.declarativeNetRequest.Rule[] = [];
  const newLegacyRules: Redirect[] = [];

  let idCounter = 1;
  for (const r of (redirects as any[])) {
    const redirect = new Redirect(r);
    if (redirect.disabled) continue;

    const dnrRule = convertToDNR(redirect, idCounter);
    if (dnrRule) {
      dnrRules.push(dnrRule as chrome.declarativeNetRequest.Rule); // Cast compatible types
      idCounter++;
    } else {
      // Fallback to legacy listener
      newLegacyRules.push(redirect);
    }
  }

  // Update DNR rules
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = oldRules.map(r => r.id);
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: dnrRules
  });

  // Update Legacy state
  legacyRules = newLegacyRules;
  log(`Synced: ${dnrRules.length} DNR rules, ${legacyRules.length} Legacy rules.`);
}

// --- Legacy Listener (Non-Blocking) ---
// This handles complex rules (e.g. decoding) by redirecting *after* the request has started.
// This causes a "double load" but preserves functionality.

function checkLegacyRedirects(details: any) {
  if (details.method !== 'GET') return;
  if (legacyRules.length === 0) return;

  // Loop detection
  const timestamp = ignoreNextRequest[details.url];
  if (timestamp && (Date.now() - timestamp < 3000)) {
    delete ignoreNextRequest[details.url];
    return;
  }

  for (const r of legacyRules) {
    const result = r.getMatch(details.url);
    if (result.isMatch) {
      // Check loop threshold
      const data = justRedirected[details.url];
      const threshold = 3000;
      if (!data || Date.now() - data.timestamp > threshold) {
        justRedirected[details.url] = { timestamp: Date.now(), count: 1 };
      } else {
        data.count++;
        if (data.count >= redirectThreshold) {
          log(`Ignoring ${details.url} due to loop detection.`);
          return;
        }
      }

      log(`Legacy Redirect: ${details.url} -> ${result.redirectTo}`);
      
      // Perform redirect via Tabs API
      ignoreNextRequest[result.redirectTo] = Date.now();
      chrome.tabs.update(details.tabId, { url: result.redirectTo });
      
      // Show notification if enabled (handled by message passing or checking storage)
      checkNotifications(r, details.url, result.redirectTo);
      break; 
    }
  }
}

function checkNotifications(redirect: Redirect, original: string, target: string) {
    chrome.storage.local.get({ enableNotifications: false }, (data) => {
        if (data.enableNotifications) {
             chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon-light-theme-48.png',
                title: 'Redirector',
                message: `Redirected ${original} to ${target}`
            });
        }
    });
}


// --- Initialization & Event Listeners ---

chrome.runtime.onInstalled.addListener(() => {
  log('Installed/Updated. Initializing...');
  updateIcon();
  syncRules();
});

chrome.runtime.onStartup.addListener(() => {
  log('Service Worker Startup');
  updateIcon();
  syncRules(); // Re-load rules into memory/DNR
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.redirects || changes.disabled) {
    syncRules();
  }
  if (changes.disabled) {
    updateIcon();
  }
  if (changes.logging) {
    log.enabled = changes.logging.newValue as boolean;
  }
});

// Legacy Listener registration
chrome.webRequest.onBeforeRequest.addListener(
  checkLegacyRedirects as any,
  { urls: ['<all_urls>'] }
);

// Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get-redirects') {
    chrome.storage.local.get({ redirects: [] }, (obj) => {
      sendResponse(obj);
    });
    return true;
  } else if (request.type === 'save-redirects') {
    chrome.storage.local.set({ redirects: request.redirects }, () => {
      sendResponse({ message: 'Redirects saved' });
    });
    return true;
  } else if (request.type === 'update-icon') {
    updateIcon();
    return true;
  } else if (request.type === 'toggle-sync') {
      // simplified sync toggle logic for now
      chrome.storage.local.set({ isSyncEnabled: request.isSyncEnabled }, () => {
          sendResponse({ message: 'sync-enabled' }); // Mock response
      });
      return true;
  }
});

// Initialize logging
chrome.storage.local.get({ logging: false }, (data) => {
    log.enabled = data.logging as boolean;
});