import { RedirectClass as Redirect } from './redirect';
import { el, dataBind } from './util';

var storage = chrome.storage.local;

function dataBindAll() {
  dataBind('#redirect-form', new Redirect(null));
}

function setupListeners() {
  el('input[data-bind="includePattern"]').addEventListener('input', checkMatch);
  el('input[data-bind="excludePattern"]').addEventListener('input', checkMatch);
}

function checkMatch() {
  var include = (el('input[data-bind="includePattern"]') as HTMLInputElement).value;
  var exclude = (el('input[data-bind="excludePattern"]') as HTMLInputElement).value;
  var r = new Redirect({ includePattern: include, excludePattern: exclude });
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var curr = tabs[0].url || '';
    var match = r.getMatch(curr);
    if (match.isMatch) {
      el('#message').textContent = 'Redirects to: ' + match.redirectTo;
    } else if (match.isExcludeMatch) {
      el('#message').textContent = 'Excluded';
    } else {
      el('#message').textContent = 'No match';
    }
  });
}

function updateDisabled() {
  storage.get({ disabled: false }, function (obj) {
    if (obj.disabled) {
      el('#toggle-disabled').textContent = 'Enable Redirector';
      el('#toggle-disabled').classList.add('disabled');
    } else {
      el('#toggle-disabled').textContent = 'Disable Redirector';
      el('#toggle-disabled').classList.remove('disabled');
    }
  });
}

function toggleDisabled() {
  storage.get({ disabled: false }, function (obj) {
    storage.set({ disabled: !obj.disabled }, updateDisabled);
  });
}

function openRedirectorSettings() {
  var url = chrome.extension.getURL('redirector.html');
  chrome.tabs.query({ currentWindow: true }, function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].url == url) {
        chrome.tabs.update(tabs[i].id!, { active: true }, function (tab) {
          window.close();
        });
        return;
      }
    }
    chrome.tabs.create({ url: url, active: true });
  });
}

function load() {
  dataBindAll();
  setupListeners();
  updateDisabled();
  el('#toggle-disabled').addEventListener('click', toggleDisabled);
  el('#open-redirector-settings').addEventListener('click', openRedirectorSettings);

  storage.get(
    { logging: false, enableNotifications: false, disabled: false },
    function (obj) {
      // console.log(obj);
    }
  );
}

load();
