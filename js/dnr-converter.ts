import { RedirectClass as Redirect } from './redirect';

export interface DNRRule {
  id: number;
  priority: number;
  action: chrome.declarativeNetRequest.RuleAction;
  condition: chrome.declarativeNetRequest.RuleCondition;
}

export function convertToDNR(redirect: Redirect, id: number): DNRRule | null {
  // DNR cannot handle "History" state updates or complex processing like URL decoding
  if (redirect.appliesTo.includes('history') || redirect.processMatches !== 'noProcessing') {
    return null;
  }

  const rule: DNRRule = {
    id: id,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        regexSubstitution: convertSubstitution(redirect.redirectUrl),
      },
    },
    condition: {
      regexFilter: convertPatternToRegex(redirect),
      resourceTypes: convertResourceTypes(redirect.appliesTo),
    },
  };

  if (redirect.excludePattern) {
    (rule.condition as any).excludedRegexFilter = convertPatternToRegex(redirect, true);
  }

  return rule;
}

function convertPatternToRegex(redirect: Redirect, useExclude: boolean = false): string {
  let pattern = useExclude ? redirect.excludePattern : redirect.includePattern;

  if (redirect.patternType === 'W') {
    // Convert Wildcard to Regex
    if (!pattern) return '.*'; // Fallback
    let converted = '^';
    for (let i = 0; i < pattern.length; i++) {
      let ch = pattern.charAt(i);
      if ('()[]{}?.^\\+'.indexOf(ch) !== -1) {
        converted += '\\' + ch;
      } else if (ch === '*') {
        converted += '(.*?)';
      } else {
        converted += ch;
      }
    }
    converted += '$';
    return converted;
  } else {
    // Already Regex
    return pattern;
  }
}

function convertSubstitution(url: string): string {
  // JS uses $1, DNR uses \1
  return url.replace(/\$(\d+)/g, '\\$1');
}

function convertResourceTypes(
  types: string[]
): chrome.declarativeNetRequest.ResourceType[] {
  const map: { [key: string]: chrome.declarativeNetRequest.ResourceType } = {
    main_frame: chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
    sub_frame: chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
    stylesheet: chrome.declarativeNetRequest.ResourceType.STYLESHEET,
    script: chrome.declarativeNetRequest.ResourceType.SCRIPT,
    image: chrome.declarativeNetRequest.ResourceType.IMAGE,
    font: chrome.declarativeNetRequest.ResourceType.FONT,
    object: chrome.declarativeNetRequest.ResourceType.OBJECT,
    xmlhttprequest: chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
    media: chrome.declarativeNetRequest.ResourceType.MEDIA,
    other: chrome.declarativeNetRequest.ResourceType.OTHER,
    // 'imageset' is Firefox specific, map to IMAGE or ignore?
    // 'object_subrequest' mapped to OTHER or OBJECT depending on interpretation
    object_subrequest: chrome.declarativeNetRequest.ResourceType.OTHER,
  };

  const result: chrome.declarativeNetRequest.ResourceType[] = [];
  for (const t of types) {
    if (map[t]) {
      result.push(map[t]);
    } else if (t === 'imageset') {
        result.push(chrome.declarativeNetRequest.ResourceType.IMAGE);
    }
  }
  return result;
}
