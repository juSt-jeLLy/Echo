# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - API Failures on Long Text and Rate Limiting
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that `generateAmbientSoundscape` with text > 450 characters triggers 400 validation error (from Bug Condition in design)
  - Test that API calls receiving 429 errors fail immediately without retry attempts (from Bug Condition in design)
  - Mock ElevenLabs API to return 400 error for long text and 429 error for rate limiting scenarios
  - The test assertions should match the Expected Behavior Properties from design: truncation to 450 chars and retry with exponential backoff
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "generateAmbientSoundscape with 500-char text returns null with 400 error instead of truncating and succeeding")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Input Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (text ≤ 450 chars, successful API calls)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that soundscape prompts ≤ 450 characters are sent without modification (from Preservation Requirements 3.1)
  - Test that successful API calls process responses immediately without delays (from Preservation Requirements 3.2)
  - Test that abort signals cancel requests and return null correctly (from Preservation Requirements 3.5)
  - Test that audio sequencing (intro, scene lines, ambient) remains correct (from Preservation Requirements 3.3)
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for ElevenLabs API error handling

  - [x] 3.1 Add text truncation helper function
    - Create `truncateForSoundGeneration(text: string, maxLength: number = 450): string` in `src/services/elevenLabsService.ts`
    - Truncate at word boundaries when possible to avoid cutting mid-word
    - Log a warning when truncation occurs
    - Return truncated text that is ≤ maxLength characters
    - _Bug_Condition: isBugCondition(input) where input.text.length > 450_
    - _Expected_Behavior: Text is truncated to 450 characters before API call_
    - _Preservation: Text ≤ 450 characters passes through unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Add retry with exponential backoff helper function
    - Create `retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T>` in `src/services/elevenLabsService.ts`
    - Implement exponential backoff delays: 1s, 2s, 4s between retry attempts
    - Only retry on 429 errors, throw immediately for other errors
    - Check abort signal between retries to allow cancellation
    - Return result on success or throw after max retries exhausted
    - _Bug_Condition: isBugCondition(input) where input.responseStatus == 429 AND input.retryAttempts == 0_
    - _Expected_Behavior: Retry with exponential backoff up to 3 attempts_
    - _Preservation: Successful API calls complete immediately without retry delays_
    - _Requirements: 2.2, 3.2_

  - [x] 3.3 Update generateAmbientSoundscape with truncation and retry
    - Apply `truncateForSoundGeneration` to `descriptor` parameter before API call
    - Wrap API call in `retryWithBackoff` to handle 429 errors
    - Preserve existing abort signal handling and error logging
    - Maintain null return behavior on failure for backward compatibility
    - _Bug_Condition: isBugCondition(input) where input.text.length > 450 OR input.responseStatus == 429_
    - _Expected_Behavior: Truncate text and retry 429 errors with exponential backoff_
    - _Preservation: Valid inputs (≤450 chars, no 429) produce identical results_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

  - [x] 3.4 Update synthesiseIntro with retry logic
    - Wrap API call in `retryWithBackoff` to handle 429 errors
    - Preserve existing abort signal handling and error logging
    - Maintain null return behavior on failure for backward compatibility
    - No text truncation needed (intro text is controlled and short)
    - _Bug_Condition: isBugCondition(input) where input.responseStatus == 429_
    - _Expected_Behavior: Retry 429 errors with exponential backoff_
    - _Preservation: Successful API calls complete immediately without retry delays_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.5 Update synthesiseSceneLines with retry logic
    - Wrap individual API calls within the `Promise.all` in `retryWithBackoff`
    - Preserve existing parallel processing behavior
    - Preserve existing abort signal handling and error logging
    - Maintain null return behavior on failure for backward compatibility
    - _Bug_Condition: isBugCondition(input) where input.responseStatus == 429_
    - _Expected_Behavior: Retry 429 errors with exponential backoff_
    - _Preservation: Successful API calls complete immediately without retry delays_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.6 Improve error messages
    - Enhance error handling to distinguish error types (429, 400, network errors)
    - Provide actionable error messages in console warnings
    - Update catch blocks in all three API functions to log specific error types
    - Maintain existing null return behavior for backward compatibility
    - _Bug_Condition: isBugCondition(input) where API errors occur_
    - _Expected_Behavior: Specific error messages distinguish between error types_
    - _Preservation: Error handling for non-429/400 errors remains unchanged_
    - _Requirements: 1.4, 2.3_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - API Succeeds with Truncation and Retry
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that long text is truncated to 450 characters before API call
    - Verify that 429 errors trigger retry with exponential backoff
    - Verify that API calls succeed after truncation and retry logic
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Input Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - Verify soundscape prompts ≤ 450 characters are sent without modification
    - Verify successful API calls process responses immediately
    - Verify abort signals still cancel requests correctly
    - Verify audio sequencing remains correct

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests to verify bug is fixed and no regressions introduced
  - Verify text truncation works correctly for various text lengths
  - Verify retry logic handles 429 errors with exponential backoff
  - Verify preservation of existing behavior for valid inputs
  - Verify error messages are specific and actionable
  - If any issues arise, ask the user for guidance
