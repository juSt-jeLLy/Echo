# ElevenLabs API Error Handling Bugfix Design

## Overview

This bugfix addresses critical API errors in the audio postcard generation system when interacting with ElevenLabs endpoints. The system currently fails when soundscape prompts exceed 450 characters (400 validation errors) and when parallel API calls trigger rate limiting (429 errors). The fix implements text truncation for soundscape prompts, exponential backoff retry logic for 429 errors, improved error messages, and request throttling to prevent rate limits. The approach focuses on minimal changes to `elevenLabsService.ts` to add defensive validation and resilient retry mechanisms.

## Glossary

- **Bug_Condition (C)**: The condition that triggers API failures - when soundscape prompts exceed 450 characters OR when parallel API calls trigger 429 rate limiting errors
- **Property (P)**: The desired behavior - API calls should succeed with truncated text and automatic retries with exponential backoff
- **Preservation**: Existing audio generation behavior for valid inputs, playback sequencing, and abort signal handling that must remain unchanged
- **synthesiseIntro**: The function in `src/services/elevenLabsService.ts` that generates TTS intro clips using the George voice
- **generateAmbientSoundscape**: The function in `src/services/elevenLabsService.ts` that generates loopable ambient soundscapes from text descriptions
- **synthesiseSceneLines**: The function in `src/services/elevenLabsService.ts` that synthesizes multiple SceneLine segments with assigned voices in parallel
- **Exponential Backoff**: A retry strategy where wait time increases exponentially between retry attempts (e.g., 1s, 2s, 4s, 8s)
- **Rate Limiting (429)**: HTTP status code indicating too many requests sent to the API in a given timeframe
- **Validation Error (400)**: HTTP status code indicating the request was malformed or violated API constraints

## Bug Details

### Bug Condition

The bug manifests when the ElevenLabs API receives requests that violate its constraints. The `generateAmbientSoundscape` function sends text prompts that may exceed the 450 character limit, and all three API functions (`synthesiseIntro`, `generateAmbientSoundscape`, `synthesiseSceneLines`) make parallel calls that can trigger rate limiting without retry logic.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type APIRequest
  OUTPUT: boolean
  
  RETURN (input.endpoint == '/v1/sound-generation' 
          AND input.text.length > 450)
         OR (input.responseStatus == 429 
             AND input.retryAttempts == 0)
END FUNCTION
```

### Examples

- **Soundscape Text Overflow**: `generateAmbientSoundscape("A bustling medieval marketplace with merchants shouting their wares, the clang of blacksmiths hammering metal, horses neighing, cart wheels creaking on cobblestones, children laughing and playing, the smell of fresh bread from nearby bakeries, distant church bells ringing, dogs barking, the rustle of fabric as people browse colorful textiles, the splash of water from a central fountain, pigeons cooing on rooftops, and the general hum of hundreds of conversations blending together in the warm afternoon air...")` - Text exceeds 450 chars, API returns 400 validation error
- **Parallel Rate Limiting**: When `useAudioPostcard` calls `Promise.all([synthesiseIntro(...), synthesiseSceneLines(...), generateAmbientSoundscape(...)])`, multiple concurrent requests trigger 429 rate limit error
- **Single 429 Error**: Any individual API call receives 429 response, function immediately returns null without retry
- **Edge Case - Exactly 450 chars**: Text with exactly 450 characters should pass through without truncation

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Soundscape prompts of 450 characters or less must continue to be sent to the API without modification
- API calls that succeed on the first attempt must continue to process responses immediately without unnecessary delays
- Audio generation completion must continue to play intro, scene lines, and ambient soundscape in the correct sequence
- Play/pause controls must continue to respond correctly to toggle and retry actions
- AbortController signals must continue to cancel in-flight requests and clean up resources properly
- Object URL creation and revocation for memory management must continue to work correctly
- Null return values on failure must continue to be handled by calling code

**Scope:**
All inputs that do NOT involve text exceeding 450 characters or 429 rate limiting errors should be completely unaffected by this fix. This includes:
- Successful API calls with valid text lengths
- API calls that fail for other reasons (network errors, authentication errors, etc.)
- Abort signal handling and cleanup logic
- Blob creation and URL generation logic

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Text Validation**: The `generateAmbientSoundscape` function does not validate or truncate the `descriptor` parameter before sending it to the `/v1/sound-generation` endpoint, which has a 450 character limit

2. **No Retry Logic**: None of the three API functions (`synthesiseIntro`, `generateAmbientSoundscape`, `synthesiseSceneLines`) implement retry logic when receiving 429 rate limiting errors - they immediately fail and return null

3. **Generic Error Handling**: The catch blocks in all three functions use generic error handling that doesn't distinguish between error types (429 vs 400 vs network errors), making it impossible to implement targeted retry strategies

4. **Parallel Request Overload**: The `useAudioPostcard` hook calls all three API functions in parallel via `Promise.all`, which can easily trigger rate limits when multiple requests hit the API simultaneously without throttling

## Correctness Properties

Property 1: Bug Condition - Text Truncation and Retry Logic

_For any_ API request where the soundscape text exceeds 450 characters OR a 429 rate limiting error occurs, the fixed functions SHALL truncate text to 450 characters before sending and SHALL retry 429 errors with exponential backoff (1s, 2s, 4s delays) up to 3 attempts, ultimately succeeding or failing with a specific error message.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Valid Input Behavior

_For any_ API request where the text is 450 characters or less AND no 429 errors occur, the fixed functions SHALL produce exactly the same behavior as the original functions, preserving immediate response processing, audio sequencing, abort handling, and memory management.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/services/elevenLabsService.ts`

**Specific Changes**:

1. **Add Text Truncation Helper**: Create a utility function to safely truncate text to 450 characters
   - Function: `truncateForSoundGeneration(text: string, maxLength: number = 450): string`
   - Truncates at word boundaries when possible to avoid cutting mid-word
   - Logs a warning when truncation occurs

2. **Add Retry Logic Helper**: Create a utility function to handle exponential backoff retries
   - Function: `retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T>`
   - Implements exponential backoff: 1s, 2s, 4s delays
   - Only retries on 429 errors, throws immediately for other errors
   - Checks abort signal between retries

3. **Update generateAmbientSoundscape**: Apply text truncation before API call
   - Truncate `descriptor` parameter using `truncateForSoundGeneration`
   - Wrap API call in `retryWithBackoff` to handle 429 errors
   - Preserve existing abort signal handling and error logging

4. **Update synthesiseIntro**: Add retry logic for 429 errors
   - Wrap API call in `retryWithBackoff` to handle 429 errors
   - Preserve existing abort signal handling and error logging
   - No text truncation needed (intro text is controlled and short)

5. **Update synthesiseSceneLines**: Add retry logic for 429 errors
   - Wrap individual API calls within the `Promise.all` in `retryWithBackoff`
   - Preserve existing parallel processing behavior
   - Preserve existing abort signal handling and error logging

6. **Improve Error Messages**: Enhance error handling to distinguish error types
   - Catch and log specific error types (429, 400, network errors)
   - Provide actionable error messages in console warnings
   - Maintain existing null return behavior for backward compatibility

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate long text inputs and parallel API calls to observe 400 and 429 errors on the UNFIXED code. Mock the ElevenLabs API to return specific error responses.

**Test Cases**:
1. **Long Soundscape Text Test**: Call `generateAmbientSoundscape` with 500+ character text (will fail with 400 on unfixed code)
2. **Rate Limit Test**: Mock API to return 429 error, call any API function (will fail immediately on unfixed code)
3. **Parallel Request Test**: Call all three functions in parallel multiple times rapidly (may trigger real 429 errors on unfixed code)
4. **Exactly 450 Characters Test**: Call `generateAmbientSoundscape` with exactly 450 characters (should succeed on unfixed code)

**Expected Counterexamples**:
- 400 validation errors when text exceeds 450 characters
- Immediate failure (null return) when 429 errors occur without retry attempts
- Possible causes: missing validation, no retry logic, parallel request overload

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := apiFunction_fixed(input)
  ASSERT result != null OR maxRetriesExceeded
  ASSERT input.text.length <= 450 (if soundscape)
  ASSERT retryAttempts > 0 (if 429 error)
END FOR
```

**Test Cases**:
1. **Truncation Test**: Verify 500-char text is truncated to 450 chars before API call
2. **Retry Success Test**: Mock 429 error on first attempt, success on second - verify retry occurs
3. **Retry Exhaustion Test**: Mock 429 errors on all attempts - verify function returns null after 3 retries
4. **Backoff Timing Test**: Verify exponential backoff delays (1s, 2s, 4s) between retries

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT apiFunction_original(input) = apiFunction_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for valid inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Short Text Preservation**: Verify soundscape generation with <450 char text produces identical results
2. **Successful API Call Preservation**: Verify successful API calls (no 429) complete without retry delays
3. **Abort Signal Preservation**: Verify abort signals still cancel requests and return null
4. **Memory Management Preservation**: Verify object URLs are still created and revoked correctly
5. **Error Handling Preservation**: Verify non-429 errors (network, auth) still return null immediately

### Unit Tests

- Test `truncateForSoundGeneration` with various text lengths (0, 449, 450, 451, 1000 chars)
- Test `retryWithBackoff` with mocked 429 errors and successful retries
- Test `generateAmbientSoundscape` with long text to verify truncation
- Test all three API functions with mocked 429 errors to verify retry logic
- Test abort signal handling during retry delays

### Property-Based Tests

- Generate random text strings of varying lengths (0-1000 chars) and verify soundscape generation handles them correctly
- Generate random sequences of API responses (success, 429, 400, network error) and verify retry logic only applies to 429
- Generate random abort signal timings and verify requests are cancelled correctly across all retry attempts

### Integration Tests

- Test full audio postcard generation flow with long soundscape prompts
- Test parallel API calls with rate limiting simulation
- Test retry exhaustion scenario with user-visible error messages
- Test successful generation after transient 429 errors
