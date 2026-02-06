import { RedirectObject, RedirectResult } from './types';

export class RedirectClass {
  description: string;
  exampleUrl: string;
  exampleResult: string;
  error: string | null;
  includePattern: string;
  excludePattern: string;
  patternDesc: string;
  redirectUrl: string;
  patternType: 'W' | 'R';
  processMatches: 'noProcessing' | 'urlEncode' | 'urlDecode' | 'doubleUrlDecode' | 'base64decode';
  disabled: boolean;
  grouped: boolean;
  appliesTo: string[];

  // Optional properties used in UI
  $first?: boolean;
  $last?: boolean;
  $index?: number;
  existing?: boolean;
  index?: number;

  patternTypeText: string;

  private _rxInclude: RegExp | null = null;
  private _rxExclude: RegExp | null = null;

  static WILDCARD = 'W';
  static REGEX = 'R';

  static requestTypes: { [key: string]: string } = {
    main_frame: 'Main window (address bar)',
    sub_frame: 'IFrames',
    stylesheet: 'Stylesheets',
    font: 'Fonts',
    script: 'Scripts',
    image: 'Images',
    imageset: 'Responsive Images in Firefox',
    media: 'Media (audio and video)',
    object: 'Objects (e.g. Flash content, Java applets)',
    object_subrequest: 'Object subrequests',
    xmlhttprequest: 'XMLHttpRequests (Ajax)',
    history: 'HistoryState',
    other: 'Other',
  };

  constructor(o: Partial<RedirectObject> | null) {
    o = o || {};
    this.description = o.description || '';
    this.exampleUrl = o.exampleUrl || '';
    this.exampleResult = o.exampleResult || '';
    this.error = o.error || null;
    this.includePattern = o.includePattern || '';
    this.excludePattern = o.excludePattern || '';
    this.redirectUrl = o.redirectUrl || '';
    this.patternType = o.patternType || 'W';

    this.patternTypeText = this.patternType == 'W' ? 'Wildcard' : 'Regular Expression';

    this.patternDesc = o.patternDesc || '';
    this.processMatches = o.processMatches || 'noProcessing';
    // Legacy support
    if (!o.processMatches && (o as any).unescapeMatches) {
      this.processMatches = 'urlDecode';
    }
    if (!o.processMatches && (o as any).escapeMatches) {
      this.processMatches = 'urlEncode';
    }

    this.disabled = !!o.disabled;
    this.grouped = !!o.grouped;
    if (o.appliesTo && o.appliesTo.length) {
      this.appliesTo = o.appliesTo.slice(0);
    } else {
      this.appliesTo = ['main_frame'];
    }
  }

  compile(): void {
    var incPattern = this._preparePattern(this.includePattern);
    var excPattern = this._preparePattern(this.excludePattern);

    if (incPattern) {
      try {
        this._rxInclude = new RegExp(incPattern, 'gi');
      } catch (e) {
        this._rxInclude = null;
      }
    }
    if (excPattern) {
      try {
        this._rxExclude = new RegExp(excPattern, 'gi');
      } catch (e) {
        this._rxExclude = null;
      }
    }
  }

  equals(redirect: RedirectClass): boolean {
    return (
      this.description == redirect.description &&
      this.exampleUrl == redirect.exampleUrl &&
      this.includePattern == redirect.includePattern &&
      this.excludePattern == redirect.excludePattern &&
      this.patternDesc == redirect.patternDesc &&
      this.redirectUrl == redirect.redirectUrl &&
      this.patternType == redirect.patternType &&
      this.processMatches == redirect.processMatches &&
      this.appliesTo.toString() == redirect.appliesTo.toString()
    );
  }

  toObject(): RedirectObject {
    return {
      description: this.description,
      exampleUrl: this.exampleUrl,
      exampleResult: this.exampleResult,
      error: this.error,
      includePattern: this.includePattern,
      excludePattern: this.excludePattern,
      patternDesc: this.patternDesc,
      redirectUrl: this.redirectUrl,
      patternType: this.patternType,
      processMatches: this.processMatches,
      disabled: this.disabled,
      grouped: this.grouped,
      appliesTo: this.appliesTo.slice(0),
    };
  }

  getMatch(url: string, forceIgnoreDisabled?: boolean): RedirectResult {
    if (!this._rxInclude) {
      this.compile();
    }
    var result: RedirectResult = {
      isMatch: false,
      isExcludeMatch: false,
      isDisabledMatch: false,
      redirectTo: '',
    };
    var redirectTo = this._includeMatch(url);

    if (redirectTo !== null) {
      if (this.disabled && !forceIgnoreDisabled) {
        result.isDisabledMatch = true;
      } else if (this._excludeMatch(url)) {
        result.isExcludeMatch = true;
      } else {
        result.isMatch = true;
        result.redirectTo = redirectTo;
      }
    }
    return result;
  }

  updateExampleResult(): void {
    //Default values
    this.error = null;
    this.exampleResult = '';

    if (!this.exampleUrl) {
      this.error = 'No example URL defined.';
      return;
    }

    if (this.patternType == RedirectClass.REGEX && this.includePattern) {
      try {
        new RegExp(this.includePattern, 'gi');
      } catch (e) {
        this.error = 'Invalid regular expression in Include pattern.';
        return;
      }
    }

    if (this.patternType == RedirectClass.REGEX && this.excludePattern) {
      try {
        new RegExp(this.excludePattern, 'gi');
      } catch (e) {
        this.error = 'Invalid regular expression in Exclude pattern.';
        return;
      }
    }

    if (!this.appliesTo || this.appliesTo.length == 0) {
      this.error = 'At least one request type must be chosen.';
      return;
    }

    this.compile();

    var match = this.getMatch(this.exampleUrl, true);

    if (match.isExcludeMatch) {
      this.error = 'The exclude pattern excludes the example url.';
      return;
    }

    if (!match.isMatch) {
      this.error = 'The include pattern does not match the example url.';
      return;
    }

    this.exampleResult = match.redirectTo;
  }

  isRegex(): boolean {
    return this.patternType == RedirectClass.REGEX;
  }

  isWildcard(): boolean {
    return this.patternType == RedirectClass.WILDCARD;
  }

  test(): RedirectResult {
    return this.getMatch(this.exampleUrl);
  }

  _preparePattern(pattern: string): string | null {
    if (!pattern) {
      return null;
    }
    if (this.patternType == RedirectClass.REGEX) {
      return pattern;
    } else {
      //Convert wildcard to regex pattern
      var converted = '^';
      for (var i = 0; i < pattern.length; i++) {
        var ch = pattern.charAt(i);
        if ('()[]{}?.^$\\+'.indexOf(ch) != -1) {
          converted += '\\' + ch;
        } else if (ch == '*') {
          converted += '(.*?)';
        } else {
          converted += ch;
        }
      }
      converted += '$';
      return converted;
    }
  }

  get appliesToText(): string {
    return this.appliesTo.map((type) => RedirectClass.requestTypes[type]).join(', ');
  }

  get processMatchesExampleText(): string {
    let examples = {
      noProcessing: 'Use matches as they are',
      urlEncode: 'E.g. turn /bar/foo?x=2 into %2Fbar%2Ffoo%3Fx%3D2',
      urlDecode: 'E.g. turn %2Fbar%2Ffoo%3Fx%3D2 into /bar/foo?x=2',
      doubleUrlDecode: 'E.g. turn %252Fbar%252Ffoo%253Fx%253D2 into /bar/foo?x=2',
      base64decode: 'E.g. turn aHR0cDovL2Nubi5jb20= into http://cnn.com',
    };

    return examples[this.processMatches];
  }

  _includeMatch(url: string): string | null {
    if (!this._rxInclude) {
      return null;
    }
    var matches = this._rxInclude.exec(url);
    if (!matches) {
      return null;
    }
    var resultUrl = this.redirectUrl;
    for (var i = matches.length - 1; i > 0; i--) {
      var repl = matches[i] || '';
      if (this.processMatches == 'urlDecode') {
        repl = unescape(repl);
      } else if (this.processMatches == 'doubleUrlDecode') {
        repl = unescape(unescape(repl));
      } else if (this.processMatches == 'urlEncode') {
        repl = encodeURIComponent(repl);
      } else if (this.processMatches == 'base64decode') {
        if (repl.indexOf('%') > -1) {
          repl = unescape(repl);
        }
        repl = atob(repl);
      }
      resultUrl = resultUrl.replace(new RegExp('\\$' + i, 'gi'), repl);
    }
    this._rxInclude.lastIndex = 0;
    return resultUrl;
  }

  _excludeMatch(url: string): boolean {
    if (!this._rxExclude) {
      return false;
    }
    var shouldExclude = this._rxExclude.test(url);
    this._rxExclude.lastIndex = 0;
    return shouldExclude;
  }
}
