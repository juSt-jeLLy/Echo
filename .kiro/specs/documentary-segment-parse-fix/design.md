# Documentary Segment Parse Fix — Bugfix Design

## Overview

The `generateDocumentaryScript` function in `documentaryService.ts` calls the Groq LLM (`llama-3.1-8b-instant`) and splits the response on `/\s*---\s*/` to extract 4 narration segments. The LLM does not reliably use `---` as a separator — it may use triple newlines, numbered headings, bold markdown labels, or omit separators entirely. When the single-strategy parser yields fewer than 2 segments it throws, causing the user to see an error every time the model deviates from the expected format.

The fix has two parts:
1. **Prompt hardening** — add explicit, reinforced instructions so the model uses `---` more consistently.
2. **Multi-strategy parser** — try four splitting strategies in priority order; only throw if every strategy yields fewer than 2 segments. Strip any residual segment labels before returning.

Only `src/services/documentaryService.ts` needs to change.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the raw LLM response cannot be split into ≥ 2 non-empty segments using only `/\s*---\s*/`.
- **Property (P)**: The desired behavior when the bug condition holds — the multi-strategy parser SHALL return ≥ 2 segments without throwing.
- **Preservation**: All existing behavior for inputs where the bug condition does NOT hold (i.e., the response already splits cleanly on `---`) must remain unchanged.
- **`generateDocumentaryScript`**: The function in `src/services/documentaryService.ts` that calls Groq and returns an array of 4 segment strings.
- **`isBugCondition(X)`**: Returns `true` when `X.split(/\s*---\s*/).filter(s => s.trim().length > 0).length < 2`.
- **Strategy cascade**: The ordered list of four splitting strategies tried in sequence until one yields ≥ 2 segments.
- **Label stripping**: Removing segment prefixes such as `Segment 1:`, `1.`, `**World Context**` from the start of each segment string before returning.

---

## Bug Details

### Bug Condition

The bug manifests when the Groq LLM returns a response that does not use `---` as a separator between segments. The `generateDocumentaryScript` function only splits on `/\s*---\s*/`, so any deviation causes it to see fewer than 2 segments and throw.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type string (raw LLM response content)
  OUTPUT: boolean

  segments ← X.split(/\s*---\s*/).filter(s => s.trim().length > 0)
  RETURN segments.length < 2
END FUNCTION
```

### Examples

- **Triple-newline separator**: LLM returns `"Segment A text\n\n\nSegment B text\n\n\nSegment C text\n\n\nSegment D text"` → current parser sees 1 segment → throws. Fixed parser uses Strategy 2 and returns 4 segments.
- **Numbered headings**: LLM returns `"1. World context text\n\n2. City text\n\n3. Events text\n\n4. Daily life text"` → current parser sees 1 segment → throws. Fixed parser uses Strategy 3 and returns 4 clean segments (labels stripped).
- **Bold markdown labels**: LLM returns `"**World Context**\nText...\n\n**The City**\nText..."` → current parser sees 1 segment → throws. Fixed parser uses Strategy 4 and returns segments with bold labels stripped.
- **Correct `---` format**: LLM returns `"Text A\n---\nText B\n---\nText C\n---\nText D"` → bug condition does NOT hold → Strategy 1 succeeds → behavior unchanged.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When the LLM response already splits cleanly on `---`, the function SHALL continue to return exactly those segments (Strategy 1 succeeds, no other strategy is tried).
- When all strategies yield fewer than 2 segments, the function SHALL continue to throw `"Documentary script generation returned fewer than 2 segments. Please retry."`.
- When fewer than 4 but at least 2 segments are parsed, the function SHALL continue to pad the array to 4 by repeating the last segment.
- When the LLM returns an empty response, the function SHALL continue to throw `"Documentary script generation returned an empty response."`.
- When an `AbortSignal` is provided and aborted, the function SHALL continue to throw an `AbortError`.
- Parsed segments SHALL continue to be passed to `synthesiseSegment` and `synthesiseDocumentaryAudio` unchanged (beyond label stripping).

**Scope:**
All inputs where `isBugCondition(X)` is `false` (i.e., the response splits cleanly on `---`) are completely unaffected by this fix. The only behavioral change is for inputs where the current parser fails but an alternative strategy succeeds.

---

## Hypothesized Root Cause

Based on the bug description and the current prompt, the most likely causes are:

1. **Insufficient prompt emphasis on separator format**: The current prompt mentions `---` once in the system message and once in the user message, but does not reinforce it strongly enough. The model treats it as a suggestion rather than a strict requirement.

2. **Model tendency to use markdown formatting**: `llama-3.1-8b-instant` frequently applies markdown conventions (numbered lists, bold headings) when generating structured content, overriding plain-text separator instructions.

3. **Single-strategy parser with no fallback**: The parser has no recovery path when the model deviates. A single regex split is the only attempt before throwing.

4. **No label-stripping logic**: Even when the model follows the separator instruction, it sometimes prefixes segments with labels (`Segment 1:`, `**World Context**`) despite being told not to, and the current code passes those labels through to TTS verbatim.

---

## Correctness Properties

Property 1: Bug Condition — Multi-Strategy Parser Recovers Non-`---` Responses

_For any_ raw LLM response `X` where `isBugCondition(X)` is `true` (i.e., splitting on `---` yields fewer than 2 segments), the fixed `generateDocumentaryScript` function SHALL attempt the remaining strategies in order and, if any strategy yields ≥ 2 segments, SHALL return those segments without throwing an error.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Correct `---` Responses Are Unaffected

_For any_ raw LLM response `X` where `isBugCondition(X)` is `false` (i.e., splitting on `---` already yields ≥ 2 segments), the fixed `generateDocumentaryScript` function SHALL produce the same parsed segments as the original function, preserving all existing behavior for well-formed responses.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

**File**: `src/services/documentaryService.ts`

**Function**: `generateDocumentaryScript`

#### 1. Prompt Hardening (system + user messages)

Update the system message to explicitly name `---` as the only permitted separator and repeat the constraint:

```
"You are a documentary narrator. Write in a clear, engaging documentary style.
You MUST separate the 4 segments using only '---' on its own line. Do not use
numbered headings, bold labels, or any other separator. Output only the 4 segments
separated by '---', nothing else."
```

Update the user message to reinforce the separator requirement at the end:

```
"IMPORTANT: Separate each segment with '---' on its own line. Do not add any
labels, headings, or numbering. Use ONLY '---' as the separator."
```

#### 2. Multi-Strategy Parser

Replace the single `content.split(/\s*---\s*/)` call with a strategy cascade function:

```
FUNCTION parseSegments(content)
  INPUT: content of type string
  OUTPUT: string[] (≥ 2 segments) or throws

  strategies ← [
    // Strategy 1: split on --- (current, primary)
    () => content.split(/\s*---+\s*/),

    // Strategy 2: split on triple newlines
    () => content.split(/\n{3,}/),

    // Strategy 3: split on numbered headings (1., 2., Segment 1:, etc.)
    () => content.split(/\n(?=\s*(?:\d+\.|Segment\s+\d+\s*:))/i),

    // Strategy 4: split on bold markdown headings (**...**)
    () => content.split(/\n(?=\s*\*\*[^*]+\*\*)/)
  ]

  FOR EACH strategy IN strategies DO
    segments ← strategy()
                 .map(s => stripSegmentLabel(s).trim())
                 .filter(s => s.length > 0)
    IF segments.length >= 2 THEN
      RETURN segments.slice(0, 4)
    END IF
  END FOR

  THROW "Documentary script generation returned fewer than 2 segments. Please retry."
END FUNCTION
```

#### 3. Label Stripping

Add a `stripSegmentLabel` helper that removes common prefixes from the start of a segment:

```
FUNCTION stripSegmentLabel(segment)
  INPUT: segment of type string
  OUTPUT: string with leading label removed

  // Remove patterns like: "Segment 1:", "1.", "**World Context**", "**Segment 1:**"
  RETURN segment
    .replace(/^\s*\*\*[^*]+\*\*\s*\n?/, '')   // bold heading on its own line
    .replace(/^\s*(?:Segment\s+)?\d+[.:]\s*/i, '') // "1." or "Segment 1:"
    .trim()
END FUNCTION
```

#### 4. Only Throw After All Strategies Exhausted

The error `"Documentary script generation returned fewer than 2 segments. Please retry."` is only thrown after all four strategies have been tried and none yielded ≥ 2 segments. All other error paths (empty response, AbortError) remain unchanged.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on the unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that pass non-`---`-separated strings directly to the parsing logic and assert that the current single-strategy parser throws. Run these on the UNFIXED code to observe failures.

**Test Cases**:
1. **Triple-newline response**: Pass `"Text A\n\n\nText B\n\n\nText C\n\n\nText D"` to the parser — will throw on unfixed code.
2. **Numbered heading response**: Pass `"1. Text A\n\n2. Text B\n\n3. Text C\n\n4. Text D"` to the parser — will throw on unfixed code.
3. **Bold label response**: Pass `"**World Context**\nText A\n\n**The City**\nText B"` to the parser — will throw on unfixed code.
4. **Single-block response**: Pass a single continuous paragraph — will throw on unfixed code.

**Expected Counterexamples**:
- All four test cases throw `"Documentary script generation returned fewer than 2 segments. Please retry."` on unfixed code, confirming the single-strategy parser is the root cause.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces ≥ 2 segments without throwing.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result ← parseSegments(X)   // fixed multi-strategy parser
  ASSERT result.length >= 2
  ASSERT no_error_thrown
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT parseSegments_original(X) = parseSegments_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many `---`-separated inputs automatically and verifies the fixed parser produces identical output to the original for all of them.

**Test Cases**:
1. **Well-formed `---` response**: Verify `"A\n---\nB\n---\nC\n---\nD"` returns the same 4 segments in both original and fixed parsers.
2. **Whitespace variants around `---`**: Verify `"A\n  ---  \nB\n---\nC\n---\nD"` is handled identically.
3. **Fewer than 4 but ≥ 2 segments**: Verify padding to 4 still occurs after fix.
4. **Empty response**: Verify the empty-response error is still thrown.

### Unit Tests

- Test `parseSegments` with each of the four separator variants (one per strategy).
- Test `stripSegmentLabel` with each label pattern: `"Segment 1:"`, `"1."`, `"**World Context**"`, `"**Segment 1:**"`.
- Test that Strategy 1 short-circuits (Strategy 2–4 are not attempted) when `---` splitting succeeds.
- Test that all four strategies failing still throws the correct error message.
- Test padding: 2 segments → padded to 4; 3 segments → padded to 4.

### Property-Based Tests

- Generate random strings containing `---` separators and verify the fixed parser returns the same segments as the original parser (preservation property).
- Generate random strings using each non-`---` separator pattern and verify the fixed parser returns ≥ 2 segments without throwing (fix property).
- Generate random segment content with and without label prefixes and verify `stripSegmentLabel` removes only the label, not the content.

### Integration Tests

- Mock the Groq API to return a triple-newline-separated response and verify `generateDocumentaryScript` returns 4 segments and does not throw.
- Mock the Groq API to return a numbered-heading response and verify labels are stripped from the returned segments.
- Mock the Groq API to return a well-formed `---` response and verify behavior is identical to the pre-fix implementation.
- Mock the Groq API to return a single-block response (no separators) and verify the function still throws after all strategies are exhausted.
