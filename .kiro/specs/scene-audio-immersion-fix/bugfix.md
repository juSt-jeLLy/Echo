# Bugfix Requirements Document

## Introduction

Two bugs degrade the audio postcard experience. First, the `eventName` field returned by Groq sometimes contains model self-correction notes in parentheses (e.g. "LOS ANGELES EARTHQUAKE OF 1906 (NOTE: INCORRECT YEAR, OCCURRED ON JUNE 10, 1971 IS INCORRECT...)"), polluting the UI with internal model artefacts. Second, the audio layer is not immersive: `textToSoundEffects` is an ambient-only generator that cannot produce human voices, vendor shouts, crowd dialogue, or speech — so the user never hears the human dimension of the historical scene. The fix introduces a dual-layer audio pipeline: a TTS layer for a radio-drama scene script (voices, shouts, crowd reactions) and an SFX layer for pure ambient environment, played simultaneously.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Groq returns an `eventName` that includes parenthetical self-correction notes THEN the system displays the raw string including the parenthetical text in the UI event badge.

1.2 WHEN the audio postcard pipeline runs THEN the system generates only a single SFX ambient track using `textToSoundEffects`, which cannot produce human voices, vendor shouts, crowd dialogue, or speech.

1.3 WHEN the SFX-only track plays THEN the system produces an audio experience that lacks the human voices and crowd reactions needed for the user to feel immersed in the historical scene.

### Expected Behavior (Correct)

2.1 WHEN Groq returns an `eventName` containing parenthetical text THEN the system SHALL strip all parenthetical content (and surrounding whitespace) and truncate the result to 60 characters before displaying or using the value.

2.2 WHEN the audio postcard pipeline runs THEN the system SHALL generate TWO audio layers in parallel: a TTS layer (`synthesiseSceneAudio`) using a `sceneAudioScript` field from Groq, and an SFX ambient layer (`generateAmbientSoundscape`) using the `soundscapePrompt` field.

2.3 WHEN both audio layers are ready THEN the system SHALL play them simultaneously — the TTS layer at volume 1.0 (no loop, plays once) and the SFX layer at volume 0.3 (looped underneath).

2.4 WHEN the TTS scene audio finishes playing THEN the system SHALL pause the ambient layer, reset both audio elements, and set `isPlaying` to false.

2.5 WHEN Groq is prompted THEN the system SHALL request a fourth field `sceneAudioScript`: an 80–120 word immersive radio-drama script with no narrator — only vendor calls in local language, crowd reactions, short spoken lines, and bracketed sound cues — written to be read aloud by a voice actor.

2.6 WHEN `synthesiseSceneAudio` is called THEN the system SHALL use ElevenLabs TTS with voice `JBFqnCBsd6RMkjVDRZzb` (George), model `eleven_multilingual_v2`, and expressive voice settings (stability 0.4, similarity_boost 0.75, style 0.6, use_speaker_boost true).

2.7 WHEN `synthesiseSceneAudio` fails THEN the system SHALL return null and fall back gracefully to SFX-only audio without throwing an error.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN Groq returns an `eventName` with no parenthetical content THEN the system SHALL CONTINUE TO display the event name unchanged (subject only to the 60-char truncation).

3.2 WHEN the user clicks the toggle button while audio is playing THEN the system SHALL CONTINUE TO pause both audio layers and set `isPlaying` to false.

3.3 WHEN the user clicks the toggle button while audio is paused THEN the system SHALL CONTINUE TO resume both audio layers and set `isPlaying` to true.

3.4 WHEN the user clicks retry THEN the system SHALL CONTINUE TO abort the in-flight pipeline and restart the full generation sequence.

3.5 WHEN the city or era selection changes THEN the system SHALL CONTINUE TO abort any in-flight pipeline, reset state, and start a fresh generation.

3.6 WHEN the component unmounts THEN the system SHALL CONTINUE TO pause and clean up all audio resources and abort any in-flight requests.

3.7 WHEN `generateAmbientSoundscape` fails THEN the system SHALL CONTINUE TO surface an error to the user (ambient is still required; TTS is the non-fatal layer).

3.8 WHEN the Groq response is missing required fields THEN the system SHALL CONTINUE TO throw a descriptive error that surfaces to the user.
