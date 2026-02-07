import { el, showMessage, hideMessage } from './util';

function displayOrganizeModeMessage() {
  if (el('#message-box').classList.contains('visible')) {
    hideMessage();
  } else {
    showMessage(
      'Use ⟱ to move a redirect to the bottom, ⟰ to move to the top, and use the checkboxes to select multiple redirects.',
      true
    );
  }
}

function organizeModeToggle(ev: Event) {
  ev.preventDefault();
  const organizeModes = ['.groupings', '.arrows'];
  for (const mode of organizeModes) {
    const organizeModeElms = document.querySelectorAll(mode);
    for (let i = 0; i < organizeModeElms.length; ++i) {
      let elm = organizeModeElms[i] as HTMLElement;
      let isHidden = false;
      if (mode === '.arrows') {
        // targeting parent span for arrows
        elm = elm.parentElement as HTMLElement;
      }
      isHidden = elm.classList.contains('hidden');
      if (isHidden) {
        elm.classList.remove('hidden');
      } else {
        elm.classList.add('hidden');
      }
    }
  }

  const buttonClasses = el('#organize-mode').classList;
  if (!buttonClasses.contains('active')) {
    el('#organize-mode').classList.add('active');
  } else {
    el('#organize-mode').classList.remove('active');
  }

  displayOrganizeModeMessage();
}

export function setupOrganizeModeToggleEventListener() {
  el('#organize-mode').addEventListener('click', organizeModeToggle);
}
