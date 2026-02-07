import { describe, it, expect, beforeAll } from 'vitest';
import { RedirectClass as Redirect } from '../redirect';
import { convertToDNR } from '../dnr-converter';

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

describe('Wildcard to Regex Conversion Edge Cases', () => {

    // Helper to extract the generated regex string from the private method logic
    // We can test this by checking the dnr-converter output, or by using the public `getMatch` 
    // functionality if we want to treat it as a black box. 
    // Here we will use the DNR converter as it exposes the regex string directly.

    it('should escape pipe characters | in wildcards', () => {
        const r = new Redirect({
            includePattern: 'foo|bar',
            redirectUrl: 'http://test.com',
            patternType: 'W'
        });
        
        // This relies on the internal implementation of convertToDNR using the shared regex logic
        // But since convertToDNR is what actually generates the regexFilter for the browser, 
        // it's the perfect place to verify the regex string.
        const dnrRule = convertToDNR(r, 1);
        
        // Expected: ^foo\|bar$ 
        // Note: In string literal \\| becomes \| in regex. 
        expect(dnrRule?.condition.regexFilter).toBe('^foo\\|bar$');
    });

    it('should escape dollar signs $ in wildcards', () => {
        const r = new Redirect({
            includePattern: 'price$100',
            redirectUrl: 'http://test.com',
            patternType: 'W'
        });
        
        const dnrRule = convertToDNR(r, 1);
        
        // Expected: ^price\$100$
        expect(dnrRule?.condition.regexFilter).toBe('^price\\$100$');
    });

    it('should escape dots . in wildcards', () => {
         const r = new Redirect({
            includePattern: 'example.com',
            redirectUrl: 'http://test.com',
            patternType: 'W'
        });
        
        const dnrRule = convertToDNR(r, 1);
        
        // Expected: ^example\.com$
        expect(dnrRule?.condition.regexFilter).toBe('^example\\.com$');
    });
    
    it('should escape carets ^ in wildcards', () => {
         const r = new Redirect({
            includePattern: '^start',
            redirectUrl: 'http://test.com',
            patternType: 'W'
        });
        
        const dnrRule = convertToDNR(r, 1);
        
        // Expected: \^start$
        expect(dnrRule?.condition.regexFilter).toBe('^\\^start$');
    });

    it('should handle mixed wildcards and special characters', () => {
        const r = new Redirect({
            includePattern: 'foo*bar|baz?.',
            redirectUrl: 'http://test.com',
            patternType: 'W'
        });

        const dnrRule = convertToDNR(r, 1);

        // foo -> foo
        // * -> (.*?) 
        // bar -> bar
        // | -> \|
        // baz -> baz
        // ? -> \?
        // . -> \.
        expect(dnrRule?.condition.regexFilter).toBe('^foo(.*?)bar\\|baz\\?\\.$');
    });
});

describe('DNR Substitution Edge Cases', () => {
    it('should escape existing backslashes in substitution', () => {
        const r = new Redirect({
            includePattern: 'foo*',
            // User wants a literal backslash followed by the capture
            // e.g. "C:\Path\$1"
            redirectUrl: 'C:\\Path\\$1', 
            patternType: 'W'
        });

        const dnrRule = convertToDNR(r, 1);

        // Logic: 
        // 1. C:\\Path\\$1  (Input String)
        // 2. Escape backslashes: C:\\\\Path\\\\$1
        // 3. Convert $1 to \1: C:\\\\Path\\\\\1
        
        expect(dnrRule?.action.redirect?.regexSubstitution).toBe('C:\\\\Path\\\\\\1');
    });

     it('should handle multiple capture groups with backslashes', () => {
        const r = new Redirect({
            includePattern: '*|*', 
            redirectUrl: '$1\\$2', 
            patternType: 'W'
        });

        const dnrRule = convertToDNR(r, 1);
        
        // $1 -> \\1
        // \\ -> \\\\ 
        // $2 -> \\2
        // Result: \\1\\\\\\2
        expect(dnrRule?.action.redirect?.regexSubstitution).toBe('\\1\\\\\\2');
    });
});
