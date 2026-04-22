# Bugfix Requirements Document

## Introduction

When switching from "Wander the City" mode to "Documentary" mode in CityPanel, users intermittently see the error: "Documentary script generation returned fewer than 2 segments. Please retry."

The root cause is that the Groq LLM (`llama-3.1-8b-instant`) does not reliably use the `---` separator between segments. It may instead use `\n\n\n`, `---\n`, numbered headings (`1.`, `Segment 1:`), bold labels (`**World Context**`), or simply omit separators entirely. The current parser in `generateDocumentaryScript` only splits on `\s*---\s*`, so any deviation causes it to see fewer than 2 segments and throw. Additionally, the model sometimes prefixes segment content with labels/headings despite being instructed not to, which pollutes the narration text.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Groq LLM returns 4 documentary segments separated by `\n\n\n` instead of `---` THEN the system throws "Documentary script generation returned fewer than 2 segments. Please retry."

1.2 WHEN the Groq LLM returns 4 documentary segments separated by `---\n` or `\n---` (without surrounding whitespace matching `\s*---\s*`) THEN the system throws "Documentary script generation returned fewer than 2 segments. Please retry."

1.3 WHEN the Groq LLM returns 4 documentary segments introduced by numbered headings such as `1.`, `Segment 1:`, or `**World Context**` THEN the system includes those labels verbatim in the narration text passed to ElevenLabs TTS.

1.4 WHEN the Groq LLM omits all separators and returns the 4 segments as a single continuous block of text THEN the system throws "Documentary script generation returned fewer than 2 segments. Please retry."

### Expected Behavior (Correct)

2.1 WHEN the Groq LLM returns 4 documentary segments separated by `\n\n\n` instead of `---` THEN the system SHALL successfully parse and return the segments without throwing an error.

2.2 WHEN the Groq LLM returns 4 documentary segments separated by any common separator variant (`---`, `---\n`, `\n---`, `***`, `===`) THEN the system SHALL successfully parse and return the segments without throwing an error.

2.3 WHEN the Groq LLM returns segments prefixed with labels such as `Segment 1:`, `1.`, or `**World Context**` THEN the system SHALL strip those labels before returning the segment content to the caller.

2.4 WHEN the Groq prompt is sent to the Groq LLM THEN the system SHALL include explicit, reinforced instructions specifying that `---` on its own line is the required separator, to reduce the frequency of non-conforming responses.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the Groq LLM returns 4 documentary segments correctly separated by `---` THEN the system SHALL CONTINUE TO parse and return exactly those 4 segments unchanged.

3.2 WHEN the Groq LLM returns fewer than 2 parseable segments after all parsing strategies are exhausted THEN the system SHALL CONTINUE TO throw an error prompting the user to retry.

3.3 WHEN the Groq LLM returns fewer than 4 but at least 2 parseable segments THEN the system SHALL CONTINUE TO pad the array to 4 segments by repeating the last segment.

3.4 WHEN the Groq LLM returns an empty response THEN the system SHALL CONTINUE TO throw "Documentary script generation returned an empty response."

3.5 WHEN a valid set of segments is parsed THEN the system SHALL CONTINUE TO pass them to `synthesiseSegment` and `synthesiseDocumentaryAudio` for TTS synthesis without modification beyond label stripping.

3.6 WHEN an `AbortSignal` is provided and aborted THEN the system SHALL CONTINUE TO throw an `AbortError` and cancel the in-flight request.

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type GroqLLMResponse (the raw content string returned by the model)
  OUTPUT: boolean

  // The bug triggers when the raw content cannot be split into ≥ 2 segments
  // using only the current /\s*---\s*/ pattern
  segments ← X.split(/\s*---\s*/).filter(s => s.trim().length > 0)
  RETURN segments.length < 2
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  segments ← generateDocumentaryScript'(X)   // F' = fixed parser
  ASSERT segments.length >= 2
  ASSERT no_error_thrown
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT generateDocumentaryScript(X) = generateDocumentaryScript'(X)
END FOR
```
