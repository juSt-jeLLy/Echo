# Design Document

## Overview

Add a short TTS intro clip (George voice) that plays before the interleaved VOICE/SFX scene in every audio postcard. The intro is generated in parallel with existing audio assets and prepended to the playlist, so it plays first with no added latency.

## Architecture

No new components or services are introduced. The change is confined to two existing files:

- `src/services/elevenLabsService.ts` — new `synthesiseIntro` function
- `src/hooks/useAudioPostcard.ts` — parallel generation + playlist prepend

## Component Design

### `synthesiseIntro` (elevenLabsService.ts)

A new exported async function alongside the existing `generateAmbientSoundscape` and `synthesiseSceneLines`.

```typescript
export async function synthesiseIntro(
  city: City,
  eventName: string,
  atmosphere: string,
  signal?: AbortSignal
): Promise<string | null>
```

**Behaviour:**
1. Checks `signal?.aborted` early and returns `null` immediately if aborted.
2. Builds intro text: `"Welcome to ${city.name}. You are now in ${eventName}. ${atmosphere}"`
3. Calls `client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", { ... })` with:
   - `model_id: "eleven_multilingual_v2"`
   - `voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }`
   - `output_format: "mp3_44100_128"`
4. Streams response chunks into a `Uint8Array[]`, checks `signal?.aborted` per chunk.
5. Creates a `Blob` and returns `URL.createObjectURL(blob)`.
6. On any error (including `AbortError`), logs a warning and returns `null`.

**Memory management:** Follows the same pattern as `synthesiseSceneLines` — object URLs are short-lived and managed by the hook's cleanup logic.

### `useAudioPostcard.ts` changes

**Generation pipeline** — replace the existing `Promise.all` with a three-way parallel call:

```typescript
const [introUrl, sceneUrls, ambientUrl] = await Promise.all([
  synthesiseIntro(city, sceneResult.eventName, sceneResult.atmosphere, signal),
  synthesiseSceneLines(sceneResult.sceneLines, signal),
  generateAmbientSoundscape(sceneResult.soundscapePrompt, signal),
]);
```

**Playlist assembly** — prepend intro URL if present:

```typescript
playlistRef.current = [introUrl, ...sceneUrls].filter((u): u is string => u !== null);
```

No other changes to the hook. The existing sequential playlist mechanism (`playNext`, `onended`, `playlistIndexRef`) handles the intro clip transparently — it is just the first entry in the array.

## Data Flow

```
generateScene(city, era)
        │
        ▼
   SceneResult { eventName, atmosphere, soundscapePrompt, sceneLines }
        │
        ├──► synthesiseIntro(city, eventName, atmosphere)  ──► introUrl | null
        ├──► synthesiseSceneLines(sceneLines)              ──► sceneUrls[]
        └──► generateAmbientSoundscape(soundscapePrompt)   ──► ambientUrl | null
                                │
                                ▼
              playlistRef = [introUrl, ...sceneUrls].filter(Boolean)
                                │
                                ▼
              playback: intro → scene line 1 → sfx 1 → scene line 2 → ...
              (ambient loops underneath throughout)
```

## Voice Settings Rationale

| Parameter | Scene voices | George intro |
|---|---|---|
| stability | 0.35 | 0.5 |
| similarity_boost | 0.8 | 0.8 |
| style | 0.7 | 0.3 |
| use_speaker_boost | true | true |

Lower `style` (0.3 vs 0.7) and higher `stability` (0.5 vs 0.35) for the intro produces a calmer, more measured delivery — a guide introducing the scene rather than a character inside it.

## Error Handling

| Failure | Behaviour |
|---|---|
| `synthesiseIntro` returns null | Playlist starts from scene lines; no user-visible error |
| `synthesiseSceneLines` returns [] | Playlist is empty; ambient plays alone |
| `generateAmbientSoundscape` returns null | Error surfaced to user (existing behaviour, unchanged) |
| AbortSignal fired mid-generation | All three tasks return null/[] and the effect exits silently |

## Correctness Properties

### Property 1: Intro position invariant
For any non-null `introUrl`, `playlistRef.current[0] === introUrl`. The intro is always first.

### Property 2: Null-safety / filter invariant
`playlistRef.current` contains no null or undefined entries regardless of which generation tasks fail.

### Property 3: Scene order preservation
For any `sceneUrls` array, the relative order of scene URLs in the playlist is preserved after prepending the intro.

### Property 4: Non-fatal intro failure
When `synthesiseIntro` returns null, `playlistRef.current` equals `sceneUrls.filter(Boolean)` — identical to the pre-feature behaviour.

### Property 5: Parallel generation (no sequential dependency)
`synthesiseIntro`, `synthesiseSceneLines`, and `generateAmbientSoundscape` are called inside a single `Promise.all` — none waits for another to complete.
