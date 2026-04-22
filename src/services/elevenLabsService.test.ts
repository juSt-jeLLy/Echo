import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// Create mock functions that will be shared
let mockConvert: any;
let mockTextToSpeechConvert: any;

// Mock the ElevenLabs client BEFORE importing the service
vi.mock("@elevenlabs/elevenlabs-js", () => {
  return {
    ElevenLabsClient: vi.fn().mockImplementation(() => ({
      textToSoundEffects: {
        get convert() {
          return mockConvert;
        },
      },
      textToSpeech: {
        get convert() {
          return mockTextToSpeechConvert;
        },
      },
    })),
  };
});

// Import AFTER mocking
import { generateAmbientSoundscape, synthesiseIntro, synthesiseSceneLines } from "./elevenLabsService";

describe("Bug Condition Exploration Tests - ElevenLabs API Error Handling", () => {
  beforeEach(() => {
    // Initialize mock functions before each test
    mockConvert = vi.fn();
    mockTextToSpeechConvert = vi.fn();

    // Mock URL.createObjectURL for jsdom environment
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Clean up any object URLs created during tests
    vi.clearAllMocks();
  });

  describe("Property 1: Bug Condition - API Failures on Long Text and Rate Limiting", () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.3**
     * 
     * This test MUST FAIL on unfixed code to confirm the bug exists.
     * 
     * Expected behavior (what the test checks for):
     * - Text > 450 chars should be truncated to 450 chars before API call
     * - 429 errors should trigger retry with exponential backoff
     * 
     * Current behavior (unfixed code):
     * - Text > 450 chars is sent as-is, causing 400 validation error
     * - 429 errors fail immediately without retry
     * 
     * EXPECTED OUTCOME: This test FAILS on unfixed code
     */

    it("should truncate text > 450 characters before calling sound generation API", async () => {
      // Generate a long text string (> 450 characters)
      const longText = "A".repeat(500);

      // Mock API to succeed (simulating what should happen after truncation)
      const mockAudioChunks = [new Uint8Array([1, 2, 3])];
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      // Call the function with long text
      const result = await generateAmbientSoundscape(longText);

      // EXPECTED BEHAVIOR: Text should be truncated to 450 chars before API call
      // The API should be called with truncated text, not the full 500 chars
      expect(mockConvert).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/^.{1,450}$/), // Text should be <= 450 chars
        })
      );

      // Result should be successful (not null)
      expect(result).not.toBeNull();
      expect(result).toMatch(/^blob:/);
    });

    it("should retry API calls that receive 429 rate limiting errors with exponential backoff", async () => {
      const testText = "Test soundscape description";
      let callCount = 0;

      // Mock API to return 429 on first call, then succeed on second call
      mockConvert.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: throw 429 error
          const error: any = new Error("Rate limit exceeded");
          error.statusCode = 429;
          throw error;
        } else {
          // Second call: succeed
          const mockAudioChunks = [new Uint8Array([1, 2, 3])];
          return {
            [Symbol.asyncIterator]: async function* () {
              for (const chunk of mockAudioChunks) {
                yield chunk;
              }
            },
          };
        }
      });

      // Call the function
      const startTime = Date.now();
      const result = await generateAmbientSoundscape(testText);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // EXPECTED BEHAVIOR: Should retry after 429 error with exponential backoff
      // - Should make at least 2 API calls (first fails with 429, second succeeds)
      // - Should wait ~1 second between first and second attempt (exponential backoff)
      // - Should ultimately succeed and return a valid blob URL
      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(duration).toBeGreaterThanOrEqual(900); // At least ~1 second delay
      expect(result).not.toBeNull();
      expect(result).toMatch(/^blob:/);
    });

    it("should handle 400 validation error gracefully after truncation", async () => {
      // After fix: text is truncated, but if API still returns 400, handle gracefully
      const longText = "A".repeat(500);

      // Mock API to return 400 validation error even after truncation
      mockConvert.mockImplementation(() => {
        const error: any = new Error("Validation error: text too long");
        error.statusCode = 400;
        throw error;
      });

      // Call the function with long text
      const result = await generateAmbientSoundscape(longText);

      // FIXED BEHAVIOR: Text is truncated before API call
      expect(mockConvert).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/^.{1,450}$/), // Text should be <= 450 chars
        })
      );

      // FIXED BEHAVIOR: Function returns null on 400 error (no retry for 400)
      expect(result).toBeNull();
      expect(mockConvert).toHaveBeenCalledTimes(1); // Only called once, no retry for 400
    });

    it("should exhaust retries and return null after max 429 errors", async () => {
      // After fix: retries up to 3 times, then returns null
      const testText = "Test soundscape description";

      // Mock API to always return 429 error
      mockConvert.mockImplementation(() => {
        const error: any = new Error("Rate limit exceeded");
        error.statusCode = 429;
        throw error;
      });

      // Call the function
      const result = await generateAmbientSoundscape(testText);

      // FIXED BEHAVIOR: Function retries 3 times (4 total attempts)
      expect(mockConvert).toHaveBeenCalledTimes(4); // Initial + 3 retries
      
      // FIXED BEHAVIOR: Function returns null after exhausting retries
      expect(result).toBeNull();
    }, 10000); // Increase timeout for retry delays

    it("property: text > 450 chars should be truncated and succeed", async () => {
      /**
       * Property-based test: For ANY text length > 450 characters,
       * the function should truncate to 450 chars and succeed.
       * 
       * This test will FAIL on unfixed code because:
       * - Unfixed code sends full text, gets 400 error, returns null
       * - Fixed code truncates text, succeeds, returns blob URL
       */
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 451, maxLength: 1000 }),
          async (longText) => {
            // Mock API to succeed
            const mockAudioChunks = [new Uint8Array([1, 2, 3])];
            mockConvert.mockReturnValue({
              [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                  yield chunk;
                }
              },
            });

            const result = await generateAmbientSoundscape(longText);

            // EXPECTED: Should truncate and succeed
            expect(result).not.toBeNull();
            expect(mockConvert).toHaveBeenCalledWith(
              expect.objectContaining({
                text: expect.stringMatching(/^.{1,450}$/),
              })
            );
          }
        ),
        { numRuns: 10 } // Run 10 test cases with different text lengths
      );
    });

    it("property: 429 errors should trigger retry and eventually succeed or fail after max retries", async () => {
      /**
       * Property-based test: For ANY number of consecutive 429 errors (1-5),
       * the function should retry with exponential backoff.
       * 
       * This test will PASS on fixed code because:
       * - Fixed code retries up to 3 times with exponential backoff
       */
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (numFailures) => {
            const testText = "Test soundscape";
            let callCount = 0;

            mockConvert.mockImplementation(() => {
              callCount++;
              if (callCount <= numFailures) {
                // Fail with 429
                const error: any = new Error("Rate limit exceeded");
                error.statusCode = 429;
                throw error;
              } else {
                // Succeed
                const mockAudioChunks = [new Uint8Array([1, 2, 3])];
                return {
                  [Symbol.asyncIterator]: async function* () {
                    for (const chunk of mockAudioChunks) {
                      yield chunk;
                    }
                  },
                };
              }
            });

            const result = await generateAmbientSoundscape(testText);

            // EXPECTED: Should retry up to 3 times (4 total attempts)
            if (numFailures <= 3) {
              // Should succeed after retries
              expect(callCount).toBe(numFailures + 1);
              expect(result).not.toBeNull();
            } else {
              // Should fail after 3 retries (max 4 total attempts)
              expect(callCount).toBe(4); // Initial + 3 retries
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 5 } // Run 5 test cases with different failure counts
      );
    }, 30000); // Increase timeout for multiple retry delays
  });

  describe("Property 2: Preservation - Valid Input Behavior Unchanged", () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     * 
     * These tests MUST PASS on unfixed code to establish baseline behavior.
     * They capture the CURRENT behavior for non-buggy inputs that must be preserved.
     * 
     * After the fix is implemented, these tests should STILL PASS (no regressions).
     */

    it("should send soundscape prompts ≤ 450 characters without modification", async () => {
      // Test with text exactly at and below the 450 character limit
      const validTexts = [
        "Short soundscape description",
        "A".repeat(450), // Exactly 450 characters
        "A".repeat(200), // Well below limit
      ];

      for (const text of validTexts) {
        // Mock API to succeed
        const mockAudioChunks = [new Uint8Array([1, 2, 3])];
        mockConvert.mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const chunk of mockAudioChunks) {
              yield chunk;
            }
          },
        });

        const result = await generateAmbientSoundscape(text);

        // PRESERVATION: Text should be sent to API without modification
        expect(mockConvert).toHaveBeenCalledWith(
          expect.objectContaining({
            text: text, // Exact text, no truncation
          })
        );

        // PRESERVATION: Should succeed and return blob URL
        expect(result).not.toBeNull();
        expect(result).toMatch(/^blob:/);

        vi.clearAllMocks();
      }
    });

    it("should process successful API calls immediately without delays", async () => {
      // Test that successful API calls complete quickly without retry delays
      const testText = "Test soundscape description";

      // Mock API to succeed immediately
      const mockAudioChunks = [new Uint8Array([1, 2, 3])];
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      const startTime = Date.now();
      const result = await generateAmbientSoundscape(testText);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // PRESERVATION: Should complete quickly (< 100ms) without retry delays
      expect(duration).toBeLessThan(100);
      expect(result).not.toBeNull();
      expect(result).toMatch(/^blob:/);
      expect(mockConvert).toHaveBeenCalledTimes(1); // Only called once
    });

    it("should cancel requests and return null when abort signal is triggered", async () => {
      // Test that abort signals work correctly
      const testText = "Test soundscape description";
      const abortController = new AbortController();

      // Mock API to succeed
      const mockAudioChunks = [new Uint8Array([1, 2, 3])];
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      // Abort immediately
      abortController.abort();

      const result = await generateAmbientSoundscape(testText, abortController.signal);

      // PRESERVATION: Should return null when aborted
      expect(result).toBeNull();
    });

    it("should handle abort signals during API streaming", async () => {
      // Test that abort signals work during chunk streaming
      const testText = "Test soundscape description";
      const abortController = new AbortController();

      // Mock API to stream chunks, abort during streaming
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield new Uint8Array([1, 2, 3]);
          abortController.abort(); // Abort during streaming
          yield new Uint8Array([4, 5, 6]);
        },
      });

      const result = await generateAmbientSoundscape(testText, abortController.signal);

      // PRESERVATION: Should return null when aborted during streaming
      expect(result).toBeNull();
    });

    it("should create and return valid blob URLs for successful API calls", async () => {
      // Test that blob URL creation works correctly
      const testText = "Test soundscape description";

      // Mock API to succeed
      const mockAudioChunks = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
      ];
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      const result = await generateAmbientSoundscape(testText);

      // PRESERVATION: Should create valid blob URL
      expect(result).not.toBeNull();
      expect(result).toMatch(/^blob:/);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
    });

    it("should handle non-429 errors by returning null immediately", async () => {
      // Test that other errors (network, auth, etc.) are handled correctly
      const testText = "Test soundscape description";

      // Mock API to throw a network error (not 429)
      mockConvert.mockImplementation(() => {
        const error: any = new Error("Network error");
        error.statusCode = 500;
        throw error;
      });

      const result = await generateAmbientSoundscape(testText);

      // PRESERVATION: Should return null on non-429 errors
      expect(result).toBeNull();
      expect(mockConvert).toHaveBeenCalledTimes(1); // Only called once, no retry
    });

    it("property: soundscape prompts ≤ 450 chars should be sent without modification", async () => {
      /**
       * Property-based test: For ANY text length ≤ 450 characters,
       * the function should send it to the API without modification.
       * 
       * This test should PASS on unfixed code (baseline behavior).
       */
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 450 }),
          async (text) => {
            // Mock API to succeed
            const mockAudioChunks = [new Uint8Array([1, 2, 3])];
            mockConvert.mockReturnValue({
              [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                  yield chunk;
                }
              },
            });

            const result = await generateAmbientSoundscape(text);

            // PRESERVATION: Text should be sent without modification
            expect(mockConvert).toHaveBeenCalledWith(
              expect.objectContaining({
                text: text, // Exact text, no truncation
              })
            );

            // PRESERVATION: Should succeed
            expect(result).not.toBeNull();

            vi.clearAllMocks();
          }
        ),
        { numRuns: 20 } // Run 20 test cases with different text lengths
      );
    });

    it("property: successful API calls should complete immediately without retry delays", async () => {
      /**
       * Property-based test: For ANY successful API call,
       * the function should complete quickly without retry delays.
       * 
       * This test should PASS on unfixed code (baseline behavior).
       */
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 450 }),
          async (text) => {
            // Mock API to succeed
            const mockAudioChunks = [new Uint8Array([1, 2, 3])];
            mockConvert.mockReturnValue({
              [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                  yield chunk;
                }
              },
            });

            const startTime = Date.now();
            const result = await generateAmbientSoundscape(text);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // PRESERVATION: Should complete quickly without retry delays
            expect(duration).toBeLessThan(100);
            expect(result).not.toBeNull();
            expect(mockConvert).toHaveBeenCalledTimes(1);

            vi.clearAllMocks();
          }
        ),
        { numRuns: 10 } // Run 10 test cases
      );
    });

    it("should synthesize intro audio without modification for valid inputs", async () => {
      // Test that synthesiseIntro works correctly for valid inputs
      const city = { name: "Paris", lat: 48.8566, lng: 2.3522 };
      const eventName = "The French Revolution";
      const atmosphere = "The streets are filled with tension and excitement.";

      // Mock API to succeed
      const mockAudioChunks = [new Uint8Array([1, 2, 3])];
      mockTextToSpeechConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      const result = await synthesiseIntro(city, eventName, atmosphere);

      // PRESERVATION: Should succeed and return blob URL
      expect(result).not.toBeNull();
      expect(result).toMatch(/^blob:/);
      expect(mockTextToSpeechConvert).toHaveBeenCalledTimes(1);
    });

    it("should synthesize scene lines in parallel for valid inputs", async () => {
      // Test that synthesiseSceneLines works correctly for valid inputs
      const lines = [
        { type: "voice" as const, line: "Hello world", voiceId: "voice1" },
        { type: "sfx" as const, line: "Thunder sound" },
        { type: "voice" as const, line: "Goodbye", voiceId: "voice2" },
      ];

      // Mock API to succeed for all calls
      const mockAudioChunks = [new Uint8Array([1, 2, 3])];
      mockTextToSpeechConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });
      mockConvert.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockAudioChunks) {
            yield chunk;
          }
        },
      });

      const result = await synthesiseSceneLines(lines);

      // PRESERVATION: Should return array of blob URLs (one per line)
      expect(result).toHaveLength(3);
      expect(result.every((url) => url.match(/^blob:/))).toBe(true);
    });
  });
});
