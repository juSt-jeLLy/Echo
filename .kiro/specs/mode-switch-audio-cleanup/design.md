# Mode Switch Audio Cleanup Bugfix Design

## Overview

When users switch between "Wander the City" and "Documentary" modes in the CityPanel component, audio from the previous mode continues playing while the new mode's audio starts, resulting in overlapping audio streams. The fix ensures that when either `useAudioPostcard` or `useDocumentary` hooks receive null inputs (due to mode switching), they immediately stop and cleanup their audio playback. This is a targeted fix that adds early-return cleanup logic to both hooks' main useEffect without altering the existing playback, pause/resume, or completion behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user switches modes and the inactive hook receives null inputs but does not stop its audio
- **Property (P)**: The desired behavior when mode switching occurs - all audio from the previous mode must stop immediately before the new mode's audio starts
- **Preservation**: Existing audio playback, pause/resume, completion, and cleanup behaviors that must remain unchanged by the fix
- **useAudioPostcard**: The hook in `src/hooks/useAudioPostcard.ts` that manages "Wander the City" mode audio (scene audio + ambient soundscape)
- **useDocumentary**: The hook in `src/hooks/useDocumentary.ts` that manages "Documentary" mode audio (4 progressive segments)
- **activeMode**: The state variable in CityPanel that determines which mode is currently active ("wander" or "documentary")
- **sceneAudioRef**: Audio element ref in useAudioPostcard for scene narration
- **ambientRef**: Audio element ref in useAudioPostcard for ambient soundscape
- **audioRef**: Audio element ref in useDocumentary for documentary segments

## Bug Details

### Bug Condition

The bug manifests when a user switches between modes in the CityPanel component. The CityPanel always calls both hooks but passes null to the inactive one to prevent API calls. However, the hooks do not detect this null-input scenario and stop their currently playing audio, resulting in overlapping audio streams.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { city: City | null, era: Era | null, voice?: NarratorVoice | null, previousMode: string, newMode: string }
  OUTPUT: boolean
  
  RETURN input.previousMode != input.newMode
         AND audioIsCurrentlyPlaying(input.previousMode)
         AND hookReceivesNullInputs(input.previousMode)
         AND NOT audioStoppedByHook(input.previousMode)
END FUNCTION
```

### Examples

- **Wander → Documentary**: User is listening to scene audio and ambient soundscape in "Wander the City" mode, then clicks the "Documentary" tab. Expected: wander audio stops immediately. Actual: wander audio continues playing while documentary audio also starts.

- **Documentary → Wander**: User is listening to documentary segment 2 in "Documentary" mode, then clicks the "Wander the City" tab. Expected: documentary audio stops immediately. Actual: documentary audio continues playing while wander audio also starts.

- **Rapid mode switching**: User switches from Wander → Documentary → Wander quickly. Expected: each mode switch stops the previous audio immediately. Actual: multiple audio streams accumulate and play simultaneously.

- **Edge case - mode switch during loading**: User switches modes while the previous mode is still loading audio. Expected: loading aborts and no audio plays from the previous mode. Actual: loading completes and audio starts playing even though the mode is no longer active.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Audio playback within a single mode must continue to work exactly as before (sequencing, gaps, transitions)
- The play/pause toggle button must continue to pause and resume audio correctly without stopping or resetting playback
- Playlist completion in useAudioPostcard must continue to stop playback and reset state correctly
- Documentary completion (all 4 segments) in useDocumentary must continue to stop playback and reset state correctly
- Existing cleanup on unmount or new generation (abort controllers, URL revocation, timers) must continue to work correctly
- Error handling and retry functionality must remain unchanged

**Scope:**
All inputs that do NOT involve mode switching (null inputs to hooks) should be completely unaffected by this fix. This includes:
- Normal playback when city/era/voice inputs are provided
- Pause/resume via the toggle button
- Playlist advancement and completion
- Error states and retry logic
- Component unmount cleanup

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Null-Input Detection**: Both hooks' main useEffect dependencies include `city`, `era`, and (for documentary) `voice`, but they do not have early-return logic that stops audio when these inputs become null.

2. **Cleanup Only on New Generation**: The existing cleanup logic in both hooks runs when a new generation starts (new city/era/voice) or on unmount, but not when inputs transition from valid → null.

3. **CityPanel Design Pattern**: The CityPanel component intentionally passes null to the inactive hook to prevent unnecessary API calls, but this pattern assumes the hooks will handle null inputs by stopping playback.

4. **Audio Ref Persistence**: The audio element refs (`sceneAudioRef`, `ambientRef`, `audioRef`) persist across renders, so they continue playing even when the hook's inputs become null and the hook "does nothing" in that render.

## Correctness Properties

Property 1: Bug Condition - Mode Switch Stops Previous Audio

_For any_ mode switch where the user changes from one mode to another and audio is currently playing in the previous mode, the inactive hook SHALL immediately pause and reset its audio elements when it receives null inputs, ensuring no audio from the previous mode continues playing.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Mode-Switch Behavior

_For any_ audio playback scenario that does NOT involve mode switching (normal playback, pause/resume, completion, errors), the hooks SHALL produce exactly the same behavior as the original code, preserving all existing functionality for playlist sequencing, progressive loading, cleanup, and state management.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/hooks/useAudioPostcard.ts`

**Function**: `useAudioPostcard` (main useEffect)

**Specific Changes**:
1. **Add Early-Return Null Check**: At the beginning of the main useEffect (after the existing cleanup on unmount), add a check: if `!city || !era`, then pause both audio refs, abort any in-flight requests, clear any pending timers, reset state, and return early.

2. **Audio Cleanup**: Call `sceneAudioRef.current.pause()` and `ambientRef.current.pause()` to stop playback immediately.

3. **Timer Cleanup**: Clear `playlistTimerRef.current` if it exists to prevent delayed playback from starting.

4. **Abort In-Flight Requests**: Call `abortRef.current?.abort()` to cancel any ongoing API calls.

5. **State Reset**: Set `isLoading(false)`, `isPlaying(false)`, `error(null)`, `scene(null)` to reset UI state.

**File**: `src/hooks/useDocumentary.ts`

**Function**: `useDocumentary` (main useEffect)

**Specific Changes**:
1. **Add Early-Return Null Check**: At the beginning of the main useEffect, add a check: if `!city || !era || !voice`, then pause the audio ref, abort any in-flight requests, clear any pending intervals, reset state, and return early.

2. **Audio Cleanup**: Call `audioRef.current.pause()` to stop playback immediately.

3. **Interval Cleanup**: Clear `waitIntervalRef.current` if it exists to prevent polling from continuing.

4. **Abort In-Flight Requests**: Call `abortRef.current?.abort()` to cancel any ongoing API calls.

5. **State Reset**: Set `isLoading(false)`, `isPlaying(false)`, `error(null)`, `segments(null)` to reset UI state.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate mode switching scenarios and assert that audio from the previous mode stops playing. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Wander → Documentary Switch**: Start playing wander audio, switch to documentary mode, assert wander audio is paused (will fail on unfixed code)
2. **Documentary → Wander Switch**: Start playing documentary audio, switch to wander mode, assert documentary audio is paused (will fail on unfixed code)
3. **Rapid Mode Switching**: Switch modes multiple times quickly, assert only one audio stream is playing at any time (will fail on unfixed code)
4. **Mode Switch During Loading**: Switch modes while audio is still loading, assert no audio plays from the previous mode (may fail on unfixed code)

**Expected Counterexamples**:
- Audio elements continue playing after mode switch
- Multiple audio streams play simultaneously
- Possible causes: missing null-input detection, no cleanup on null transition, persistent audio refs

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleModeSwitch_fixed(input)
  ASSERT expectedBehavior(result)
  // expectedBehavior: previous mode's audio is paused and stopped
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalHook(input) = fixedHook(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-mode-switch scenarios

**Test Plan**: Observe behavior on UNFIXED code first for normal playback, pause/resume, and completion scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Normal Playback Preservation**: Observe that wander mode plays scene audio + ambient correctly on unfixed code, then write test to verify this continues after fix
2. **Documentary Progression Preservation**: Observe that documentary mode plays all 4 segments with prefetching on unfixed code, then write test to verify this continues after fix
3. **Pause/Resume Preservation**: Observe that toggle button pauses and resumes correctly on unfixed code, then write test to verify this continues after fix
4. **Completion Preservation**: Observe that playlist/documentary completion stops playback correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test mode switch from wander to documentary stops wander audio
- Test mode switch from documentary to wander stops documentary audio
- Test rapid mode switching stops all previous audio
- Test mode switch during loading aborts and stops audio
- Test that normal playback within a mode continues to work
- Test that pause/resume continues to work after fix
- Test that playlist completion continues to work after fix

### Property-Based Tests

- Generate random mode switch sequences and verify only one audio stream plays at a time
- Generate random playback scenarios (play, pause, resume, complete) and verify behavior is unchanged
- Test that all state transitions (loading, playing, paused, error) work correctly across many scenarios

### Integration Tests

- Test full user flow: select city → play wander audio → switch to documentary → verify only documentary plays
- Test full user flow: select city → play documentary → switch to wander → verify only wander plays
- Test that visual feedback (play/pause button, waveform, status text) updates correctly on mode switch
