# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Non-`---` Separator Parsing Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in the single-strategy parser
  - **Scoped PBT Approach**: Scope the property to the four concrete failing separator variants for reproducibility
  - Extract the parsing logic from `generateDocumentaryScript` into a testable unit (or test via the exported function with a mocked Groq client)
  - Test case 1 — triple-newline separator: `"Text A\n\n\nText B\n\n\nText C\n\n\nText D"` → current parser throws `"Documentary script generation returned fewer than 2 segments. Please retry."`
  - Test case 2 — numbered headings: `"1. Text A\n\n2. Text B\n\n3. Text C\n\n4. Text D"` → current parser throws
  - Test case 3 — bold markdown labels: `"**World Context**\nText A\n\n**The City**\nText B\n\n**Events**\nText C\n\n**Daily Life**\nText D"` → current parser throws
  - Test case 4 — single continuous block (no separator): `"All four segments merged into one long paragraph without any separator between them at all."` → current parser throws
  - The test assertions should match the Expected Behavior Properties from design: `result.length >= 2` and no error thrown
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: All four test cases FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `"Text A\n\n\nText B\n\n\nText C\n\n\nText D"` throws instead of returning 4 segments)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Well-Formed `---` Responses Are Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for inputs where `isBugCondition(X)` is `false` (i.e., response already splits cleanly on `---`)
  - Observe: `"A\n---\nB\n---\nC\n---\nD"` returns `["A", "B", "C", "D"]` on unfixed code
  - Observe: `"A\n  ---  \nB\n---\nC\n---\nD"` (whitespace variants) returns 4 segments on unfixed code
  - Observe: `"A\n---\nB"` (only 2 segments) returns `["A", "B", "B", "B"]` after padding on unfixed code
  - Observe: `""` (empty response) throws `"Documentary script generation returned an empty response."` on unfixed code
  - Write property-based test: for all strings containing ≥ 2 non-empty parts separated by `---`, the fixed parser returns the same segments as the original parser (from Preservation Requirements in design)
  - Write unit test: empty response still throws the empty-response error
  - Write unit test: 2-segment `---` response is padded to 4 by repeating the last segment
  - Write unit test: 3-segment `---` response is padded to 4 by repeating the last segment
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for non-`---` separator parsing in `generateDocumentaryScript`

  - [x] 3.1 Harden the Groq prompt (reinforce `---` separator)
    - Update the system message in `generateDocumentaryScript` to explicitly name `---` as the only permitted separator and repeat the constraint:
      `"You are a documentary narrator. Write in a clear, engaging documentary style. You MUST separate the 4 segments using only '---' on its own line. Do not use numbered headings, bold labels, or any other separator. Output only the 4 segments separated by '---', nothing else."`
    - Update the user message to add a reinforcing instruction at the end:
      `"IMPORTANT: Separate each segment with '---' on its own line. Do not add any labels, headings, or numbering. Use ONLY '---' as the separator."`
    - _Bug_Condition: isBugCondition(X) where X.split(/\s*---\s*/).filter(s => s.trim().length > 0).length < 2_
    - _Expected_Behavior: Prompt hardening reduces frequency of non-conforming LLM responses_
    - _Preservation: System and user message changes must not alter the model, max_tokens, or any other API parameter_
    - _Requirements: 2.4_

  - [x] 3.2 Add `stripSegmentLabel()` helper function
    - Add a pure helper function `stripSegmentLabel(segment: string): string` above `generateDocumentaryScript` in `documentaryService.ts`
    - Remove bold heading on its own line: `.replace(/^\s*\*\*[^*]+\*\*\s*\n?/, '')`
    - Remove numbered or named prefixes: `.replace(/^\s*(?:Segment\s+)?\d+[.:]\s*/i, '')`
    - Call `.trim()` before returning
    - _Bug_Condition: isBugCondition(X) — segments returned by alternative strategies may carry label prefixes_
    - _Expected_Behavior: stripSegmentLabel("Segment 1: Text") → "Text"; stripSegmentLabel("**World Context**\nText") → "Text"; stripSegmentLabel("1. Text") → "Text"_
    - _Preservation: stripSegmentLabel must be a no-op on clean segment text (no label prefix)_
    - _Requirements: 2.3_

  - [x] 3.3 Replace single-strategy parser with multi-strategy cascade (4 strategies)
    - Extract a `parseSegments(content: string): string[]` function that encapsulates the cascade logic
    - Strategy 1 (primary): `content.split(/\s*---+\s*/)` — handles `---` and whitespace variants
    - Strategy 2: `content.split(/\n{3,}/)` — handles triple-newline separators
    - Strategy 3: `content.split(/\n(?=\s*(?:\d+\.|Segment\s+\d+\s*:))/i)` — handles numbered headings
    - Strategy 4: `content.split(/\n(?=\s*\*\*[^*]+\*\*)/)` — handles bold markdown headings
    - For each strategy: apply `stripSegmentLabel`, `.trim()`, and `.filter(s => s.length > 0)`; if result has ≥ 2 segments, return `.slice(0, 4)` immediately (short-circuit)
    - Only throw `"Documentary script generation returned fewer than 2 segments. Please retry."` after all four strategies are exhausted
    - Replace the existing `content.split(/\s*---\s*/)` block in `generateDocumentaryScript` with a call to `parseSegments(content)`
    - _Bug_Condition: isBugCondition(X) where X.split(/\s*---\s*/).filter(s => s.trim().length > 0).length < 2_
    - _Expected_Behavior: parseSegments(X).length >= 2 for any X using triple-newlines, numbered headings, or bold labels as separators_
    - _Preservation: When Strategy 1 succeeds (isBugCondition is false), Strategies 2–4 are never attempted and output is identical to original_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Non-`---` Separator Parsing Failure
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `result.length >= 2` and no error thrown for all four non-`---` separator variants
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: All four test cases PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Well-Formed `---` Responses Are Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm well-formed `---` responses, padding behavior, and empty-response error are all unchanged after fix

- [x] 4. Build verification
  - Run `npx tsc --noEmit` to confirm no TypeScript errors were introduced by the new `parseSegments` and `stripSegmentLabel` functions
  - Run the full test suite with `npx vitest run` to confirm all tests pass
  - Ensure all tests pass; ask the user if questions arise
