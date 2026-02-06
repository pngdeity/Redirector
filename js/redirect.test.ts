import { describe, it, expect } from 'vitest';
import { RedirectClass as Redirect } from './redirect';

describe('Redirect', () => {
  describe('Wildcard matching', () => {
    it('should match simple wildcards', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        redirectUrl: 'http://example.com/foo/$1',
        patternType: 'W',
      });
      const result = r.getMatch('http://example.com/bar');
      expect(result.isMatch).toBe(true);
      expect(result.redirectTo).toBe('http://example.com/foo/bar');
    });

    it('should match multiple wildcards', () => {
      const r = new Redirect({
        includePattern: 'http://*.example.com/*',
        redirectUrl: 'http://example.com/$2/$1',
        patternType: 'W',
      });
      const result = r.getMatch('http://foo.example.com/bar');
      expect(result.isMatch).toBe(true);
      expect(result.redirectTo).toBe('http://example.com/bar/foo');
    });

    it('should not match if pattern does not match', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        redirectUrl: 'http://google.com',
        patternType: 'W',
      });
      const result = r.getMatch('http://other.com/foo');
      expect(result.isMatch).toBe(false);
    });
  });

  describe('Regex matching', () => {
    it('should match simple regex', () => {
      const r = new Redirect({
        includePattern: '^http://example.com/(.*)$',
        redirectUrl: 'http://example.com/foo/$1',
        patternType: 'R',
      });
      const result = r.getMatch('http://example.com/bar');
      expect(result.isMatch).toBe(true);
      expect(result.redirectTo).toBe('http://example.com/foo/bar');
    });

    it('should match regex with capture groups', () => {
      const r = new Redirect({
        includePattern: 'http://(.*).example.com/(.*)',
        redirectUrl: 'http://example.com/$2/$1',
        patternType: 'R',
      });
      const result = r.getMatch('http://foo.example.com/bar');
      expect(result.isMatch).toBe(true);
      expect(result.redirectTo).toBe('http://example.com/bar/foo');
    });
  });

  describe('Exclusion patterns', () => {
    it('should exclude matching urls', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        excludePattern: 'http://example.com/foo',
        redirectUrl: 'http://google.com',
        patternType: 'W',
      });

      const match = r.getMatch('http://example.com/bar');
      expect(match.isMatch).toBe(true);

      const exclude = r.getMatch('http://example.com/foo');
      expect(exclude.isMatch).toBe(false);
      expect(exclude.isExcludeMatch).toBe(true);
    });
  });

  describe('Processing matches', () => {
    it('should url encode matches', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        redirectUrl: 'http://google.com?q=$1',
        patternType: 'W',
        processMatches: 'urlEncode',
      });
      const result = r.getMatch('http://example.com/foo bar');
      expect(result.redirectTo).toBe('http://google.com?q=foo%20bar');
    });

    it('should url decode matches', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        redirectUrl: 'http://google.com?q=$1',
        patternType: 'W',
        processMatches: 'urlDecode',
      });
      const result = r.getMatch('http://example.com/foo%20bar');
      expect(result.redirectTo).toBe('http://google.com?q=foo bar');
    });

    it('should base64 decode matches', () => {
      const r = new Redirect({
        includePattern: 'http://example.com/*',
        redirectUrl: '$1',
        patternType: 'W',
        processMatches: 'base64decode',
      });
      // aHR0cDovL2dvb2dsZS5jb20= is http://google.com
      const result = r.getMatch('http://example.com/aHR0cDovL2dvb2dsZS5jb20=');
      expect(result.redirectTo).toBe('http://google.com');
    });
  });

  describe('Complex Examples', () => {
    it('should handle the De-mobilizer example', () => {
      const r = new Redirect({
        includePattern: '^(https?://)([a-z0-9-]*\.)m(?:obile)?\.(.*)',
        redirectUrl: '$1$2$3',
        patternType: 'R',
      });
      const result = r.getMatch('https://en.m.wikipedia.org/wiki/Software_engineering');
      expect(result.isMatch).toBe(true);
      expect(result.redirectTo).toBe('https://en.wikipedia.org/wiki/Software_engineering');
    });
  });
});
