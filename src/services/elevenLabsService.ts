import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { SceneLine } from "@/services/groqService";

// ── Shared client ─────────────────────────────────────────────

const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
if (!apiKey) {
  throw new Error(
    "Configuration error: VITE_ELEVENLABS_API_KEY is not set. Please add it to your .env file."
  );
}

export const client = new ElevenLabsClient({ apiKey });

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

    const response = await client.textToSoundEffects.convert({
      text: descriptor,
      duration_seconds: 10,
    });

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
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return null;
    }
    console.warn("[elevenLabsService] Soundscape generation failed:", err);
    return null;
  }
}

// ── TTS: Multi-Voice Scene Audio ─────────────────────────────
// Synthesises each SceneLine with its assigned voice in parallel,
// then concatenates all chunks in order into a single audio blob.
// Returns an object URL, or null on failure (non-fatal — falls back to SFX only).

let previousSceneAudioUrl: string | null = null;

export async function synthesiseSceneLines(
  lines: SceneLine[],
  signal?: AbortSignal
): Promise<string | null> {
  try {
    if (!lines.length || signal?.aborted) return null;

    // Generate each line in parallel with its assigned voice
    const results = await Promise.all(
      lines.map(async ({ voiceId, line }) => {
        try {
          if (signal?.aborted) return null;
          const response = await client.textToSpeech.convert(voiceId, {
            text: line,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.35,
              similarity_boost: 0.8,
              style: 0.7,
              use_speaker_boost: true,
            },
            output_format: "mp3_44100_128",
          });
          const chunks: Uint8Array[] = [];
          for await (const chunk of response) {
            if (signal?.aborted) return null;
            chunks.push(chunk);
          }
          return chunks;
        } catch {
          return null;
        }
      })
    );

    // Concatenate all chunks in order into one blob
    const allChunks: Uint8Array[] = [];
    for (const result of results) {
      if (result) allChunks.push(...result);
    }

    if (!allChunks.length) return null;

    const blob = new Blob(allChunks, { type: "audio/mpeg" });

    if (previousSceneAudioUrl) URL.revokeObjectURL(previousSceneAudioUrl);
    const url = URL.createObjectURL(blob);
    previousSceneAudioUrl = url;
    return url;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.warn("[elevenLabsService] Multi-voice synthesis failed:", err);
    return null;
  }
}
