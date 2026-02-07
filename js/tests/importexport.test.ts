import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { importRedirects } from '../importexport';
import * as util from '../util';
import * as rpage from '../redirectorpage';
import { REDIRECTS } from '../state';

// Mock dependencies
vi.mock('../util', () => ({
  showMessage: vi.fn(),
  el: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  dataBind: vi.fn()
}));

vi.mock('../redirectorpage', () => ({
  saveChanges: vi.fn(),
  renderRedirects: vi.fn()
}));

// Mock chrome API
(global as any).chrome = {
  runtime: {
    getManifest: () => ({ version: '3.5.4' })
  }
};

describe('Import/Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    REDIRECTS.length = 0; // Clear global state
    
    // Stub global FileReader if it doesn't exist (Node environment)
    if (!global.FileReader) {
        global.FileReader = class {
            readAsText() {}
            onload() {}
        } as any;
    }
  });

  describe('Import Validation', () => {
    it('should reject non-JSON files', () => {
      // Setup file reader mock
      const mockFile = new File(['invalid json'], 'test.json', { type: 'application/json' });
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

      // Mock FileReader
      const mockReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: 'invalid json'
      };
      
      vi.spyOn(global, 'FileReader').mockImplementation(function() { return mockReader; } as any);
      
      // Trigger import
      // @ts-ignore - Accessing private/exported function for testing
      importRedirects(mockEvent);
      
      // Simulate file load
      mockReader.onload({} as any);

      expect(util.showMessage).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON'));
      expect(rpage.saveChanges).not.toHaveBeenCalled();
    });

    it('should reject JSON without redirects array', () => {
      const mockFile = new File(['{"foo": "bar"}'], 'test.json');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      
      const mockReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: '{"foo": "bar"}'
      };
      
      vi.spyOn(global, 'FileReader').mockImplementation(function() { return mockReader; } as any);
      
      importRedirects(mockEvent);
      mockReader.onload({} as any);

      expect(util.showMessage).toHaveBeenCalledWith(expect.stringContaining('missing "redirects" property'));
      expect(rpage.saveChanges).not.toHaveBeenCalled();
    });

    it('should reject JSON where redirects is not an array', () => {
      const mockFile = new File(['{"redirects": "not-an-array"}'], 'test.json');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      
      const mockReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: '{"redirects": "not-an-array"}'
      };
      
      vi.spyOn(global, 'FileReader').mockImplementation(function() { return mockReader; } as any);
      
      importRedirects(mockEvent);
      mockReader.onload({} as any);

      expect(util.showMessage).toHaveBeenCalledWith(expect.stringContaining('not an array'));
    });

    it('should filter out non-object items in redirects array', () => {
        const validRule = {
            description: "valid",
            exampleUrl: "http://example.com",
            exampleResult: "http://example.com",
            error: null,
            includePattern: "http://example.com",
            excludePattern: "",
            patternDesc: "",
            redirectUrl: "http://example.com",
            patternType: "W",
            processMatches: "noProcessing",
            disabled: false,
            grouped: false,
            appliesTo: ["main_frame"]
        };

        const jsonContent = JSON.stringify({
            redirects: [
                validRule,
                null,
                "string-item",
                123
            ]
        });

      const mockFile = new File([jsonContent], 'test.json');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
      
      const mockReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: jsonContent
      };
      
      vi.spyOn(global, 'FileReader').mockImplementation(function() { return mockReader; } as any);
      
      importRedirects(mockEvent);
      mockReader.onload({} as any);

      expect(REDIRECTS.length).toBe(1);
      expect(REDIRECTS[0].description).toBe("valid");
      expect(util.showMessage).toHaveBeenCalledWith(expect.stringContaining('Successfully imported 1 redirect'), true);
    });
  });

  describe('Success Scenarios', () => {
      it('should successfully import valid redirects', () => {
        const rules = [
            {
                description: "Test Rule 1",
                exampleUrl: "http://example.com/1",
                exampleResult: "http://success.com/1",
                error: null,
                includePattern: "http://example.com/*",
                excludePattern: "",
                patternDesc: "Test 1",
                redirectUrl: "http://success.com/$1",
                patternType: "W",
                processMatches: "noProcessing",
                disabled: false,
                grouped: false,
                appliesTo: ["main_frame"]
            }
        ];

        const jsonContent = JSON.stringify({ redirects: rules });
        
        const mockFile = new File([jsonContent], 'test.json');
        const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
        
        const mockReader = {
            readAsText: vi.fn(),
            onload: null as any,
            result: jsonContent
        };
        
      vi.spyOn(global, 'FileReader').mockImplementation(function() {
        return mockReader;
      } as any);
        
        importRedirects(mockEvent);
        mockReader.onload({} as any);

        expect(REDIRECTS.length).toBe(1);
        expect(REDIRECTS[0].description).toBe("Test Rule 1");
        expect(rpage.saveChanges).toHaveBeenCalled();
        expect(rpage.renderRedirects).toHaveBeenCalled();
        expect(util.showMessage).toHaveBeenCalledWith(expect.stringContaining('Successfully imported 1 redirect'), true);
      });
  });
});
