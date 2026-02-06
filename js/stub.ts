//Stub file to use for development, to mock the chrome.* apis.

if (
  !window.chrome ||
  !chrome.storage ||
  !chrome.storage.local ||
  // @ts-ignore
  (!window.chrome.extension && !window.chrome.runtime)
) {
  // @ts-ignore
  window.chrome = window.chrome || {};
  // @ts-ignore
  window.chrome.storage = window.chrome.storage || {};

  var defaults = {
    createdBy: 'Redirector v3.2',
    createdAt: '2019-12-09T12:54:13.391Z',
    redirects: [
      {
        description: 'Mbl test',
        exampleUrl: 'https://mbl.is',
        exampleResult: 'http://foo.is',
        error: null,
        includePattern: '*mbl*',
        excludePattern: '',
        patternDesc: 'My description',
        redirectUrl: 'http://foo.is',
        patternType: 'W',
        processMatches: 'noProcessing',
        disabled: false,
        appliesTo: ['main_frame', 'script'],
      },
      {
        description: 'Msdfsdfbl test',
        exampleUrl: 'https://mbssfdsl.is',
        exampleResult: 'http://foo.is',
        error: null,
        includePattern: '*mbl*',
        excludePattern: '',
        patternDesc: 'My description',
        redirectUrl: 'http://foo.is',
        patternType: 'W',
        processMatches: 'urlEncode',
        disabled: false,
        appliesTo: ['main_frame', 'sub_frame'],
      },
      {
        description: 'https://foo.is?s=joh',
        exampleUrl: 'https://foo.is?s=joh',
        exampleResult: 'https://foo.is',
        error: null,
        includePattern: '(.*)(\\?s=)(.*)',
        excludePattern: '',
        patternDesc: 'Test error',
        redirectUrl: '$1',
        patternType: 'R',
        processMatches: 'noProcessing',
        disabled: false,
        appliesTo: ['main_frame'],
      },
    ],
  };

  // @ts-ignore
  window.chrome.storage.local = {
    get: function (defaults: any, callback: any) {
      if (typeof defaults == 'string') {
        defaults = { [defaults]: null };
      } else if (Array.isArray(defaults)) {
        let o: any = {};
        for (let i = 0; i < defaults.length; i++) {
          o[defaults[i]] = null;
        }
        defaults = o;
      }

      var result: any = {};
      for (let key in defaults) {
        result[key] = localStorage.getItem(key);
        if (result[key] === null) {
          result[key] = defaults[key];
        } else {
          result[key] = JSON.parse(result[key]!);
        }
      }
      callback(result);
    },
    set: function (obj: any, callback?: () => void) {
      for (let key in obj) {
        localStorage.setItem(key, JSON.stringify(obj[key]));
      }
      if (callback) {
        callback();
      }
    },
  };

  // @ts-ignore
  window.chrome.runtime = {
    sendMessage: function (params: any, callback: any): any {
      //console.log('Sending message: ' + JSON.stringify(params));
      if (params.type === 'get-redirects') {
        chrome.storage.local.get({ redirects: [] }, function (obj: any) {
          callback(obj);
        });
      } else if (params.type === 'save-redirects') {
        chrome.storage.local.set({ redirects: params.redirects }, function () {
          callback({ message: 'Redirects saved' });
        });
      } else if (params.type === 'toggle-sync') {
        if (params.isSyncEnabled) {
          callback({ message: 'sync-enabled' });
        } else {
          callback({ message: 'sync-disabled' });
        }
      } else if (params.type === 'update-icon') {
        //console.log('Updating icon...');
      } else {
        //console.log('Unknown message: ' + params.type);
      }
      return Promise.resolve(); 
    },
    getManifest: function () {
      return { version: '0.0.1', manifest_version: 2, name: 'Redirector' } as any;
    },
  };

  // @ts-ignore
  window.chrome.extension = {
    getURL: function (path: string) {
      return path;
    },
  };
}