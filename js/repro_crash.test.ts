import { describe, it, expect } from 'vitest';
import { RedirectClass as Redirect } from './redirect';

describe('Vulnerability Reproduction', () => {
  it('should not crash on invalid base64 input', () => {
    const r = new Redirect({
      includePattern: 'http://example.com/*',
      redirectUrl: '$1',
      patternType: 'W',
      processMatches: 'base64decode'
    });

    // Invalid base64 string
    const invalidBase64 = 'invalid-base64!';

    // This should ideally not throw, but handle the error gracefully
    expect(() => {
      r.getMatch(`http://example.com/${invalidBase64}`);
    }).not.toThrow();
  });
});
