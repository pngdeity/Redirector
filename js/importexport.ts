import { RedirectClass as Redirect } from './redirect';
import { REDIRECTS } from './state';
import { el, showMessage } from './util';
import { saveChanges, renderRedirects } from './redirectorpage';

// Shows a message explaining how many redirects were imported.
function showImportedMessage(imported: number, existing: number) {
  if (imported == 0 && existing == 0) {
    showMessage('No redirects existed in the file.');
  }
  if (imported > 0 && existing == 0) {
    showMessage(
      'Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's.' : '.'),
      true
    );
  }
  if (imported == 0 && existing > 0) {
    showMessage('All redirects in the file already existed and were ignored.');
  }
  if (imported > 0 && existing > 0) {
    let m = 'Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's' : '') + '. ';
    if (existing == 1) {
      m += '1 redirect already existed and was ignored.';
    } else {
      m += existing + ' redirects already existed and were ignored.';
    }
    showMessage(m, true);
  }
}

export function importRedirects(ev: Event) {
  const file = (ev.target as HTMLInputElement).files![0];
  if (!file) {
    return;
  }
  const reader = new FileReader();

  reader.onload = function (_e) {
    let data;
    try {
      data = JSON.parse(reader.result as string);
    } catch (e: any) {
      showMessage('Failed to parse JSON data, invalid JSON: ' + (e.message || '').substr(0, 100));
      return;
    }

    if (!data.redirects || !Array.isArray(data.redirects)) {
      showMessage('Invalid JSON, missing "redirects" property or it is not an array');
      return;
    }

    let imported = 0;
    let existing = 0;

    for (let i = 0; i < data.redirects.length; i++) {
      const item = data.redirects[i];
      if (typeof item !== 'object' || item === null) continue;

      const r = new Redirect(item);
      r.updateExampleResult();
      if (
        REDIRECTS.some(function (i) {
          return new Redirect(i).equals(r);
        })
      ) {
        existing++;
      } else {
        REDIRECTS.push(r.toObject());
        imported++;
      }
    }

    showImportedMessage(imported, existing);

    saveChanges();
    renderRedirects();
  };

  try {
    reader.readAsText(file, 'utf-8');
  } catch {
    showMessage('Failed to read import file');
  }
}

export function updateExportLink() {
  const redirects = REDIRECTS.map(function (r) {
    return new Redirect(r).toObject();
  });

  const version = chrome.runtime.getManifest().version;

  const exportObj = {
    createdBy: 'Redirector v' + version,
    createdAt: new Date(),
    redirects: redirects,
  };

  const json = JSON.stringify(exportObj, null, 4);


  //Using encodeURIComponent here instead of base64 because base64 always messed up our encoding for some reason...
  (el('#export-link') as HTMLAnchorElement).href =
    'data:text/plain;charset=utf-8,' + encodeURIComponent(json);
}

export function setupImportExportEventListeners() {
  el('#import-file').addEventListener('change', importRedirects);
  el('#export-link').addEventListener('mousedown', updateExportLink);
  
  // Initial update of the link
  updateExportLink();
}
