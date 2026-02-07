import { RedirectClass as Redirect } from './redirect';
import { REDIRECTS, options } from './state';
import { el, showMessage, show, dataBind, hideMessage } from './util';

var template: HTMLElement;

export function setTemplate(t: HTMLElement) {
  template = t;
}

function normalize(r: Redirect) {
  return new Redirect(r).toObject(); //Cleans out any extra props, and adds default values for missing ones.
}

// Saves the entire list of redirects to storage.
export function saveChanges() {
  // Clean them up so angular $$hash things and stuff don't get serialized.
  const arr = REDIRECTS.map(normalize);

  chrome.runtime.sendMessage({ type: 'save-redirects', redirects: arr }, function (response) {
    console.log(response.message);
    if (response.message.indexOf('Redirects failed to save') > -1) {
      showMessage(response.message, false);
    } else {
      console.log(
        'Saved ' +
          arr.length +
          ' redirects at ' +
          new Date() +
          '. Message from background page:' +
          response.message
      );
    }
  });
}

export function toggleSyncSetting() {
  chrome.runtime.sendMessage(
    { type: 'toggle-sync', isSyncEnabled: !options.isSyncEnabled },
    function (response) {
      if (response.message === 'sync-enabled') {
        options.isSyncEnabled = true;
        showMessage('Sync is enabled!', true);
      } else if (response.message === 'sync-disabled') {
        options.isSyncEnabled = false;
        showMessage('Sync is disabled - local storage will be used!', true);
      } else if (response.message.indexOf('Sync Not Possible') > -1) {
        options.isSyncEnabled = false;
        chrome.storage.local.set({ isSyncEnabled: options.isSyncEnabled }, function () {
          // console.log("set back to false");
        });
        showMessage(response.message, false);
      } else {
        alert(response.message);
        showMessage(
          'Error occured when trying to change Sync settings. Look at the logs and raise an issue',
          false
        );
      }
      (el('#storage-sync-option input') as HTMLInputElement).checked = options.isSyncEnabled;
    }
  );
}

export function renderRedirects() {
  el('.redirect-rows').textContent = '';
  for (let i = 0; i < REDIRECTS.length; i++) {
    const r = REDIRECTS[i];
    const node = template.cloneNode(true) as HTMLElement;
    node.removeAttribute('id');

    renderSingleRedirect(node, r, i);
    el('.redirect-rows').appendChild(node);
  }
}

function renderSingleRedirect(node: HTMLElement, redirect: any, index: number) {
  //Add extra props to help with rendering...
  if (index === 0) {
    redirect.$first = true;
  }
  if (index === REDIRECTS.length - 1) {
    redirect.$last = true;
  }
  redirect.$index = index;

  dataBind(node, redirect);

  node.setAttribute('data-index', index.toString());
  for (const btn of Array.from(node.querySelectorAll('.btn'))) {
    btn.setAttribute('data-index', index.toString());
  }

  const checkmark = node.querySelectorAll('.checkmark');

  if (checkmark.length == 1) {
    checkmark[0].setAttribute('data-index', index.toString());
  }

  //Remove extra props...
  delete redirect.$first;
  delete redirect.$last;
  delete redirect.$index;
}

export function updateBindings() {
  const nodes = document.querySelectorAll('.redirect-row');

  if (nodes.length !== REDIRECTS.length) {
    throw new Error(
      'Mismatch in lengths, Redirects are ' + REDIRECTS.length + ', nodes are ' + nodes.length
    );
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as HTMLElement;
    const redirect = REDIRECTS[i];
    renderSingleRedirect(node, redirect, i);
  }
}

export function duplicateRedirect(index: number) {
  const redirect = new Redirect(REDIRECTS[index]);
  REDIRECTS.splice(index, 0, redirect.toObject());

  const newNode = template.cloneNode(true) as HTMLElement;
  newNode.removeAttribute('id');
  el('.redirect-rows').appendChild(newNode);
  updateBindings();
  saveChanges();
}

function checkIfGroupingExists() {
  const grouping = REDIRECTS.map((row, i) => {
    return { row, index: i };
  })
    .filter((result) => result.row.grouped)
    .sort((a, b) => a.index - b.index);
  return grouping;
}

export function toggleDisabled(index: number) {
  const grouping = checkIfGroupingExists();

  if (grouping && grouping.length > 1) {
    for (const redirect of grouping) {
      const redirectDom = REDIRECTS[redirect.index];
      redirectDom.disabled = !redirectDom.disabled;
      redirectDom.grouped = !redirectDom.grouped;
      const elm = document.querySelector(
        "[data-index='" + redirect.index.toString() + "']"
      ) as HTMLElement;
      clearGrouping(elm);
    }
  } else {
    const redirect = REDIRECTS[index];
    redirect.disabled = !redirect.disabled;
  }

  updateBindings();
  saveChanges();
}

function clearGrouping(elm: HTMLElement) {
  elm.classList.remove('grouped');
  const checkMarkElm = elm.querySelector('label > .groupings') as HTMLElement;
  const toggleBoxElm = elm.querySelector('input') as HTMLElement;
  checkMarkElm.classList.remove('checkMarked');
  toggleBoxElm.classList.remove('checked');
}

function swap(node1: HTMLElement, node2: HTMLElement) {
  const afterNode2 = node2.nextElementSibling;
  const parent = node2.parentNode as HTMLElement;
  node1.replaceWith(node2);
  parent.insertBefore(node1, afterNode2);
}

function groupedMoveDown(group: any[]) {
  var jumpLength = 1;

  if (isGroupAdjacent(group)) {
    jumpLength = group.length;
  }

  for (const rule of group) {
    const elm = document.querySelector(
      "[data-index='" + rule.index.toString() + "']"
    ) as HTMLElement;
    const prev = document.querySelector(
      "[data-index='" + (rule.index + jumpLength).toString() + "']"
    ) as HTMLElement;
    clearGrouping(elm);
    clearGrouping(prev);
    swap(elm, prev);
  }

  for (const rule of group) {
    rule.row.grouped = false;
    const prevRedir = REDIRECTS[rule.index + jumpLength];
    REDIRECTS[rule.index + jumpLength] = REDIRECTS[rule.index];
    REDIRECTS[rule.index] = prevRedir;
  }

  updateBindings();
  saveChanges();
}

function isGroupAdjacent(grouping: any[]) {
  const distances = [];
  for (let i = grouping.length - 1; i >= 0; i--) {
    if (i != 0) {
      distances.push(grouping[i].index - grouping[i - 1].index);
    }
  }
  return distances.every((distance) => distance === 1);
}

function groupedMoveUp(group: any[]) {
  var jumpLength = 1;

  if (isGroupAdjacent(group)) {
    jumpLength = group.length;
  }

  for (const rule of group) {
    const elm = document.querySelector(
      "[data-index='" + rule.index.toString() + "']"
    ) as HTMLElement;
    const prev = document.querySelector(
      "[data-index='" + (rule.index - jumpLength).toString() + "']"
    ) as HTMLElement;
    clearGrouping(elm);
    clearGrouping(prev);

    if (jumpLength > 1) {
      swap(elm, prev);
    }
  }

  for (const rule of group) {
    rule.row.grouped = false;
    const prevRedir = REDIRECTS[rule.index - jumpLength];
    REDIRECTS[rule.index - jumpLength] = REDIRECTS[rule.index];
    REDIRECTS[rule.index] = prevRedir;
  }

  updateBindings();
  saveChanges();
}
export function moveUp(index: number) {
  const grouping = checkIfGroupingExists();

  if (grouping.length > 1) {
    groupedMoveUp(grouping);
  } else {
    const prev = REDIRECTS[index - 1];
    REDIRECTS[index - 1] = REDIRECTS[index];
    REDIRECTS[index] = prev;
  }

  updateBindings();
  saveChanges();
}

export function moveDown(index: number) {
  const grouping = checkIfGroupingExists();

  if (grouping.length > 1) {
    groupedMoveDown(grouping);
  } else {
    const next = REDIRECTS[index + 1];
    REDIRECTS[index + 1] = REDIRECTS[index];
    REDIRECTS[index] = next;
  }
  updateBindings();
  saveChanges();
}

export function moveUpTop(index: number) {
  const top = REDIRECTS[0];
  move(REDIRECTS, index, 0); // Corrected to 0 for top
  updateBindings();
  saveChanges();
}

export function moveDownBottom(index: number) {
  const bottom = REDIRECTS.length - 1;
  move(REDIRECTS, index, bottom);
  updateBindings();
  saveChanges();
}

function move(arr: any[], from: number, to: number) {
  arr.splice(to, 0, arr.splice(from, 1)[0]);
}

export function toggleGrouping(index: number) {
  if (REDIRECTS[index]) {
    REDIRECTS[index].grouped = !REDIRECTS[index].grouped;
  }
}
