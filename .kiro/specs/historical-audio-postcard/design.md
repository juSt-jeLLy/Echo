# Design Document

## Overview

The Historical Audio Postcard feature adds a dual-audio generation pipeline to City Whispers. When a user selects a city and era, the system calls Groq to generate a scene script, then fans out to two ElevenLabs APIs in parallel: TTS for narration and Sound Effects for an ambient soundscape. Both audio streams are managed by a single `useAudioPostcard` hook and played simultaneously inside the existing `CityPanel`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CityPanel (UI)                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  useAudioPostcard(city, era)                             │   │
│  │  → { isLoading, isPlaying, error, toggle, retry }        │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ orchestrates
          ┌───────────────▼────────────────┐
          │   AudioPostcardService         │
          │   src/services/               │
          └──┬──────────────┬─────────────┘
             │              │
    ┌────────▼──────┐  ┌────▼──────────────────────────────────┐
    │ groqService   │  │ elevenLabsService                      │
    │ .ts           │  │ .ts                                    │
    │               │  │  ┌─────────────────┐                  │
    │ ScriptGen     │  │  │  VoiceSelector   │ get_voice        │
    │ + Descriptor  │  │  │  (region map)    │ verify           │
    │ Extraction    │  │  └────────┬────────┘                  │
    └───────────────┘  │           │ voiceId                   │
                       │  ┌────────▼────────┐                  │
                       │  │ AudioSynthesiser │ TTS API          │
                       │  │ eleven_multi_v2  │ mp3_44100_128    │
                       │  └────────┬────────┘                  │
                       │           │ narratorUrl               │
                       │  ┌────────▼────────┐                  │
                       │  │ SoundEffect     │ SFX API          │
                       │  │ Generator       │ 3-5s, loop       │
                       │  └────────┬────────┘                  │
                       │           │ ambientUrl (nullable)     │
                       └───────────┼───────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  useAudioPostcard hook       │
                    │  narratorAudio (HTMLAudio)   │
                    │  ambientAudio  (HTMLAudio)   │
                    │  vol: 1.0      vol: 0.35     │
                    └─────────────────────────────┘
```

---

## Data Flow

```
User selects city + era
        │
        ▼
useAudioPostcard detects change → cancels in-flight AbortController
        │
        ▼
groqService.generateScript(city, era)
  → Groq API (llama3-8b-8192, max_tokens=300)
  → returns { script: string, ambientDescriptor: string }
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
elevenLabsService                        elevenLabsService
  .synthesiseNarration(script, voiceId)    .generateAmbient(descriptor)
  → list_models (cached, once)             → SFX API (3-5s, loop=true)
  → get_voice (verify)                     → Blob → objectURL | null
  → TTS API (eleven_multilingual_v2)
  → Blob → objectURL
        │                                          │
        └──────────────┬───────────────────────────┘
                       ▼
        { narratorUrl, ambientUrl } stored in hook state
                       │
                       ▼
        narratorAudio.src = narratorUrl  (volume 1.0)
        ambientAudio.src  = ambientUrl   (volume 0.35, loop=true)
                       │
                       ▼
        Both .play() called simultaneously → isPlaying = true
                       │
                       ▼
        narratorAudio 'ended' event → pause both, reset positions
```

---

## New Files

### `src/services/groqService.ts`

Responsible for all Groq API interaction.

```typescript
import Groq from "groq-sdk";

export interface ScriptResult {
  script: string;
  ambientDescriptor: string;
}

// Instantiated lazily; throws config error if key missing
function getClient(): Groq { ... }

export async function generateScript(
  city: City,
  era: Era,
  signal?: AbortSignal
): Promise<ScriptResult>
```

**Prompt structure:**
- System: "You are a cinematic historian and sound designer."
- User: Instructs the model to write a 150–200 word second-person scene set in `{city.name}, {city.country}` in `{era.year}`, anchored to a real historical event, with local-language phrases woven in naturally. The model must also output 3–5 ambient sound descriptors as a JSON field `ambientDescriptor` alongside the `script` field. Response format is JSON: `{ "script": "...", "ambientDescriptor": "..." }`.

**Ambient descriptor extraction:** The model is instructed to produce the descriptor directly. No post-processing regex needed — the response is parsed as JSON.

---

### `src/services/elevenLabsService.ts`

Single file housing the shared ElevenLabs client and all three sub-modules.

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Shared client — created once, exported
export const elevenLabsClient = new ElevenLabsClient({
  apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
});

// ── Region → Voice mapping ────────────────────────────────────
const VOICE_MAP: Record<Region, VoiceConfig> = {
  europe:          { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  asia:            { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  americas:        { id: "nPczCjzI2devNBz1zQrb", name: "Brian"  },
  africa_mideast:  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  default:         { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
};

// Country → Region lookup table (static, covers all cities in cities.ts)
const COUNTRY_REGION: Record<string, Region> = { ... };

// ── VoiceSelector ─────────────────────────────────────────────
export async function resolveVoice(city: City): Promise<string>
// Returns verified voice id; falls back to George if get_voice fails

// ── Model availability cache ──────────────────────────────────
let modelsVerified = false;
export async function ensureMultilingualModel(): Promise<void>
// Calls list_models once, caches result; throws if eleven_multilingual_v2 absent

// ── AudioSynthesiser ──────────────────────────────────────────
export interface NarrationVoiceSettings {
  stability: 0.6;
  similarity_boost: 0.8;
  style: 0.3;
  use_speaker_boost: true;
}

export async function synthesiseNarration(
  script: string,
  voiceId: string,
  signal?: AbortSignal
): Promise<string>
// Returns object URL; revokes previous URL automatically

// ── SoundEffectGenerator ──────────────────────────────────────
export async function generateAmbientSoundscape(
  descriptor: string,
  signal?: AbortSignal
): Promise<string | null>
// Returns object URL or null on failure (non-fatal)
```

---

### `src/hooks/useAudioPostcard.ts`

Orchestrates the full pipeline and manages dual audio elements.

```typescript
export interface AudioPostcardState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  toggle: () => void;
  retry: () => void;
}

export function useAudioPostcard(
  city: City | null,
  era: Era | null
): AudioPostcardState
```

**Internal state:**
```typescript
const narratorRef = useRef<HTMLAudioElement>(new Audio());
const ambientRef  = useRef<HTMLAudioElement>(new Audio());
const abortRef    = useRef<AbortController | null>(null);

const [isLoading, setIsLoading] = useState(false);
const [isPlaying, setIsPlaying] = useState(false);
const [error, setError]         = useState<string | null>(null);
```

**Generation pipeline (triggered by city/era change):**
1. Cancel previous `AbortController`; create new one.
2. `setIsLoading(true)`, `setError(null)`.
3. `const { script, ambientDescriptor } = await generateScript(city, era, signal)`.
4. `const voiceId = await resolveVoice(city)`.
5. Fan out in parallel:
   - `const narratorUrl = await synthesiseNarration(script, voiceId, signal)`
   - `const ambientUrl  = await generateAmbientSoundscape(ambientDescriptor, signal)`
6. Set `narratorRef.current.src = narratorUrl`.
7. If `ambientUrl`: set `ambientRef.current.src = ambientUrl`, `ambientRef.current.loop = true`, `ambientRef.current.volume = 0.35`.
8. `setIsLoading(false)`.
9. Call `play()` on both elements; `setIsPlaying(true)`.

**`toggle()`:**
```typescript
if (isPlaying) {
  narratorRef.current.pause();
  ambientRef.current.pause();
} else {
  narratorRef.current.play();
  ambientRef.current.play();
}
setIsPlaying(!isPlaying);
```

**`narratorRef` `ended` event handler:**
```typescript
narratorRef.current.addEventListener("ended", () => {
  ambientRef.current.pause();
  narratorRef.current.currentTime = 0;
  ambientRef.current.currentTime = 0;
  setIsPlaying(false);
});
```

**Cleanup on unmount:**
```typescript
useEffect(() => {
  return () => {
    narratorRef.current.pause();
    ambientRef.current.pause();
    // revoke object URLs
  };
}, []);
```

---

## Modified Files

### `src/components/ui-extras/CityPanel.tsx`

**Changes:**
- Remove local `useState(playing)` toggle.
- Import and call `useAudioPostcard(city, era)`.
- Destructure `{ isLoading, isPlaying, error, toggle, retry }`.
- Pass `isPlaying` to `<AudioWaveform playing={isPlaying} />`.
- Replace play/pause button `onClick` with `toggle`.
- Add loading state: render a spinner (or pulsing indicator) in place of the play/pause button while `isLoading`.
- Add error state: render error message + retry button below the waveform when `error` is non-null.

**No changes to props interface** — `CityPanel` still accepts `{ city, era, onBack, onClose }`.

### `src/components/ui-extras/AudioWaveform.tsx`

No changes required. The component already accepts `playing: boolean` and renders accordingly.

---

## API Integration Details

### Groq — Scene Script

| Parameter | Value |
|-----------|-------|
| Endpoint | `chat.completions.create` via `groq-sdk` |
| Model | `llama3-8b-8192` |
| `max_tokens` | `300` |
| Response format | JSON object `{ script, ambientDescriptor }` |
| Auth | `VITE_GROQ_API_KEY` via SDK constructor |

### ElevenLabs — Model Verification

| Parameter | Value |
|-----------|-------|
| Endpoint | `client.models.getAll()` |
| Called | Once at service init, result cached in module scope |
| Purpose | Confirm `eleven_multilingual_v2` is available |

### ElevenLabs — Voice Verification

| Parameter | Value |
|-----------|-------|
| Endpoint | `client.voices.get(voiceId)` |
| Called | Per postcard generation |
| Purpose | Confirm selected regional voice is accessible |

### ElevenLabs — TTS Narration

| Parameter | Value |
|-----------|-------|
| Endpoint | `client.textToSpeech.convert(voiceId, { ... })` |
| Model | `eleven_multilingual_v2` |
| Output format | `mp3_44100_128` |
| `stability` | `0.6` |
| `similarity_boost` | `0.8` |
| `style` | `0.3` |
| `use_speaker_boost` | `true` |
| Auth | `VITE_ELEVENLABS_API_KEY` via shared client |

### ElevenLabs — Sound Effects

| Parameter | Value |
|-----------|-------|
| Endpoint | `client.textToSoundEffects.convert({ text, duration_seconds, ... })` |
| `duration_seconds` | `4` (midpoint of 3–5 range) |
| Output format | `mp3_44100_128` |
| Failure behaviour | Returns `null`; narration plays alone |
| Auth | `VITE_ELEVENLABS_API_KEY` via shared client |

---

## Voice Region Mapping

The `COUNTRY_REGION` table in `elevenLabsService.ts` maps every country present in `src/data/cities.ts` to one of four regions:

| Region | Countries (examples) |
|--------|----------------------|
| `europe` | UK, France, Germany, Italy, Spain, Portugal, Netherlands, Belgium, Austria, Czechia, Poland, Hungary, Switzerland, Greece, Sweden, Norway, Denmark, Finland, Iceland, Russia, Ukraine, Türkiye |
| `asia` | Japan, South Korea, China, Taiwan, Philippines, Thailand, Vietnam, Singapore, Malaysia, Indonesia, India, Nepal, Bangladesh, Pakistan, Iran, UAE, Qatar, Saudi Arabia, Israel, Kazakhstan |
| `americas` | USA, Canada, Mexico, Cuba, Panama, Colombia, Peru, Ecuador, Chile, Argentina, Uruguay, Brazil, Venezuela |
| `africa_mideast` | Egypt, Morocco, Tunisia, Nigeria, Ghana, Senegal, Ethiopia, Kenya, Tanzania, Uganda, Angola, South Africa |

Countries not in the table fall through to the `default` region (George).

---

## Error Handling Strategy

| Failure point | Behaviour |
|---------------|-----------|
| Groq API error | Throw typed error → `useAudioPostcard` sets `error` state → CityPanel shows error + retry |
| ElevenLabs TTS error | Throw typed error → same path as above |
| ElevenLabs SFX error | Log warning, return `null` → narration plays alone, no user-visible error |
| Voice unavailable | Fall back to George, log warning → generation continues |
| Model unavailable | Throw config error → surfaces as user-visible error |
| Missing API key | Throw config error before any network call → surfaces as user-visible error |
| AbortError (cancelled) | Silently ignored — a new pipeline is already starting |

---

## Dependency Notes

- `groq-sdk` — must be added to `package.json` (not yet present).
- `@elevenlabs/elevenlabs-js` — already at `^2.43.0` in `package.json`.
- No other new dependencies required.
