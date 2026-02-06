// Type definitions for the project

export interface RedirectObject {
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
  $first?: boolean;
  $last?: boolean;
  $index?: number;
  existing?: boolean;
  index?: number;
}

export interface RedirectResult {
  isMatch: boolean;
  isExcludeMatch: boolean;
  isDisabledMatch: boolean;
  redirectTo: string;
}

export interface Options {
  isSyncEnabled: boolean;
}
