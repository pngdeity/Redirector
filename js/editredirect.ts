import { RedirectClass as Redirect } from './redirect';
import { REDIRECTS } from './state';
import { el, showForm, hideForm, dataBind } from './util';
import { saveChanges, updateBindings } from './redirectorpage';

var activeRedirect: any = null;
var template: HTMLElement;

export function setEditTemplate(t: HTMLElement) {
  template = t;
}

export function createNewRedirect() {
  activeRedirect = new Redirect(null);
  el('#edit-redirect-form h3').textContent = 'Create Redirect';
  showForm('#edit-redirect-form', activeRedirect);
  el('#btn-save-redirect').setAttribute('disabled', 'disabled');
}

export function editRedirect(index: number) {
  el('#edit-redirect-form h3').textContent = 'Edit Redirect';
  activeRedirect = new Redirect(REDIRECTS[index]); //Make a new one, which we can dump a bunch of stuff on...
  activeRedirect.existing = true;
  activeRedirect.index = index;
  showForm('#edit-redirect-form', activeRedirect);
  setTimeout(() => (el('input[data-bind="description"]') as HTMLElement).focus(), 200);
}

function cancelEdit() {
  activeRedirect = null;
  hideForm('#edit-redirect-form');
}

function saveRedirect() {
  let savedRedirect = new Redirect(activeRedirect).toObject();
  if (activeRedirect.existing) {
    REDIRECTS[activeRedirect.index] = savedRedirect; //To strip out any extra crap we've added
  } else {
    REDIRECTS.push(savedRedirect);
    let newNode = template.cloneNode(true) as HTMLElement;
    newNode.removeAttribute('id');
    el('.redirect-rows').appendChild(newNode);
  }

  updateBindings();
  saveChanges();
  hideForm('#edit-redirect-form');
}

function toggleAdvancedOptions(ev: Event) {
  ev.preventDefault();
  let advancedOptions = el('.advanced');
  if (advancedOptions.classList.contains('hidden')) {
    advancedOptions.classList.remove('hidden');
    el('#advanced-toggle a').textContent = 'Hide advanced options...';
  } else {
    advancedOptions.classList.add('hidden');
    el('#advanced-toggle a').textContent = 'Show advanced options...';
  }
}

function editFormChange() {
  //Now read values back from the form...
  for (let input of Array.from(
    el('#edit-redirect-form').querySelectorAll('input[type="text"][data-bind]')
  )) {
    let prop = input.getAttribute('data-bind')!;
    activeRedirect[prop] = (input as HTMLInputElement).value;
  }
  activeRedirect.appliesTo = [];
  for (let input of Array.from(el('#apply-to').querySelectorAll('input:checked'))) {
    activeRedirect.appliesTo.push((input as HTMLInputElement).value);
  }

  activeRedirect.processMatches = (
    el('#process-matches option:checked') as HTMLOptionElement
  ).value;
  activeRedirect.patternType = (el('[name="patterntype"]:checked') as HTMLInputElement).value;

  activeRedirect.updateExampleResult();

  dataBind('#edit-redirect-form', activeRedirect);
}

var deleteIndex: number;
export function confirmDeleteRedirect(index: number) {
  deleteIndex = index;
  let redirect = REDIRECTS[deleteIndex];
  showForm('#delete-redirect-form', redirect);
}

function deleteRedirect() {
  REDIRECTS.splice(deleteIndex, 1);
  let node = el(`.redirect-row[data-index="${deleteIndex}"]`);
  node.parentNode!.removeChild(node);
  updateBindings();
  saveChanges();
  hideForm('#delete-redirect-form');
}

function cancelDelete() {
  hideForm('#delete-redirect-form');
}

export function setupEditAndDeleteEventListeners() {
  el('#btn-save-redirect').addEventListener('click', saveRedirect);
  el('#btn-cancel-edit').addEventListener('click', cancelEdit);

  el('#confirm-delete').addEventListener('click', deleteRedirect);
  el('#cancel-delete').addEventListener('click', cancelDelete);

  el('#advanced-toggle a').addEventListener('click', toggleAdvancedOptions);

  el('#create-new-redirect').addEventListener('click', createNewRedirect);
  //Listen to any change from the edit form...
  el('#edit-redirect-form').addEventListener('input', editFormChange);
}
