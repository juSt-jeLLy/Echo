---
inclusion: auto
---

# City Whispers — Audio Architecture Guidelines

## Core Patterns

### AbortController Usage
Every async audio pipeline must accept and respect an `AbortSignal`:
- Create a new `AbortController` at the start of each generation run
- Abort the previous controller before starting a new one
- Check `signal.aborted` after every `await` — return early if aborted
- Pass `signal` down to all service calls (`generateScene`, `synthesiseIntro`, etc.)
- Abort on component unmount in the cleanup function of `useEffect`

```typescript
abortRef.current?.abort();
const controller = new AbortController();
abortRef.current = controller;
const { signal } = controller;
```

### Playlist Sequencing (Wander Mode)
- Store audio segment URLs in `playlistRef.current` (ordered array)
- Track current position with `playlistIndexRef.current`
- Use `sceneAudioRef.current.onended = playNext` to advance automatically
- Add a 400ms gap between segments via `setTimeout` in `playNext`
- Ambient soundscape plays on a separate `HTMLAudioElement` at `volume: 0.3`, looped
- On playlist end: pause ambient, reset index, set `isPlaying: false`

### Progressive Loading (Documentary Mode)
- Generate all 4 text segments upfront (single cheap Groq call)
- Synthesise only segment 0 before starting playback
- Attach `timeupdate` listener — prefetch segment N+1 at the 30-second mark
- Use `segmentCacheRef` (Map) to store synthesised URLs by index
- Use `prefetchedRef` (Set) to prevent duplicate prefetch calls
- On `onended`: check cache for next segment; if missing, poll with `setInterval` at 100ms

### Memory Cleanup
- Revoke object URLs before replacing them (use `previousXxxUrl` module-level refs)
- In documentary mode, revoke all cached segment URLs in the cleanup function
- Clear `segmentCacheRef`, `prefetchedRef`, and reset index refs on cleanup
- Pause all `HTMLAudioElement` instances in cleanup

## State Machine (per hook)

```
idle → loading → playing → idle (on end)
                         → paused → playing (on toggle)
loading → error (on failure)
error → loading (on retry, increments retryCount)
```

- `isLoading`: true while generating scene + synthesising audio
- `isPlaying`: true while any audio element is actively playing
- `error`: string message for user display; null when no error
- `scene`/`segments`: the generated content for display in the UI

## Historian Conversation Audio
- Scene audio (`sceneAudioRef`) pauses when historian session connects
- Ambient audio continues at reduced volume (0.15) during conversation
- Both resume at normal levels when session disconnects
- Use `ConversationStatus` state to drive this behavior in `CityPanel`

## Groq Scene Generation — Dual-Call Pattern
The scene generation uses two parallel Groq calls to avoid JSON escaping failures:
1. **Call 1** (`json_object` format): structured fields only — `eventName`, `atmosphere`, `soundscapePrompt`
2. **Call 2** (plain text): interleaved `VOICE:Name|line` and `SFX:description` lines

Never put dialogue or multilingual content inside a `json_object` response — the model breaks JSON quoting on brackets, exclamation marks, and non-ASCII characters.

## Voice ID Map (Wander Mode)
```typescript
const VOICE_ID_MAP = {
  Charlie:  "IKne3meq5aSn9XLyUdCD",  // young, energetic
  Laura:    "FGY2WhTYpPnrIDTdsKH5",  // young woman
  Brian:    "nPczCjzI2devNBz1zQrb",  // authority/officer
  Jessica:  "cgSgspJ2msm6clMCkdW9",  // young woman
  Will:     "bIHbv24MWmeRgasZH58o",  // merchant/bystander
  Roger:    "CwhRBWXzGAHq8TQ4Fs17",  // merchant/bystander
  Liam:     "TX3LPaxmHKxFdv7VOQHJ",  // young rebel/soldier
  Sarah:    "EXAVITQu4vr4xnSDxMaL",  // woman
}
```

## Narrator Voices (Documentary Mode)
Six voices available: George (warm), Daniel (formal), Brian (resonant), Matilda (professional), Alice (educator), River (neutral). Default is George.
