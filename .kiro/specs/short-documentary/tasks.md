# Implementation Plan: Short Documentary

## Overview

Surgical update to `documentaryService.ts` to reduce the documentary from 4 segments (~3–5 min) to 2 segments (~1 min). The Groq prompt is updated, the segment parser is tightened to `slice(0, 2)`, the padding loop is removed, and the JSDoc comment in `useDocumentary.ts` is cleaned up. Property-based tests validate the parsing and playlist behaviour.

## Tasks

- [ ] 1. Update `generateDocumentaryScript` in `documentaryService.ts`
  - [ ] 1.1 Update the Groq prompt to request 2 segments at 80 words max
    - Change system message: replace "4 segments" with "2 segments"
    - Replace the user message with the new 2-segment prompt (world context + city life, ≤ 80 words each, no labels)
    - Reduce `max_tokens` from `1200` to `600`
    - _Requirements: 1.1, 2.1, 2.2, 2.3_
  - [ ] 1.2 Update segment parsing to `slice(0, 2)`
    - Change `.slice(0, 4)` to `.slice(0, 2)` in the parsing chain
    - _Requirements: 1.2_
  - [ ] 1.3 Remove the padding loop
    - Delete the `while (segments.length < 4)` block entirely
    - _Requirements: 1.4_

- [ ] 2. Update JSDoc comment in `useDocumentary.ts`
  - Change `/** The 4 text segments (for display purposes) */` to `/** The text segments (for display purposes) */`
  - _Requirements: 3.3_

- [ ] 3. Checkpoint — verify the build compiles cleanly
  - Run `tsc --noEmit` (or the project's build command) to confirm no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Write property-based tests for correctness properties
  - [ ]* 4.1 Write property test for Property 1: Segment parsing correctness
    - **Property 1: Segment parsing correctness**
    - Generate random pairs of non-empty strings, join with `---`, mock as Groq response, assert returned array has length 2 and matches the first 2 strings
    - Use `fast-check` arbitraries; minimum 100 runs
    - **Validates: Requirements 1.2, 1.4**
  - [ ]* 4.2 Write property test for Property 2: Insufficient segments throws error
    - **Property 2: Insufficient segments throws error**
    - Generate strings that produce 0 or 1 non-empty segments (empty string, whitespace-only, single block with no `---`), assert `generateDocumentaryScript` throws
    - Use `fast-check` arbitraries; minimum 100 runs
    - **Validates: Requirements 1.3, 4.3**
  - [ ]* 4.3 Write property test for Property 3: Playlist length agnosticism
    - **Property 3: Playlist length agnosticism**
    - Generate playlists of length 1–4 (arrays of mock audio URLs), simulate sequential `onended` events on the hook, assert all segments played and `isPlaying` is `false` after the last
    - Use `fast-check` arbitraries; minimum 100 runs
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 5. Final checkpoint — run the full test suite
  - Run `vitest --run` to confirm all tests pass (including the new property tests)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests live alongside the service, e.g. `src/services/documentaryService.test.ts`
- `synthesiseDocumentaryAudio` and `useDocumentary` playback logic require no code changes — they are already length-agnostic
- The error message "fewer than 2 segments" is already correct in the existing code and needs no update
