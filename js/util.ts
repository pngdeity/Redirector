export function dataBind(el: HTMLElement | string, dataObject: any) {
  function boolValue(prop: string) {
    return prop.charAt(0) === '!' ? !dataObject[prop.substr(1)] : dataObject[prop];
  }

  if (typeof el === 'string') {
    el = document.querySelector(el) as HTMLElement;
  }
  for (let tag of Array.from(el.querySelectorAll('[data-bind]'))) {
    let prop = tag.getAttribute('data-bind')!;
    if (tag.tagName.toLowerCase() === 'input') {
      let input = tag as HTMLInputElement;
      if (input.getAttribute('type')!.toLowerCase() === 'radio') {
        input.checked = dataObject[prop] === input.getAttribute('value');
      } else if (input.getAttribute('type')!.toLowerCase() === 'checkbox') {
        input.checked = dataObject[prop];
      } else {
        input.value = dataObject[prop];
      }
    } else if (tag.tagName.toLowerCase() === 'select') {
      for (let opt of Array.from(tag.querySelectorAll('option'))) {
        if (opt.getAttribute('value') === dataObject[prop]) {
          opt.setAttribute('selected', 'selected');
        } else {
          opt.removeAttribute('selected');
        }
      }
    } else if (Array.isArray(dataObject[prop])) {
      //Array of values, check any checkboxes in child elements
      for (let checkbox of Array.from(tag.querySelectorAll('input[type="checkbox"'))) {
        (checkbox as HTMLInputElement).checked = dataObject[prop].includes(
          checkbox.getAttribute('value')
        );
      }
    } else {
      tag.textContent = dataObject[prop];
    }
  }
  for (let tag of Array.from(el.querySelectorAll('[data-show]'))) {
    let shouldShow = boolValue(tag.getAttribute('data-show')!);
    (tag as HTMLElement).style.display = shouldShow ? '' : 'none';
  }
  for (let tag of Array.from(el.querySelectorAll('[data-disabled]'))) {
    let isDisabled = boolValue(tag.getAttribute('data-disabled')!);

    if (isDisabled) {
      tag.classList.add('disabled');
      tag.setAttribute('disabled', 'disabled');
    } else {
      tag.classList.remove('disabled');
      tag.removeAttribute('disabled');
    }
  }
  for (let tag of Array.from(el.querySelectorAll('[data-class]'))) {
    let [className, prop] = tag.getAttribute('data-class')!.split(':');
    let shouldHaveClass = boolValue(prop);
    if (shouldHaveClass) {
      tag.classList.add(className);
    } else {
      tag.classList.remove(className);
    }
  }
}

export function show(id: string) {
  let el = document.querySelector(id) as HTMLElement;
  if (el) {
    el.style.display = 'block';
  }
}

export function hide(id: string) {
  let el = document.querySelector(id) as HTMLElement;
  if (el) {
    el.style.display = 'none';
  }
}

export function el(query: string) {
  return document.querySelector(query) as HTMLElement;
}

export function showForm(selector: string, dataObject: any) {
  dataBind(selector, dataObject);
  el('#blur-wrapper').classList.add('blur');
  show('#cover');
  show(selector);
}

export function move(arr: any[], from: number, to: number) {
  arr.splice(to, 0, arr.splice(from, 1)[0]);
}

export function hideForm(selector: string) {
  hide('#cover');
  hide(selector);
  el('#blur-wrapper').classList.remove('blur');
}

// Shows a message bar above the list of redirects.
export function showMessage(message: string, success?: boolean) {
  let messageBox = document.getElementById('message-box') as HTMLElement;
  dataBind('#message-box', { message });
  if (success) {
    messageBox.className = 'visible success';
  } else {
    messageBox.className = 'visible error';
  }

  let timer = 20;

  //Remove the message in 20 seconds if it hasn't been changed...
  setTimeout(function () {
    if (el('#message').textContent === message) {
      messageBox.className = ''; //Removing .visible removes the box...
    }
  }, timer * 1000);
}

export function hideMessage() {
  el('#message-box').className = '';
}
