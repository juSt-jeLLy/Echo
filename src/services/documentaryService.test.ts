import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ── Mock Groq SDK before importing the service ────────────────
let mockCreate: ReturnType<typeof vi.fn>;

vi.mock("groq-sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          get create() {
            return mockCreate;
          },
        },
      },
    })),
  };
});

// Mock ElevenLabs client (imported transitively by documentaryService)
vi.mock("@/services/elevenLabsService", () => ({
  client: {
    textToSpeech: {
      convert: vi.fn(),
    },
  },
}));

// Import AFTER mocking
import { generateDocumentaryScript } from "./documentaryService";

// ── Helpers ───────────────────────────────────────────────────

/** Build a minimal Groq response object wrapping the given content string. */
function makeGroqResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

/** The original single-strategy parser (unfixed behaviour). */
function originalParse(content: string): string[] {
  return content
    .split(/\s*---\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 4);
}

/** isBugCondition: true when the original parser yields < 2 segments. */
function isBugCondition(content: string): boolean {
  return originalParse(content).length < 2;
}

// ── Shared city / era fixtures ────────────────────────────────
const city = { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 };
const era = { year: "1789", label: "French Revolution" };

// ── Test Suite ────────────────────────────────────────────────

describe("Documentary Segment Parsing", () => {
  beforeEach(() => {
    mockCreate = vi.fn();
    // Provide a dummy API key so getGroqClient() doesn't throw
    vi.stubEnv("VITE_GROQ_API_KEY", "test-key");
  });

  // ── Property 1: Bug Condition Tests ──────────────────────────
  describe("Property 1: Bug Condition — Non-`---` Separator Parsing", () => {
    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     *
     * These inputs satisfy isBugCondition (the original parser would throw).
     * The fixed multi-strategy parser must return ≥ 2 segments without throwing.
     */

    it("should parse triple-newline separated segments (Strategy 2)", async () => {
      const content = "Text A\n\n\nText B\n\n\nText C\n\n\nText D";
      expect(isBugCondition(content)).toBe(true); // confirm bug condition holds

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBe(4); // padded to 4
    });

    it("should parse numbered-heading separated segments (Strategy 3)", async () => {
      const content = "1. Text A\n\n2. Text B\n\n3. Text C\n\n4. Text D";
      expect(isBugCondition(content)).toBe(true);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Labels should be stripped
      result.forEach((seg) => {
        expect(seg).not.toMatch(/^\d+\./);
      });
    });

    it("should parse bold-markdown-label separated segments (Strategy 4)", async () => {
      const content =
        "**World Context**\nText A\n\n**The City**\nText B\n\n**Events**\nText C\n\n**Daily Life**\nText D";
      expect(isBugCondition(content)).toBe(true);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Bold labels should be stripped
      result.forEach((seg) => {
        expect(seg).not.toMatch(/^\*\*/);
      });
    });

    it("should throw when a single continuous block has no parseable separator", async () => {
      const content =
        "All four segments merged into one long paragraph without any separator between them at all.";
      expect(isBugCondition(content)).toBe(true);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      await expect(generateDocumentaryScript(city, era)).rejects.toThrow(
        "Documentary script generation returned fewer than 2 segments. Please retry."
      );
    });

    it("property: any non-`---` separated content with ≥ 2 triple-newline blocks returns ≥ 2 segments", async () => {
      /**
       * **Validates: Requirements 2.1**
       * For any content using triple-newline separators with ≥ 2 non-empty parts,
       * the fixed parser returns ≥ 2 segments without throwing.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 10, maxLength: 100 }).filter((s) => !s.includes("\n\n\n")),
            { minLength: 2, maxLength: 4 }
          ),
          async (parts) => {
            const content = parts.join("\n\n\n");
            if (!isBugCondition(content)) return; // skip if --- happens to appear

            mockCreate.mockResolvedValue(makeGroqResponse(content));
            const result = await generateDocumentaryScript(city, era);
            expect(result.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ── Property 2: Preservation Tests ───────────────────────────
  describe("Property 2: Preservation — Well-Formed `---` Responses Are Unaffected", () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     *
     * For inputs where isBugCondition is false (already splits cleanly on ---),
     * the fixed parser must produce the same result as the original parser.
     */

    it("should parse a well-formed 4-segment `---` response identically", async () => {
      const content = "A\n---\nB\n---\nC\n---\nD";
      expect(isBugCondition(content)).toBe(false);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result).toEqual(["A", "B", "C", "D"]);
    });

    it("should handle whitespace variants around `---` identically", async () => {
      const content = "A\n  ---  \nB\n---\nC\n---\nD";
      expect(isBugCondition(content)).toBe(false);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result).toHaveLength(4);
      expect(result[0]).toBe("A");
      expect(result[1]).toBe("B");
    });

    it("should pad a 2-segment `---` response to 4 by repeating the last segment", async () => {
      const content = "A\n---\nB";
      expect(isBugCondition(content)).toBe(false);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result).toEqual(["A", "B", "B", "B"]);
    });

    it("should pad a 3-segment `---` response to 4 by repeating the last segment", async () => {
      const content = "A\n---\nB\n---\nC";
      expect(isBugCondition(content)).toBe(false);

      mockCreate.mockResolvedValue(makeGroqResponse(content));
      const result = await generateDocumentaryScript(city, era);

      expect(result).toEqual(["A", "B", "C", "C"]);
    });

    it("should throw on an empty response", async () => {
      mockCreate.mockResolvedValue(makeGroqResponse(""));

      await expect(generateDocumentaryScript(city, era)).rejects.toThrow(
        "Documentary script generation returned an empty response."
      );
    });

    it("should throw on a whitespace-only response", async () => {
      mockCreate.mockResolvedValue(makeGroqResponse("   \n  "));

      await expect(generateDocumentaryScript(city, era)).rejects.toThrow(
        "Documentary script generation returned an empty response."
      );
    });

    it("property: well-formed `---` responses produce the same segments as the original parser", async () => {
      /**
       * **Validates: Requirements 3.1, 3.3**
       * For any content that already splits cleanly on ---, the fixed parser
       * returns the same segments as the original single-strategy parser,
       * provided segments don't carry label prefixes (which the fixed parser strips).
       */
      // Segment text that has no label prefix — stripSegmentLabel is a no-op on these
      const cleanSegment = fc
        .string({ minLength: 5, maxLength: 80 })
        .filter(
          (s) =>
            !s.includes("---") &&
            s.trim().length > 0 &&
            // Must not start with a bold heading
            !/^\s*\*\*/.test(s) &&
            // Must not start with a numbered/named prefix like "1.", "0:", "Segment 1:"
            !/^\s*(?:Segment\s+)?\d+[.:]/i.test(s)
        );

      await fc.assert(
        fc.asyncProperty(
          fc.array(cleanSegment, { minLength: 2, maxLength: 4 }),
          async (parts) => {
            const content = parts.join("\n---\n");
            if (isBugCondition(content)) return;

            mockCreate.mockResolvedValue(makeGroqResponse(content));
            const result = await generateDocumentaryScript(city, era);

            const expected = originalParse(content).slice(0, 4);
            expect(result.slice(0, expected.length)).toEqual(expected);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
