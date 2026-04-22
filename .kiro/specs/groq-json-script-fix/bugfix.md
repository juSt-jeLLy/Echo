# Bugfix Requirements Document

## Introduction

The `generateScene` function in `src/services/groqService.ts` makes a single Groq API call requesting all four fields (`eventName`, `atmosphere`, `soundscapePrompt`, `sceneAudioScript`) as a JSON object. The `sceneAudioScript` field contains radio-drama-style content with square brackets `[]`, exclamation marks, and multilingual text. When the model encounters this format inside a `json_object` response, it outputs the field as a raw unquoted multiline block instead of a properly escaped JSON string, causing `JSON.parse` to throw a `json_validate_failed` error and the entire scene generation to fail.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `generateScene` is called with any city and era THEN the system requests all four fields (`eventName`, `atmosphere`, `soundscapePrompt`, `sceneAudioScript`) in a single `json_object`-formatted Groq call

1.2 WHEN the model generates `sceneAudioScript` content containing `[square bracket sound cues]`, exclamation marks, or multilingual characters inside a `json_object` response THEN the system receives a raw unquoted multiline block instead of a valid JSON string (e.g. `"sceneAudioScript":\n   [sound of cannons firing]\n   ¡Estamos listos!`)

1.3 WHEN the model outputs `sceneAudioScript` as an unquoted block THEN the system throws a `json_validate_failed` / `JSON.parse` error and scene generation fails entirely

### Expected Behavior (Correct)

2.1 WHEN `generateScene` is called with any city and era THEN the system SHALL make two parallel Groq API calls: one requesting only `eventName`, `atmosphere`, and `soundscapePrompt` as `json_object`, and one requesting only `sceneAudioScript` as plain text (no `response_format`)

2.2 WHEN the plain-text call returns `sceneAudioScript` content containing `[square bracket sound cues]`, exclamation marks, or multilingual characters THEN the system SHALL accept the raw text without any JSON parsing, eliminating the escaping failure

2.3 WHEN both parallel calls complete successfully THEN the system SHALL combine their results into a single `SceneResult` and return it to the caller

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `generateScene` completes successfully THEN the system SHALL CONTINUE TO return a `SceneResult` with all four fields: `eventName`, `atmosphere`, `soundscapePrompt`, and `sceneAudioScript`

3.2 WHEN the structured JSON call returns `eventName`, `atmosphere`, or `soundscapePrompt` THEN the system SHALL CONTINUE TO validate that all three fields are present and throw a descriptive error if any are missing

3.3 WHEN `eventName` contains parenthetical self-correction notes THEN the system SHALL CONTINUE TO strip them and truncate to 60 characters

3.4 WHEN an `AbortSignal` is passed to `generateScene` THEN the system SHALL CONTINUE TO forward it to both Groq API calls so cancellation works correctly

3.5 WHEN the Groq API key is not configured THEN the system SHALL CONTINUE TO throw a configuration error before making any API calls
