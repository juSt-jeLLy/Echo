import Groq from "groq-sdk";
import { City } from "@/data/cities";
import { Era } from "@/data/eras";

export interface SceneLine {
  voiceName: string;
  voiceId: string;
  line: string;
}

export interface SceneResult {
  eventName: string;        // e.g. "The Great Fire of London"
  atmosphere: string;       // e.g. "Smoke fills the air as church bells ring in panic..."
  soundscapePrompt: string; // e.g. "1666 London fire, crackling flames, rain, wind" (ambient only, no voices)
  sceneLines: SceneLine[];  // 5-6 individual character lines with assigned voice IDs
}

const VOICE_ID_MAP: Record<string, string> = {
  Charlie:  "IKne3meq5aSn9XLyUdCD",
  Laura:    "FGY2WhTYpPnrIDTdsKH5",
  Brian:    "nPczCjzI2devNBz1zQrb",
  Jessica:  "cgSgspJ2msm6clMCkdW9",
  Will:     "bIHbv24MWmeRgasZH58o",
  Roger:    "CwhRBWXzGAHq8TQ4Fs17",
  Liam:     "TX3LPaxmHKxFdv7VOQHJ",
  Sarah:    "EXAVITQu4vr4xnSDxMaL",
};

let _client: Groq | null = null;

function getClient(): Groq {
  if (_client) return _client;

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Configuration error: VITE_GROQ_API_KEY is not set. Please add it to your .env file."
    );
  }

  _client = new Groq({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  return _client;
}

export async function generateScene(
  city: City,
  era: Era,
  signal?: AbortSignal
): Promise<SceneResult> {
  const client = getClient();

  // Run both calls in parallel to avoid JSON escaping issues with sceneAudioScript.
  // Call 1 requests only simple string fields via json_object.
  // Call 2 requests the radio-drama script as plain text (no response_format),
  // which sidesteps the model breaking out of JSON quoting when it sees
  // square brackets, exclamation marks, and multilingual content.
  const [structuredResult, scriptResult] = await Promise.all([
    // Call 1: JSON structured data — simple fields only
    client.chat.completions.create(
      {
        model: "llama-3.1-8b-instant",
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a cinematic historian. Respond only with valid JSON. Never use double quotes inside string values — use single quotes for any dialogue or speech.",
          },
          {
            role: "user",
            content: `Find a real historical event in ${city.name}, ${city.country} around ${era.year}.

Return JSON with exactly these 3 fields:
{
  "eventName": "short event name, 3-8 words, no parentheses or notes",
  "atmosphere": "ONE sentence max 15 words placing the user in the scene. Format: You are [specific location in the city] during [the event]. Example: You are on the cobblestone streets of Mexico City during the Ayutla Rebellion.",
  "soundscapePrompt": "60-80 word hyper-specific street-level ambient sound design brief. Describe sounds as if walking through the scene: the surface underfoot (cobblestone/dirt/stone), crowd density (sparse/dense), specific vendor types and their sounds, weather (rain/sun/wind intensity), near sounds vs distant sounds, era-specific machinery or transport. NO voices or speech. Example: 1850 Mexico City cobblestone street, dense crowd footsteps on stone, horse-drawn cart wheels rattling nearby, market bell ringing in distance, light wind through adobe buildings, cannon fire rumbling far away, wooden cart creaking, pigeons scattering, church bell tolling"
}`,
          },
        ],
      },
      { signal }
    ),

    // Call 2: Plain text VOICE lines — no json_object to avoid escaping failures
    client.chat.completions.create(
      {
        model: "llama-3.1-8b-instant",
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "You are an immersive sound designer writing multi-voice scene lines. Output plain text only, no JSON, no markdown.",
          },
          {
            role: "user",
            content: `Write 15-18 voice lines for a scene in ${city.name}, ${city.country} around ${era.year} during a real historical event.

Each line must be in this EXACT format (one per line):
VOICE:VoiceName|the spoken line

Rules:
- Each line is ONE shout, call, reaction, or short exchange (5-20 words)
- Use local language of ${city.country} for most lines — phonetic shouts
- Choose voice names ONLY from: Charlie, Laura, Brian, Jessica, Will, Roger, Liam, Sarah
- Match voice to character: Brian=officer/authority, Charlie/Liam=young rebel/soldier, Laura/Jessica/Sarah=women in crowd, Will/Roger=merchant/bystander
- NO narration, NO descriptions — only what the character SHOUTS or SAYS
- Output ONLY the VOICE: lines, nothing else, no blank lines

Example:
VOICE:Brian|Move along! Clear the streets immediately!
VOICE:Charlie|Viva la Republica! Viva Mexico libre!
VOICE:Laura|Soldados vienen! Corre! Corre ahora!
VOICE:Jessica|Ayuda! Por favor ayuda a mis hijos!
VOICE:Will|El pueblo unido jamas sera vencido!
VOICE:Roger|Cierra la tienda! Cierra todo ahora!`,
          },
        ],
      },
      { signal }
    ),
  ]);

  // Parse structured JSON from Call 1
  const structuredContent = structuredResult.choices[0]?.message?.content;
  if (!structuredContent) {
    throw new Error("Groq API returned an empty structured response.");
  }

  let parsed: { eventName?: string; atmosphere?: string; soundscapePrompt?: string };
  try {
    parsed = JSON.parse(structuredContent);
  } catch {
    throw new Error("Groq API returned invalid JSON: " + structuredContent.slice(0, 100));
  }

  if (!parsed.eventName || !parsed.atmosphere || !parsed.soundscapePrompt) {
    throw new Error(
      "Groq API response missing required fields (eventName, atmosphere, or soundscapePrompt)."
    );
  }

  // Get plain text VOICE lines from Call 2 — parse into SceneLine[]
  const sceneLines: SceneLine[] = (scriptResult.choices[0]?.message?.content ?? "")
    .split("\n")
    .filter(l => l.startsWith("VOICE:"))
    .map(l => {
      const [meta, ...rest] = l.replace("VOICE:", "").split("|");
      const voiceName = meta.trim();
      const line = rest.join("|").trim();
      const voiceId = VOICE_ID_MAP[voiceName] ?? VOICE_ID_MAP.Charlie;
      return { voiceName, voiceId, line };
    })
    .filter(l => l.line.length > 0);

  // Strip parenthetical self-correction notes and truncate to 60 chars
  const cleanEventName = parsed.eventName
    .replace(/\s*\(.*?\)/g, "")
    .trim()
    .slice(0, 60);

  return {
    eventName: cleanEventName,
    atmosphere: parsed.atmosphere,
    soundscapePrompt: parsed.soundscapePrompt,
    sceneLines,
  };
}
