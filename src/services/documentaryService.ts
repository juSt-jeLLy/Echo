import Groq from "groq-sdk";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";
import { client } from "@/services/elevenLabsService";

// ── Groq client (reuse pattern from groqService) ──────────────

let _groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (_groqClient) return _groqClient;
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Configuration error: VITE_GROQ_API_KEY is not set. Please add it to your .env file."
    );
  }
  _groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  return _groqClient;
}

// ── Retry helper (mirrors elevenLabsService pattern) ─────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  signal?: AbortSignal
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { statusCode?: number; status?: number })?.status;
      if (status !== 429) throw err;
      if (attempt >= maxRetries) throw err;
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(
        `[documentaryService] Rate limit hit (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    }
  }
  throw lastError;
}

// ── Script Generation ─────────────────────────────────────────

/**
 * Calls Groq to generate a 4-segment documentary script about the given city and era.
 * Returns an array of exactly 4 non-empty segment strings.
 */
export async function generateDocumentaryScript(
  city: City,
  era: Era,
  signal?: AbortSignal
): Promise<string[]> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const groq = getGroqClient();

  const result = await retryWithBackoff(
    () =>
      groq.chat.completions.create(
        {
          model: "llama-3.1-8b-instant",
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content:
                "You are a documentary narrator. Write in a clear, engaging documentary style. Output only the 4 segments separated by '---', nothing else.",
            },
            {
              role: "user",
              content: `Generate a documentary script about ${city.name}, ${city.country} in ${era.year}.
Return exactly 4 segments as plain text separated by "---":
- Segment 1: World context — what was happening globally around ${era.year}
- Segment 2: The city — what life was like in ${city.name} specifically
- Segment 3: Key events or developments in ${city.name} or ${city.country} around this time
- Segment 4: Daily life, culture, and the sounds of ${city.name} in this era
Each segment must be 100-180 words, written in documentary narration style. Do not include segment labels or headings.`,
            },
          ],
        },
        { signal }
      ),
    3,
    signal
  );

  const content = result.choices[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("Documentary script generation returned an empty response.");
  }

  const segments = content
    .split(/\s*---\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 4);

  if (segments.length < 2) {
    throw new Error(
      "Documentary script generation returned fewer than 2 segments. Please retry."
    );
  }

  // Pad to 4 if Groq returned fewer (shouldn't happen, but defensive)
  while (segments.length < 4) {
    segments.push(segments[segments.length - 1]);
  }

  return segments;
}

// ── Audio Synthesis ───────────────────────────────────────────

/**
 * Synthesises each documentary segment as a separate TTS call in parallel.
 * Returns an ordered array of object URLs — one per segment.
 */
export async function synthesiseDocumentaryAudio(
  segments: string[],
  voiceId: string,
  signal?: AbortSignal
): Promise<string[]> {
  if (!segments.length || signal?.aborted) return [];

  const results = await Promise.all(
    segments.map(async (segment, i) => {
      try {
        if (signal?.aborted) return null;

        const response = await retryWithBackoff(
          () =>
            client.textToSpeech.convert(voiceId, {
              text: segment,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.65,
                similarity_boost: 0.8,
                style: 0.1,
                use_speaker_boost: true,
              },
              output_format: "mp3_44100_128",
            }),
          3,
          signal
        );

        if (signal?.aborted) return null;

        const chunks: Uint8Array[] = [];
        for await (const chunk of response) {
          if (signal?.aborted) return null;
          chunks.push(chunk);
        }

        const blob = new Blob(chunks, { type: "audio/mpeg" });
        return URL.createObjectURL(blob);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return null;
        const status =
          (err as { statusCode?: number; status?: number })?.statusCode ??
          (err as { statusCode?: number; status?: number })?.status;
        if (status === 429) {
          console.warn(`[documentaryService] Segment ${i} TTS failed: rate limit exceeded`);
        } else {
          console.warn(`[documentaryService] Segment ${i} TTS failed:`, err);
        }
        return null;
      }
    })
  );

  const urls = results.filter((u): u is string => u !== null);

  if (urls.length === 0) {
    throw new Error("All documentary audio segments failed to synthesise. Please retry.");
  }

  return urls;
}
