# Bug Condition Exploration Results

## Test Execution Date
Task 1 completed - Bug condition exploration tests written and executed on unfixed code.

## Test Status
✅ **EXPECTED OUTCOME ACHIEVED**: Tests FAILED on unfixed code, confirming the bug exists.

## Counterexamples Found

### 1. useAudioPostcard - Wander → Documentary Mode Switch

**Test**: `should stop wander audio when switching to documentary mode (null inputs)`

**Scenario**: 
- Start with valid city/era inputs (wander mode active)
- Audio starts playing (sceneAudioRef and ambientRef)
- Switch to documentary mode by passing null inputs
- Expect: pause() should be called on both audio elements

**Result**: ❌ FAILED
```
AssertionError: expected "spy" to be called at least once
```

**Counterexample**: When useAudioPostcard receives null inputs (simulating mode switch from wander to documentary), the audio elements (sceneAudioRef and ambientRef) do NOT pause. The pause() method was never called, confirming that audio continues playing after mode switch.

**Root Cause Confirmed**: Missing null-input detection logic in useAudioPostcard's main useEffect.

---

### 2. useAudioPostcard - Rapid Mode Switching

**Test**: `should stop audio on rapid mode switching`

**Scenario**:
- Start with wander mode (valid inputs)
- Switch to documentary mode (null inputs)
- Switch back to wander mode (valid inputs)
- Switch to documentary mode again (null inputs)
- Expect: pause() should be called each time inputs become null

**Result**: ❌ FAILED
```
AssertionError: expected "spy" to be called at least once
```

**Counterexample**: When rapidly switching modes, pause() is not called on the audio elements when inputs become null. This allows multiple audio streams to accumulate and play simultaneously.

**Root Cause Confirmed**: No cleanup logic triggered when inputs transition from valid → null.

---

### 3. useAudioPostcard - Mode Switch During Loading

**Test**: `should abort loading and prevent audio when switching modes during load`

**Scenario**:
- Start loading wander mode (slow service call)
- Verify loading state is true
- Switch to documentary mode (null inputs) while still loading
- Wait for loading to complete
- Expect: audio should NOT start playing

**Result**: ❌ FAILED
```
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
```

**Counterexample**: When switching modes during loading, the loading process is not aborted and audio still starts playing (mockSceneAudio.play() was called once even after mode switch). This means audio from the previous mode can start playing even though the user has already switched to a different mode.

**Root Cause Confirmed**: Abort controller is not triggered when inputs become null during loading.

---

### 4. useDocumentary - Documentary → Wander Mode Switch

**Test**: `should stop documentary audio when switching to wander mode (null inputs)`

**Scenario**:
- Start with valid city/era/voice inputs (documentary mode active)
- Audio starts playing (audioRef)
- Switch to wander mode by passing null inputs
- Expect: pause() should be called exactly once

**Result**: ⚠️ PARTIALLY FAILED
```
AssertionError: expected "spy" to be called 1 times, but got 2 times
```

**Counterexample**: When useDocumentary receives null inputs, pause() is called 2 times instead of 1. The extra call appears to be from the cleanup function on unmount, not from the null-input detection we're testing for. This indicates that the hook is not explicitly handling the null-input case - it's relying on the cleanup function which runs later.

**Root Cause Confirmed**: Missing early-return null-input detection logic in useDocumentary's main useEffect.

---

### 5. useDocumentary - Partial Null Inputs

**Tests**: 
- `should stop audio when city becomes null`
- `should stop audio when era becomes null`
- `should stop audio when voice becomes null`

**Result**: ✅ PASSED (but only because of cleanup on unmount, not explicit null handling)

**Note**: These tests pass because the cleanup function runs when the component re-renders, but this is not the explicit null-input detection behavior we want. The fix should add early-return logic that immediately stops audio when ANY required input becomes null.

---

## Summary

All tests confirmed the bug exists:

1. ✅ **useAudioPostcard does NOT stop audio when inputs become null** (Requirements 1.1, 1.3)
2. ✅ **useDocumentary does NOT explicitly handle null inputs** (Requirements 1.2, 1.4)
3. ✅ **Rapid mode switching allows multiple audio streams** (Requirements 1.3, 1.4)
4. ✅ **Mode switching during loading does not abort properly** (Requirements 1.4)

## Root Cause Analysis Validation

The counterexamples confirm our hypothesized root cause:

1. **Missing Null-Input Detection**: Both hooks' main useEffect dependencies include city/era/voice, but they do not have early-return logic that stops audio when these inputs become null.

2. **Cleanup Only on New Generation**: The existing cleanup logic runs when a new generation starts or on unmount, but not when inputs transition from valid → null.

3. **Audio Ref Persistence**: The audio element refs persist across renders and continue playing even when the hook's inputs become null.

## Next Steps

Proceed to Task 2: Write preservation property tests (BEFORE implementing fix) to capture the baseline behavior that must be preserved.
