# Implementation Plan: Progressive Documentary Audio

## Overview

Refactor `documentaryService.ts` to expose a per-segment TTS function and update the Groq prompt, then rewrite `useDocumentary.ts` to synthesise only segment 0 before playback and prefetch subsequent segments in the background at the 30-second mark.

## Tasks

- [x] 1. Update Groq prompt word-count target in `documentaryService.ts`
  - Change the per-segment word-count instruction from "100–180 words" to "80–90 words"
  - Update `max_tokens` from 1200 to a value appropriate for 4 × ~90 words (~800 tokens)
  - _Requirements: 1.1_

- [x] 2. Add `synthesiseSegment()` to `documentaryService.ts`
  - [x] 2.1 Implement `synthesiseSegment(segment, voiceId, signal?): Promise<string>`
    - Throw `AbortError` immediately if `signal` is already aborted (before any network call)
    - Move voice settings (`stability`, `similarity_boost`, `style`, `use_speaker_boost`, `output_format`) from `synthesiseDocumentaryAudio` into this function
    - Use the existing `retryWithBackoff` helper for up to 3 retries on 429 errors
    - Stream the ElevenLabs response into a `Blob`, create and return an object URL
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Write property test for `synthesiseSegment` — pre-aborted signal (Property 8)
    - **Property 8: synthesiseSegment aborts immediately on pre-aborted signal**
    - **Validates: Requirements 6.4**
    - Use `fc.string()` for segment text and `fc.string()` for voice ID; pass an already-aborted `AbortSignal`
    - Assert `AbortError` is thrown and the ElevenLabs client is never called
    - Tag: `// Feature: progressive-documentary-audio, Property 8: synthesiseSegment aborts immediately on pre-aborted signal`

  - [ ]* 2.3 Write property test for `synthesiseSegment` — retry on 429 (Property 9)
    - **Property 9: synthesiseSegment retries correctly on 429 errors**
    - **Validates: Requirements 6.3**
    - Use `fc.integer({ min: 0, max: 4 })` for `k` (consecutive 429 responses)
    - Mock ElevenLabs to return 429 for the first `k` calls, then succeed
    - Assert: when `k ≤ 3` the function resolves; when `k > 3` it throws after 3 retries
    - Tag: `// Feature: progressive-documentary-audio, Property 9: synthesiseSegment retries correctly on 429 errors`

- [x] 3. Refactor `synthesiseDocumentaryAudio()` to delegate to `synthesiseSegment()`
  - Replace the inline TTS + retry logic inside `synthesiseDocumentaryAudio` with `Promise.all(segments.map(s => synthesiseSegment(s, voiceId, signal)))`
  - Keep the null-filter and "all failed" error throw
  - Remove the now-redundant per-segment try/catch (errors propagate from `synthesiseSegment`)
  - _Requirements: 6.5_

- [x] 4. Checkpoint — verify service layer
  - Ensure all existing tests pass and TypeScript compiles with no errors before proceeding to hook rewrite.

- [x] 5. Rewrite `useDocumentary.ts` with progressive loading
  - [x] 5.1 Replace refs and state declarations
    - Remove `playlistRef`, `playlistIndexRef`, `playlistTimerRef`
    - Add `segmentCacheRef: useRef<Map<number, string>>(new Map())`
    - Add `prefetchedRef: useRef<Set<number>>(new Set())`
    - Add `currentSegmentIndexRef: useRef<number>(0)`
    - Add `textSegmentsRef: useRef<string[] | null>(null)`
    - Keep `audioRef`, `abortRef`, `isLoading`, `isPlaying`, `error`, `segments`, `retryCount`
    - _Requirements: 7.4, 8.3_

  - [x] 5.2 Generate all 4 Groq text segments upfront, synthesise only segment 0 before playback
    - In the `run()` async function: call `generateDocumentaryScript` → store result in `textSegmentsRef` and call `setSegments`
    - Call `synthesiseSegment(textSegments[0], voiceId, signal)` → store URL in `segmentCacheRef.current.set(0, url)`
    - Set `audio.src = url`, call `audio.play()`, then `setIsLoading(false)` and `setIsPlaying(true)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.3 Attach `timeupdate` listener for 30-second prefetch trigger
    - After `audio.play()` succeeds, attach `onTimeUpdate` listener to `audioRef.current`
    - Inside `onTimeUpdate`: read `currentSegmentIndexRef.current`, compute `nextIdx = idx + 1`
    - Guard: return early if `nextIdx > 3`, `prefetchedRef.current.has(nextIdx)`, or `audio.currentTime < 30`
    - Mark `prefetchedRef.current.add(nextIdx)` immediately (idempotence guard)
    - Call `synthesiseSegment(textSegmentsRef.current[nextIdx], voiceId, signal).then(url => segmentCacheRef.current.set(nextIdx, url)).catch(() => {})`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.4_

  - [x] 5.4 Implement `onended` handler with cache-hit and cache-miss paths
    - On `audio.onended`: compute `nextIdx = currentSegmentIndexRef.current + 1`
    - If `nextIdx > 3`: call `setIsPlaying(false)` and `setIsLoading(false)` → done
    - Cache hit: set `currentSegmentIndexRef.current = nextIdx`, `audio.src = url`, `audio.play()`
    - Cache miss: call `setIsLoading(true)`, then call `waitForSegment(nextIdx)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.5 Implement `waitForSegment(idx)` polling helper
    - Poll `segmentCacheRef.current.get(idx)` every 100 ms using `setInterval`
    - When URL appears: clear interval, set `currentSegmentIndexRef.current = idx`, `audio.src = url`, `audio.play()`, `setIsLoading(false)`
    - Respect abort signal: if `signal.aborted` fires during polling, clear interval and return without playing
    - Store the interval ID in a ref so `cleanup()` can clear it
    - _Requirements: 5.2_

  - [x] 5.6 Implement `cleanup()` function and wire it to effect teardown and `retry()`
    - `abortRef.current?.abort()`
    - `audio.pause()`
    - `audio.removeEventListener('timeupdate', onTimeUpdate)`
    - `audio.onended = null`
    - Clear the `waitForSegment` interval ref
    - `segmentCacheRef.current.forEach(url => URL.revokeObjectURL(url))`
    - `segmentCacheRef.current.clear()`
    - `prefetchedRef.current.clear()`
    - `currentSegmentIndexRef.current = 0`
    - `textSegmentsRef.current = null`
    - Return `cleanup` from the effect so React calls it on re-run and unmount
    - _Requirements: 4.3, 7.3, 8.1, 8.2, 8.4_

  - [x] 5.7 Update `toggle()` to work with the new single-segment model
    - Pause: `audio.pause()`, `setIsPlaying(false)`
    - Resume: `audio.play()`, `setIsPlaying(true)` (no playlist index logic needed)
    - _Requirements: 5.1_

- [x] 6. Checkpoint — verify hook compiles and existing tests pass
  - Run `tsc --noEmit` and `vitest --run` to confirm no regressions before writing property tests.

- [ ] 7. Write property-based tests for the progressive loading logic
  - [ ]* 7.1 Property 1 — Segment word count is within target range
    - **Property 1: Each of the 4 returned segments has 70–110 words**
    - **Validates: Requirements 1.1**
    - Use `fc.record({ name: fc.string(), country: fc.string() })` for city and `fc.record({ year: fc.string() })` for era; mock Groq to return a response with 4 segments of random word counts in range
    - Assert every segment word count is between 70 and 110
    - Tag: `// Feature: progressive-documentary-audio, Property 1: Segment word count is within target range`

  - [ ]* 7.2 Property 2 — Script parsing always yields exactly 4 segments
    - **Property 2: Any Groq response with 3+ `---` separators parses to exactly 4 non-empty strings**
    - **Validates: Requirements 1.2, 1.4**
    - Use `fc.array(fc.string({ minLength: 1 }), { minLength: 4, maxLength: 4 })` to generate 4 non-empty parts; join with ` --- `; pass as mocked Groq response
    - Assert output array length === 4 and every element is non-empty
    - Tag: `// Feature: progressive-documentary-audio, Property 2: Script parsing always yields exactly 4 segments`

  - [ ]* 7.3 Property 3 — Only segment 0 TTS is called before playback starts
    - **Property 3: At the moment isPlaying first becomes true, synthesiseSegment call count === 1**
    - **Validates: Requirements 2.1, 2.4**
    - Mock `synthesiseSegment` to resolve with a fake URL; render hook with random city/era/voice
    - Wait until `isPlaying === true`; assert mock was called exactly once with index-0 text
    - Tag: `// Feature: progressive-documentary-audio, Property 3: Only segment 0 TTS is called before playback starts`

  - [ ]* 7.4 Property 4 — State transitions correctly on first segment ready
    - **Property 4: When segment 0 audio begins playing, isLoading === false and isPlaying === true**
    - **Validates: Requirements 2.3**
    - Mock TTS and Groq; assert state snapshot at the moment `audio.play()` resolves
    - Tag: `// Feature: progressive-documentary-audio, Property 4: State transitions correctly on first segment ready`

  - [ ]* 7.5 Property 5 — Prefetch triggers exactly once per segment at 30-second mark
    - **Property 5: Firing timeupdate N ≥ 1 times with currentTime ≥ 30 triggers synthesiseSegment exactly once for nextIdx**
    - **Validates: Requirements 3.1, 3.3, 7.4**
    - Use `fc.integer({ min: 0, max: 2 })` for current segment index and `fc.integer({ min: 1, max: 10 })` for N timeupdate fires
    - Simulate N timeupdate events; assert `synthesiseSegment` called exactly once for `currentIdx + 1`
    - Tag: `// Feature: progressive-documentary-audio, Property 5: Prefetch triggers exactly once per segment at 30-second mark`

  - [ ]* 7.6 Property 6 — Segments play in ascending order
    - **Property 6: audio.src assignments across a full session match [cache[0], cache[1], cache[2], cache[3]] in order**
    - **Validates: Requirements 5.1, 5.4**
    - Generate 4 distinct fake URLs; pre-populate `segmentCacheRef` with all 4; simulate `onended` three times
    - Assert `audio.src` assignment sequence is exactly `[url0, url1, url2, url3]`
    - Tag: `// Feature: progressive-documentary-audio, Property 6: Segments play in ascending order`

  - [ ]* 7.7 Property 7 — Abort cleans up all resources
    - **Property 7: Triggering abort results in signal aborted, all URLs revoked, no further synthesiseSegment completions**
    - **Validates: Requirements 4.3, 8.1, 8.2, 8.4**
    - Use `fc.oneof(fc.constant('inputChange'), fc.constant('unmount'), fc.constant('retry'))` for abort trigger type
    - Assert `AbortController.signal.aborted === true`, `URL.revokeObjectURL` called for each cached URL, `synthesiseSegment` mock not called after abort
    - Tag: `// Feature: progressive-documentary-audio, Property 7: Abort cleans up all resources`

  - [ ]* 7.8 Property 10 — timeupdate listener is removed on cleanup
    - **Property 10: removeEventListener('timeupdate', ...) is called on any unmount or reset trigger**
    - **Validates: Requirements 7.3**
    - Spy on `audioRef.current.removeEventListener`; trigger cleanup via unmount or input change
    - Assert spy was called with `'timeupdate'` as the first argument
    - Tag: `// Feature: progressive-documentary-audio, Property 10: timeupdate listener is removed on cleanup`

- [x] 8. Final checkpoint — full test suite and build verification
  - Run `vitest --run` to confirm all tests pass (including new property tests)
  - Run `tsc --noEmit` to confirm no TypeScript errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Properties 8 and 9 (service-layer) are in task 2; properties 1–7 and 10 (hook-layer) are in task 7
- The public `DocumentaryState` interface is unchanged — no UI changes required
- `synthesiseDocumentaryAudio` is kept for backward compatibility; it now delegates to `synthesiseSegment`
- All property tests use the `fast-check` library already present in the project
