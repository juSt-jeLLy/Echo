# Design Document

## Overview

The Dual-Mode Audio Experience adds a mode selection step between era selection and the audio experience. It introduces a Documentary mode alongside the existing Wander the City (immersive scene) mode. The implementation adds new files for mode UI, documentary service, and voice data, and modifies the existing Index page and CityPanel to support mode state.

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/data/voices.ts` | NarratorVoice definitions (id, name, description) |
| `src/components/ui-extras/ModeCard.tsx` | Mode selection UI — two large cards + VoiceSelector |
| `src/services/documentaryService.ts` | Groq documentary script generation + ElevenLabs TTS |
| `src/hooks/useDocumentary.ts` | React hook managing documentary audio state |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `"mode"` step; pass mode + voice to CityPanel |
| `src/components/ui-extras/CityPanel.tsx` | Accept mode + voice props; render ModeToggle; conditionally use WanderMode or DocumentaryMode hook |

### Step Flow

```
idle → era → mode → experience
                ↑
         (mode card shown here)
         WanderMode → experience directly
         DocumentaryMode → voice selector → experience
```

The `step` type in `Index.tsx` becomes `"idle" | "era" | "mode" | "experience"`.

---

## Component Design

### `src/data/voices.ts`

```typescript
export interface NarratorVoice {
  id: string;
  name: string;
  description: string;
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",  description: "Warm storyteller" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  description: "Formal broadcaster" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian",   description: "Resonant narrator" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Professional" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",   description: "Clear educator" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River",   description: "Calm, neutral" },
];

export const DEFAULT_NARRATOR_VOICE = NARRATOR_VOICES[0]; // George
```

---

### `src/components/ui-extras/ModeCard.tsx`

Renders the mode selection screen. Shows two large cards side by side. When Documentary is selected, reveals the VoiceSelector inline before confirming.

**Props:**
```typescript
type Props = {
  city: City;
  era: Era;
  onSelectWander: () => void;
  onSelectDocumentary: (voice: NarratorVoice) => void;
  onBack: () => void;
};
```

**Layout:**
- Header: city name + era label + back button
- Two large cards (grid-cols-2):
  - Card 1: Footsteps icon, "Wander the City", description
  - Card 2: Film/Mic icon, "Documentary", description
- When Documentary card is clicked: voice selector grid appears below the cards
- Voice selector: 6 buttons in a 2×3 or 3×2 grid, each showing name + description
- Confirm button: "Listen as [VoiceName] →"

---

### `src/services/documentaryService.ts`

**`generateDocumentaryScript(city, era, signal?)`**

Calls Groq with a plain-text prompt (no `json_object` format) asking for 4 segments separated by `---`. Returns `string[]` of 4 segments.

Groq prompt:
```
Generate a documentary script about {city.name}, {city.country} in {era.year}.
Return 4 segments as plain text separated by "---":
- Segment 1: World context (what was happening globally)
- Segment 2: The city specifically (what life was like)
- Segment 3: Key events or developments
- Segment 4: Daily life, culture, sounds of the era
Each segment max 180 words, written in documentary narration style.
```

Parsing: split on `---`, trim each part, filter empty, take first 4.

**`synthesiseDocumentaryAudio(segments, voiceId, signal?)`**

Calls `client.textToSpeech.convert` for each segment in parallel using the chosen voice ID. Returns `string[]` of object URLs (one per segment). Uses the existing `retryWithBackoff` pattern from `elevenLabsService.ts`.

Voice settings for documentary (clean narration):
```typescript
{
  stability: 0.65,
  similarity_boost: 0.8,
  style: 0.1,
  use_speaker_boost: true,
}
```

---

### `src/hooks/useDocumentary.ts`

Mirrors the structure of `useAudioPostcard` but for documentary mode.

**Signature:**
```typescript
export interface DocumentaryState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  segments: string[] | null;   // the 4 text segments (for display)
  toggle: () => void;
  retry: () => void;
}

export function useDocumentary(
  city: City | null,
  era: Era | null,
  voice: NarratorVoice | null
): DocumentaryState
```

**Pipeline:**
1. Call `generateDocumentaryScript(city, era, signal)` → `segments: string[]`
2. Call `synthesiseDocumentaryAudio(segments, voice.id, signal)` → `audioUrls: string[]`
3. Build playlist from `audioUrls`, play sequentially (no ambient audio)
4. `toggle()` pauses/resumes current segment audio
5. `retry()` increments `retryCount` to re-trigger the effect

No ambient audio element — documentary is clean narration only.

---

### `src/pages/Index.tsx` Changes

Add `"mode"` to the Step type:
```typescript
type Step = "idle" | "era" | "mode" | "experience";
```

Add state:
```typescript
const [selectedMode, setSelectedMode] = useState<"wander" | "documentary" | null>(null);
const [selectedVoice, setSelectedVoice] = useState<NarratorVoice | null>(null);
```

Handlers:
```typescript
const handleSelectEra = (era: Era) => {
  setSelectedEra(era);
  setStep("mode");           // ← was "experience", now goes to mode selection
};

const handleSelectWander = () => {
  setSelectedMode("wander");
  setStep("experience");
};

const handleSelectDocumentary = (voice: NarratorVoice) => {
  setSelectedMode("documentary");
  setSelectedVoice(voice);
  setStep("experience");
};

const handleBackToMode = () => setStep("mode");
const handleBackToEra  = () => setStep("era");
```

Render:
```tsx
{step === "mode" && (
  <ModeCard
    city={selectedCity!}
    era={selectedEra!}
    onSelectWander={handleSelectWander}
    onSelectDocumentary={handleSelectDocumentary}
    onBack={handleBackToEra}
  />
)}
{step === "experience" && (
  <CityPanel
    city={selectedCity}
    era={selectedEra}
    mode={selectedMode ?? "wander"}
    voice={selectedVoice}
    onBack={handleBackToMode}
    onClose={handleClose}
  />
)}
```

---

### `src/components/ui-extras/CityPanel.tsx` Changes

**New props:**
```typescript
type Props = {
  city: City | null;
  era: Era | null;
  mode: "wander" | "documentary";
  voice: NarratorVoice | null;
  onBack: () => void;
  onClose: () => void;
};
```

**Mode toggle:** A two-tab control at the top of the panel body (below the header). Clicking a tab calls a local `setActiveMode` state and triggers audio regeneration.

**Conditional hook usage:**
- Always call both hooks (React rules of hooks — no conditional hook calls)
- `wanderState = useAudioPostcard(city, era)` — always called
- `documentaryState = useDocumentary(city, era, activeMode === "documentary" ? voice : null)` — always called, but voice=null disables it when not in documentary mode

Actually, to avoid unnecessary API calls when not in documentary mode, the hooks should accept an `enabled` flag or we pass `null` city/era to the inactive hook. The cleaner approach: pass `null` city to the inactive hook so it short-circuits.

```typescript
const wanderState     = useAudioPostcard(
  activeMode === "wander" ? city : null,
  activeMode === "wander" ? era  : null
);
const documentaryState = useDocumentary(
  activeMode === "documentary" ? city : null,
  activeMode === "documentary" ? era  : null,
  voice
);

const active = activeMode === "wander" ? wanderState : documentaryState;
```

**Mode toggle UI:**
```tsx
<div className="mt-4 flex rounded-xl border border-border/60 bg-card/30 p-1 gap-1">
  <button onClick={() => setActiveMode("wander")}   className={tab(activeMode === "wander")}>
    <Footprints size={13} /> Wander
  </button>
  <button onClick={() => setActiveMode("documentary")} className={tab(activeMode === "documentary")}>
    <Film size={13} /> Documentary
  </button>
</div>
```

**Documentary heading:** When `activeMode === "documentary"`, replace the event name / atmosphere block with:
```
What was happening in {city.name} in {era.label}
```

---

## Data Flow Diagram

```
User selects city → era → ModeCard
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        WanderMode                    DocumentaryMode
              │                               │
              │                        VoiceSelector
              │                               │
              └───────────┬───────────────────┘
                          ▼
                      CityPanel
                    (mode toggle)
                    /           \
           WanderMode         DocumentaryMode
         useAudioPostcard    useDocumentary
               │                    │
         groqService          documentaryService
         elevenLabsService    elevenLabsService
               │                    │
         multi-voice           4-segment TTS
         scene + SFX           clean narration
```

---

## Error Handling

- Documentary script generation failure → `error` state in `useDocumentary` → shown in CityPanel error UI with Retry button
- TTS synthesis failure for any segment → error surfaced, retry regenerates all segments
- Abort on mode switch or unmount — both hooks use `AbortController` pattern matching `useAudioPostcard`

---

## Correctness Properties

### Property 1: Documentary Segment Count
For any valid city and era, `generateDocumentaryScript` returns an array of exactly 4 non-empty strings.

### Property 2: Playlist Sequential Playback
The documentary playlist plays segments in order (index 0 → 1 → 2 → 3) and stops after the last segment.

### Property 3: Mode Isolation
When `activeMode === "wander"`, the documentary hook receives `null` city/era and produces no API calls. When `activeMode === "documentary"`, the wander hook receives `null` city/era and produces no API calls.

### Property 4: Voice Default
If no voice is explicitly selected, the system uses `DEFAULT_NARRATOR_VOICE` (George) so the user can always proceed.
