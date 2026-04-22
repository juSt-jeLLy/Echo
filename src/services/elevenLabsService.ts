import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { SceneLine } from "@/services/groqService";
import { City } from "@/data/cities";

// ── Shared client ─────────────────────────────────────────────

const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
if (!apiKey) {
  throw new Error(
    "Configuration error: VITE_ELEVENLABS_API_KEY is not set. Please add it to your .env file."
  );
}

export const client = new ElevenLabsClient({ apiKey });

// ── Helper Functions ──────────────────────────────────────────

/**
 * Truncates text to a maximum length, preferring word boundaries.
 * Logs a warning when truncation occurs.
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 450 characters)
 * @returns Truncated text that is ≤ maxLength characters
 */
function truncateForSoundGeneration(text: string, maxLength: number = 450): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  const result = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;
  
  console.warn(
    `[elevenLabsService] Text truncated from ${text.length} to ${result.length} characters to meet API limit`
  );
  
  return result;
}

/**
 * Retries a function with exponential backoff on 429 rate limiting errors.
 * Implements delays of 1s, 2s, 4s between retry attempts.
 * 
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param signal - Optional abort signal to cancel retries
 * @returns The result of the function call
 * @throws The last error if all retries are exhausted or non-429 errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  signal?: AbortSignal
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check abort signal before each attempt
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      // Check if this is a 429 rate limiting error
      const is429Error = err?.statusCode === 429 || err?.status === 429;
      
      // If not a 429 error, throw immediately (don't retry)
      if (!is429Error) {
        throw err;
      }
      
      // If we've exhausted retries, throw the error
      if (attempt >= maxRetries) {
        console.warn(
          `[elevenLabsService] Rate limit retry exhausted after ${maxRetries} attempts`
        );
        throw err;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      
      console.warn(
        `[elevenLabsService] Rate limit hit (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Check abort signal after delay
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    }
  }
  
  throw lastError;
}

// ── TTS: Intro Clip ───────────────────────────────────────────
// Generates a short TTS intro clip using the George voice.
// Returns an object URL for use in an HTMLAudioElement, or null on failure.

let previousIntroUrl: string | null = null;

export async function synthesiseIntro(
  city: City,
  eventName: string,
  atmosphere: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    if (signal?.aborted) return null;

    const text = `Welcome to ${city.name}. You are now in ${eventName}. ${atmosphere}`;

    // Wrap API call in retry logic to handle 429 errors
    const response = await retryWithBackoff(
      async () => {
        return await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
          output_format: "mp3_44100_128",
        });
      },
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

    // Revoke previous URL to prevent memory leaks
    if (previousIntroUrl) {
      URL.revokeObjectURL(previousIntroUrl);
    }

    const url = URL.createObjectURL(blob);
    previousIntroUrl = url;
    return url;
  } catch (err: any) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return null;
    }
    
    // Improved error messages
    if (err?.statusCode === 429 || err?.status === 429) {
      console.warn("[elevenLabsService] Intro synthesis failed: Rate limit exceeded after retries");
    } else if (err?.statusCode === 400 || err?.status === 400) {
      console.warn("[elevenLabsService] Intro synthesis failed: Invalid request (400)", err);
    } else {
      console.warn("[elevenLabsService] Intro synthesis failed:", err);
    }
    return null;
  }
}

// ── SFX: Ambient Soundscape ───────────────────────────────────
// Generates a loopable ambient soundscape from a text description.
// Returns an object URL for use in an HTMLAudioElement, or null on failure.

let previousAmbientUrl: string | null = null;

export async function generateAmbientSoundscape(
  descriptor: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    if (signal?.aborted) return null;

    // Truncate text to 450 characters before API call
    const truncatedDescriptor = truncateForSoundGeneration(descriptor, 450);

    // Wrap API call in retry logic to handle 429 errors
    const response = await retryWithBackoff(
      async () => {
        return await client.textToSoundEffects.convert({
          text: truncatedDescriptor,
          duration_seconds: 10,
        });
      },
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

    // Revoke previous URL to prevent memory leaks
    if (previousAmbientUrl) {
      URL.revokeObjectURL(previousAmbientUrl);
    }

    const url = URL.createObjectURL(blob);
    previousAmbientUrl = url;
    return url;
  } catch (err: any) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return null;
    }
    
    // Improved error messages
    if (err?.statusCode === 429 || err?.status === 429) {
      console.warn("[elevenLabsService] Soundscape generation failed: Rate limit exceeded after retries");
    } else if (err?.statusCode === 400 || err?.status === 400) {
      console.warn("[elevenLabsService] Soundscape generation failed: Invalid request (400)", err);
    } else {
      console.warn("[elevenLabsService] Soundscape generation failed:", err);
    }
    return null;
  }
}

// ── TTS: Multi-Voice Scene Audio ─────────────────────────────
// Synthesises each SceneLine with its assigned voice (or SFX) in parallel,
// returning an ordered array of object URLs — one per segment.
// Returns an empty array on failure (non-fatal — falls back to SFX only).

let previousSceneAudioUrl: string | null = null;

export async function synthesiseSceneLines(
  lines: SceneLine[],
  signal?: AbortSignal
): Promise<string[]> {
  if (!lines.length || signal?.aborted) return [];

  // Generate all segments in parallel (both TTS and SFX)
  const results = await Promise.all(
    lines.map(async (line) => {
      try {
        if (signal?.aborted) return null;

        if (line.type === "sfx") {
          // SFX segment with retry logic
          const response = await retryWithBackoff(
            async () => {
              return await client.textToSoundEffects.convert({
                text: line.line,
                duration_seconds: 2,
              });
            },
            3,
            signal
          );
          
          const chunks: Uint8Array[] = [];
          for await (const chunk of response) {
            if (signal?.aborted) return null;
            chunks.push(chunk);
          }
          const blob = new Blob(chunks, { type: "audio/mpeg" });
          return URL.createObjectURL(blob);
        } else {
          // Voice segment with retry logic
          const response = await retryWithBackoff(
            async () => {
              return await client.textToSpeech.convert(line.voiceId!, {
                text: line.line,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: 0.35,
                  similarity_boost: 0.8,
                  style: 0.7,
                  use_speaker_boost: true,
                },
                output_format: "mp3_44100_128",
              });
            },
            3,
            signal
          );
          
          const chunks: Uint8Array[] = [];
          for await (const chunk of response) {
            if (signal?.aborted) return null;
            chunks.push(chunk);
          }
          const blob = new Blob(chunks, { type: "audio/mpeg" });
          return URL.createObjectURL(blob);
        }
      } catch (err: any) {
        // Improved error messages
        if (err?.statusCode === 429 || err?.status === 429) {
          console.warn(`[elevenLabsService] Scene line synthesis failed: Rate limit exceeded after retries (${line.type})`);
        } else if (err?.statusCode === 400 || err?.status === 400) {
          console.warn(`[elevenLabsService] Scene line synthesis failed: Invalid request (400) (${line.type})`, err);
        } else if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.warn(`[elevenLabsService] Scene line synthesis failed (${line.type}):`, err);
        }
        return null;
      }
    })
  );

  // Track URLs for cleanup
  const urls = results.filter((u): u is string => u !== null);

  // Revoke previous scene URL to prevent memory leaks
  if (previousSceneAudioUrl) {
    URL.revokeObjectURL(previousSceneAudioUrl);
    previousSceneAudioUrl = null;
  }

  return urls;
}
