import { describe, it, expect, vi, beforeAll } from 'vitest';
import { convertToDNR } from './dnr-converter';
import { RedirectClass as Redirect } from './redirect';

beforeAll(() => {
  // Mock chrome API for tests
  (global as any).chrome = {
    declarativeNetRequest: {
      RuleActionType: {
        REDIRECT: 'redirect',
      },
      ResourceType: {
        MAIN_FRAME: 'main_frame',
        SUB_FRAME: 'sub_frame',
        STYLESHEET: 'stylesheet',
        SCRIPT: 'script',
        IMAGE: 'image',
        FONT: 'font',
        OBJECT: 'object',
        XMLHTTPREQUEST: 'xmlhttprequest',
        MEDIA: 'media',
        OTHER: 'other',
      },
    },
  };
});

describe('DNR Converter', () => {
  it('should convert a simple wildcard rule', () => {
    const redirect = new Redirect({
      includePattern: 'http://example.com/*',
      redirectUrl: 'https://example.com/$1',
      patternType: 'W',
      appliesTo: ['main_frame'],
    });

    const rule = convertToDNR(redirect, 1);

    expect(rule).not.toBeNull();
    expect(rule?.id).toBe(1);
    expect(rule?.action.type).toBe('redirect');
    expect(rule?.action.redirect?.regexSubstitution).toBe('https://example.com/\\1');
    expect(rule?.condition.regexFilter).toBe('^http://example\\.com/(.*?)$');
    expect(rule?.condition.resourceTypes).toContain('main_frame');
  });

  it('should convert a regex rule', () => {
    const redirect = new Redirect({
      includePattern: '^http://test\\.com/(.*)',
      redirectUrl: 'https://test.com/$1',
      patternType: 'R',
      appliesTo: ['xmlhttprequest'],
    });

    const rule = convertToDNR(redirect, 2);

    expect(rule).not.toBeNull();
    expect(rule?.condition.regexFilter).toBe('^http://test\\.com/(.*)');
    expect(rule?.action.redirect?.regexSubstitution).toBe('https://test.com/\\1');
    expect(rule?.condition.resourceTypes).toContain('xmlhttprequest');
  });

  it('should handle exclusions', () => {
    const redirect = new Redirect({
      includePattern: 'http://example.com/*',
      excludePattern: 'http://example.com/admin/*',
      redirectUrl: 'https://example.com/$1',
      patternType: 'W',
    });

    const rule = convertToDNR(redirect, 3);

    expect((rule?.condition as any).excludedRegexFilter).toBe('^http://example\\.com/admin/(.*?)$');
  });

  it('should return null for complex processing rules (fallback needed)', () => {
    const redirect = new Redirect({
      includePattern: 'http://example.com/*',
      redirectUrl: 'https://example.com/$1',
      processMatches: 'urlDecode', // This is not supported in DNR
    });

    const rule = convertToDNR(redirect, 4);
    expect(rule).toBeNull();
  });

  it('should return null for history state rules', () => {
    const redirect = new Redirect({
      includePattern: 'http://example.com/*',
      redirectUrl: 'https://example.com',
      appliesTo: ['history'],
    });

    const rule = convertToDNR(redirect, 5);
    expect(rule).toBeNull();
  });

  it('should map firefox specific types to closest compatible type', () => {
    const redirect = new Redirect({
      includePattern: '*',
      redirectUrl: 'foo',
      appliesTo: ['imageset'],
    });
    const rule = convertToDNR(redirect, 6);
    expect(rule?.condition.resourceTypes).toContain('image');
  });
});
