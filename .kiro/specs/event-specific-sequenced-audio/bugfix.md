# Bugfix Requirements Document

## Introduction

The audio scene has two bugs that break immersion. First, voice lines are generic crowd noise unrelated to the specific historical event being depicted — they do not reference what is actually happening. Second, all voice lines are concatenated back-to-back with no pauses or sound effects between them, producing a rapid-fire monologue instead of a natural, atmospheric scene. The fix introduces event-specific voice lines interleaved with short event-specific sound effects and brief silences, making the listener feel present during the actual historical event.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the audio scene is generated for a specific historical event THEN the system produces voice lines that are generic crowd noise not referencing the actual event (e.g. no mention of fire, battle, flood, or whatever is happening)

1.2 WHEN multiple voice lines are synthesised THEN the system concatenates all TTS audio chunks back-to-back with no pauses or sound effects between them, producing a continuous monologue with no breathing room

1.3 WHEN the Groq Call 2 prompt is executed THEN the system requests only VOICE lines and returns no SFX cues, so there is no mechanism to insert event-specific sound effects between voice lines

1.4 WHEN `synthesiseSceneLines` processes the lines THEN the system only calls the TTS API and never calls `textToSoundEffects`, so SFX segments are never generated

### Expected Behavior (Correct)

2.1 WHEN the audio scene is generated for a specific historical event THEN the system SHALL produce voice lines that explicitly reference the actual event happening (e.g. for the Great Fire of London: shouting about fire, calling for water buckets, warning neighbours)

2.2 WHEN the interleaved sequence is played back THEN the system SHALL alternate voice lines and short SFX segments (VOICE, SFX, VOICE, SFX…) with a brief silence gap (~400 ms) between each segment so the scene feels natural and atmospheric

2.3 WHEN Groq Call 2 is executed THEN the system SHALL generate an interleaved sequence of 8–10 VOICE lines and 7–9 SFX lines in the format `VOICE:Name|spoken line` and `SFX:description`, starting with a VOICE line and alternating

2.4 WHEN `synthesiseSceneLines` processes a `SceneLine` with `type === "voice"` THEN the system SHALL call the TTS API with the assigned voice and return the resulting audio URL

2.5 WHEN `synthesiseSceneLines` processes a `SceneLine` with `type === "sfx"` THEN the system SHALL call `textToSoundEffects.convert` with the SFX description and a duration of 2 seconds and return the resulting audio URL

2.6 WHEN all segments have been synthesised THEN the system SHALL return an ordered array of object URLs (one per segment) and play them sequentially using a playlist approach, advancing to the next URL after each segment ends with a 400 ms delay between segments

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the ambient soundscape is generated THEN the system SHALL CONTINUE TO call `generateAmbientSoundscape` with the `soundscapePrompt` and loop it at low volume underneath the scene audio

3.2 WHEN the user clicks the play/pause toggle THEN the system SHALL CONTINUE TO pause or resume the currently active audio element and the ambient layer simultaneously

3.3 WHEN the user clicks retry THEN the system SHALL CONTINUE TO abort the in-flight request and restart the full generation pipeline from scratch

3.4 WHEN the generation pipeline is aborted mid-flight THEN the system SHALL CONTINUE TO silently discard the result without setting an error state

3.5 WHEN the Groq Call 1 (structured JSON) is executed THEN the system SHALL CONTINUE TO return `eventName`, `atmosphere`, and `soundscapePrompt` fields unchanged

3.6 WHEN the scene result is available THEN the system SHALL CONTINUE TO display `eventName` and `atmosphere` in the UI immediately while audio loads

3.7 WHEN ambient soundscape generation fails THEN the system SHALL CONTINUE TO throw an error prompting the user to retry
