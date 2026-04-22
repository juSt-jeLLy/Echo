# Design Document: Short Documentary

## Overview

The Documentary mode currently generates a 4-segment script (100–180 words per segment), producing 3–5 minutes of narrated audio. This change shortens the experience to approximately 1 minute by reducing the segment count to 2 and capping each segment at 80 words.

The change is surgical: only `documentaryService.ts` needs modification. The Groq prompt is updated to request 2 shorter segments, the segment parser is updated to expect 2 segments, the padding logic is removed, and error messages are updated to reference 2 segments. The `useDocumentary` hook is already length-agnostic and requires no changes.

## Architecture

The existing architecture is unchanged. The data flow remains:

```
useDocumentary (hook)
  └─► generateDocumentaryScript (documentaryService)
        └─► Groq API  →  2-segment plain-text response
  └─► synthesiseDocumentaryAudio (documentaryService)
        └─► ElevenLabs TTS  →  2 audio URLs
  └─► Playlist playback (useDocumentary internal)
```

The only modified layer is `documentaryService.ts`. The hook, UI components, and audio playback pipeline are untouched.

## Components and Interfaces

### `generateDocumentaryScript` (modified)

**Current behaviour:**
- Requests 4 segments of 100–180 words each
- Pads the array to 4 if fewer are returned
- Error message references "fewer than 2 segments"

**New behaviour:**
- Requests 2 segments of max 80 words each
- No padding — returns exactly what Groq returns (up to 2 segments)
- Error message references "fewer than 2 segments" (unchanged threshold, already correct)
- `max_tokens` reduced from 1200 to 600 to match the shorter output

**Prompt changes:**

System message — no change needed (already instructs "Output only the N segments separated by '---'", updated N to 2).

User message — updated to:
```
Generate a documentary script about {city.name}, {city.country} in {era.year}.
Return exactly 2 segments as plain text separated by "---":
- Segment 1: World context — what was happening globally around {era.year}
- Segment 2: The city — what life was like in {city.name} specifically
Each segment must be no more than 80 words, written in documentary narration style.
Do not include segment labels or headings.
```

**Parsing changes:**

```typescript
// Before
const segments = content
  .split(/\s*---\s*/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .slice(0, 4);

// After
const segments = content
  .split(/\s*---\s*/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .slice(0, 2);
```

**Padding removal:**

The `while (segments.length < 4)` padding block is removed entirely. Requirement 1.4 explicitly prohibits padding.

### `synthesiseDocumentaryAudio` (unchanged)

This function already operates on `segments.map(...)` — it is fully length-agnostic. No changes required.

### `useDocumentary` hook (unchanged)

The hook uses `playlistRef.current.length` for all playlist boundary checks. It is already length-agnostic for any playlist between 1 and N segments. No changes required.

The JSDoc comment on `DocumentaryState.segments` currently says "The 4 text segments" — this should be updated to "The text segments" to remove the hardcoded count.

## Data Models

No data model changes. The `DocumentaryState` interface and all related types remain identical. The `segments: string[] | null` field already accepts any array length.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Segment parsing correctness

*For any* Groq response string containing N non-empty text blocks separated by `---` (where N ≥ 2), `generateDocumentaryScript` SHALL return an array of exactly 2 non-empty strings matching the first 2 blocks.

**Validates: Requirements 1.2, 1.4**

### Property 2: Insufficient segments throws error

*For any* Groq response string that yields fewer than 2 non-empty segments after splitting on `---` (including empty strings, whitespace-only strings, and single-segment responses), `generateDocumentaryScript` SHALL throw an error.

**Validates: Requirements 1.3, 4.3**

### Property 3: Playlist length agnosticism

*For any* playlist of length between 1 and 4 inclusive, the `useDocumentary` hook SHALL play all segments sequentially and set `isPlaying` to `false` after the final segment ends.

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

Error handling strategy is unchanged. The existing error messages already satisfy the requirements:

| Condition | Error message |
|---|---|
| Groq returns empty content | `"Documentary script generation returned an empty response."` |
| Groq returns < 2 valid segments | `"Documentary script generation returned fewer than 2 segments. Please retry."` |
| All TTS calls fail | `"All documentary audio segments failed to synthesise. Please retry."` |

The segment-count error message already says "fewer than 2 segments" — this is correct for the new 2-segment target and requires no change.

## Testing Strategy

This feature involves a focused change to a service function. PBT is applicable for the parsing logic (Properties 1 and 2) since the input space (Groq response strings) is large and varied. Property 3 validates the hook's existing length-agnostic behaviour.

**Property-based testing library:** [fast-check](https://github.com/dubzzz/fast-check) (already available in the JS/TS ecosystem, consistent with the project's Vitest setup).

**Unit tests (example-based):**
- Prompt contains "2 segments" / "80 words" / "world context" / "city life" — verifies Requirements 1.1, 2.1, 2.2, 2.3
- Padding is absent — mock returns exactly 2 segments, verify array length is 2 — verifies Requirement 1.4
- Exact error messages for empty response and all-TTS-failure — verifies Requirements 4.1, 4.2
- `isPlaying` becomes `false` after 2-segment playlist ends — verifies Requirements 3.1, 3.2

**Property tests (minimum 100 iterations each):**

- **Feature: short-documentary, Property 1: Segment parsing correctness**
  Generate random pairs of non-empty strings, join with `---`, mock as Groq response, assert returned array has length 2 and matches the first 2 strings.

- **Feature: short-documentary, Property 2: Insufficient segments throws error**
  Generate strings that produce 0 or 1 non-empty segments (empty string, whitespace-only, single block with no `---`), assert `generateDocumentaryScript` throws.

- **Feature: short-documentary, Property 3: Playlist length agnosticism**
  Generate playlists of length 1–4 (array of mock audio URLs), simulate sequential `onended` events, assert all segments played and `isPlaying` is `false` after the last.
