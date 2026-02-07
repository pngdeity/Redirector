import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  (global as any).chrome = {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
      onChanged: { addListener: vi.fn() },
    },
    declarativeNetRequest: {
      getDynamicRules: vi.fn(),
      updateDynamicRules: vi.fn(),
      RuleActionType: { REDIRECT: 'redirect' },
      ResourceType: { MAIN_FRAME: 'main_frame' },
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    tabs: {
      update: vi.fn(),
    },
    notifications: {
      create: vi.fn(),
    },
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
    },
    webRequest: {
      onBeforeRequest: { addListener: vi.fn() },
    },
  };
});

const mockChrome = (global as any).chrome;

// Now safe to import
import { syncRules, checkLegacyRedirects, legacyRules } from '../background';
import { RedirectClass as Redirect } from '../redirect';

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncRules', () => {
    it('should split rules into DNR and Legacy', async () => {
      const redirects = [
        {
          description: 'DNR compatible',
          includePattern: 'http://dnr.com/*',
          redirectUrl: 'http://test.com',
          patternType: 'W',
          processMatches: 'noProcessing',
          appliesTo: ['main_frame'],
        },
        {
          description: 'Legacy required (decoding)',
          includePattern: 'http://legacy.com/*',
          redirectUrl: 'http://test.com',
          patternType: 'W',
          processMatches: 'urlDecode', // Incompatible with DNR
          appliesTo: ['main_frame'],
        },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ redirects, disabled: false });
      mockChrome.declarativeNetRequest.getDynamicRules.mockResolvedValue([]);

      await syncRules();

      // Verify DNR update
      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith(
        expect.objectContaining({
            addRules: expect.arrayContaining([
                expect.objectContaining({ condition: expect.objectContaining({ regexFilter: '^http://dnr\.com/(.*?)$' }) })
            ])
        })
      );

      // Verify Legacy list
      expect(legacyRules.length).toBe(1);
      expect(legacyRules[0].description).toBe('Legacy required (decoding)');
    });

    it('should clear all rules if disabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ redirects: [], disabled: true });
      mockChrome.declarativeNetRequest.getDynamicRules.mockResolvedValue([{ id: 1 }]);

      await syncRules();

      expect(mockChrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [1],
      });
      expect(legacyRules.length).toBe(0);
    });
  });

  describe('checkLegacyRedirects', () => {
    it('should perform redirect for matching legacy rule', () => {
        legacyRules.length = 0;
        legacyRules.push(new Redirect({
            includePattern: 'http://legacy.com/*',
            redirectUrl: 'http://success.com/$1',
            patternType: 'W',
            processMatches: 'urlDecode'
        }));

        const details = {
            method: 'GET',
            url: 'http://legacy.com/test',
            tabId: 123
        };

        checkLegacyRedirects(details);

        expect(mockChrome.tabs.update).toHaveBeenCalledWith(123, { url: 'http://success.com/test' });
    });

    it('should ignore non-GET requests', () => {
        legacyRules.length = 0;
        legacyRules.push(new Redirect({ includePattern: '*', redirectUrl: 'foo', patternType: 'W' }));

        checkLegacyRedirects({ method: 'POST', url: 'http://test.com' });

        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    it('should detect and prevent loops', () => {
        legacyRules.length = 0;
        legacyRules.push(new Redirect({
            includePattern: 'http://loop.com/*',
            redirectUrl: 'http://loop.com/1/$1',
            patternType: 'W'
        }));

        const details = { method: 'GET', tabId: 1, url: 'http://loop.com/start' };

        // 1st call
        checkLegacyRedirects(details);
        expect(mockChrome.tabs.update).toHaveBeenCalledTimes(1);

        // 2nd call (simulate rapid redirect)
        checkLegacyRedirects({ ...details, url: 'http://loop.com/1/start' });
        // 3rd call
        checkLegacyRedirects({ ...details, url: 'http://loop.com/1/1/start' });
        // 4th call - Should be blocked
        checkLegacyRedirects({ ...details, url: 'http://loop.com/1/1/1/start' });
        
        // Test exact same URL loop (e.g. A -> A)
        legacyRules.length = 0;
        legacyRules.push(new Redirect({
            includePattern: 'http://same.com',
            redirectUrl: 'http://same.com',
            patternType: 'W'
        }));
        
        const loopDetails = { method: 'GET', tabId: 1, url: 'http://same.com' };
        
        // 1st
        checkLegacyRedirects(loopDetails);
        expect(mockChrome.tabs.update).toHaveBeenCalledTimes(2); // +1 from previous test
        
        // 2nd (rapid fire on same url)
        checkLegacyRedirects(loopDetails);
        expect(mockChrome.tabs.update).toHaveBeenCalledTimes(2); // Should not have increased
    });
  });
});