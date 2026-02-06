import { el, show, hideMessage } from './util';
import { RedirectClass as Redirect } from './redirect';
import { REDIRECTS, options } from './state';
import * as RPA from './redirectorpage';
import * as ERA from './editredirect';
import { setupImportExportEventListeners } from './importexport';
import { setupOrganizeModeToggleEventListener } from './organizemode';

// Map string action names to actual functions
const ActionMap: { [key: string]: Function } = {
  moveUp: RPA.moveUp,
  moveDown: RPA.moveDown,
  moveUpTop: RPA.moveUpTop,
  moveDownBottom: RPA.moveDownBottom,
  toggleDisabled: RPA.toggleDisabled,
  duplicateRedirect: RPA.duplicateRedirect,
  confirmDeleteRedirect: ERA.confirmDeleteRedirect,
  editRedirect: ERA.editRedirect,
};

function pageLoad() {
  const template = el('#redirect-row-template');
  template.parentNode!.removeChild(template);

  // Pass template to modules that need it
  RPA.setTemplate(template);
  ERA.setEditTemplate(template);

  chrome.runtime.sendMessage({ type: 'get-redirects' }, function (response) {
    console.log('Received redirects message, count=' + response.redirects.length);
    for (var i = 0; i < response.redirects.length; i++) {
      REDIRECTS.push(new Redirect(response.redirects[i]).toObject());
    }

    if (response.redirects.length === 0) {
      //Add example redirect for first time users...
      REDIRECTS.push(
        new Redirect({
          description: 'Example redirect, try going to http://example.com/anywordhere',
          exampleUrl: 'http://example.com/some-word-that-matches-wildcard',
          exampleResult: 'https://google.com/search?q=some-word-that-matches-wildcard',
          error: null,
          includePattern: 'http://example.com/*',
          excludePattern: '',
          patternDesc: 'Any word after example.com leads to google search for that word.',
          redirectUrl: 'https://google.com/search?q=$1',
          patternType: 'W',
          processMatches: 'noProcessing',
          disabled: false,
          appliesTo: ['main_frame'],
        }).toObject()
      );
    }
    RPA.renderRedirects();
  });

  chrome.storage.local.get({ isSyncEnabled: false }, function (obj) {
    options.isSyncEnabled = obj.isSyncEnabled as boolean;
    (el('#storage-sync-option input') as HTMLInputElement).checked = options.isSyncEnabled;
  });

  if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
    show('#storage-sync-option');
  }

  //Setup event listeners
  el('#hide-message').addEventListener('click', hideMessage);
  el('#storage-sync-option input').addEventListener('click', RPA.toggleSyncSetting);

  // General Action Dispatcher
  el('.redirect-rows').addEventListener('click', function (ev) {
    let target = ev.target as HTMLElement;
    if ((target as HTMLInputElement).type == 'checkbox') {
      (target.nextElementSibling as HTMLElement).classList.add('checkMarked');
      target.parentElement!.parentElement!.classList.add('grouped');
      RPA.toggleGrouping(parseInt(target.getAttribute('data-index') || '-1'));
    }

    let action = target.getAttribute('data-action');
    if (!action) {
      return;
    }

    let handler = ActionMap[action];
    let index = parseInt(target.getAttribute('data-index')!);

    if (handler) {
      handler(index);
    }
  });

  // Initialize other modules
  ERA.setupEditAndDeleteEventListeners();
  setupImportExportEventListeners();
  setupOrganizeModeToggleEventListener();
}

function updateFavicon(e: MediaQueryListEvent | MediaQueryList) {
  let type = e.matches ? 'dark' : 'light';
  (el('link[rel="shortcut icon"]') as HTMLLinkElement).href =
    `images/icon-${type}-theme-32.png`;
  chrome.runtime.sendMessage({ type: 'update-icon' });
}

let mql = window.matchMedia('(prefers-color-scheme:dark)');
mql.onchange = updateFavicon;
updateFavicon(mql);

pageLoad();