# Bugfix Requirements Document

## Introduction

The scene audio feature currently uses a single voice (George) to read the entire `sceneAudioScript` as a monologue. Regardless of how the script is written, one voice reading a multi-character script always sounds like narration rather than a live scene. The fix replaces the single-voice TTS call with a multi-voice approach: Groq generates 4–6 individual character lines in a structured `VOICE:name|line` format, each line is synthesised with a distinct ElevenLabs voice, and the resulting audio clips are concatenated into one seamless audio blob that sounds like multiple different people speaking.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the scene audio pipeline runs THEN the system sends the entire `sceneAudioScript` to a single TTS call using George's voice (ID: `JBFqnCBsd6RMkjVDRZzb`)

1.2 WHEN the synthesised audio plays THEN the system produces a single-voice narration regardless of how many characters or shouts are written in the script

1.3 WHEN Groq Call 2 generates the scene script THEN the system returns a single continuous plain-text string with no per-character voice assignments

### Expected Behavior (Correct)

2.1 WHEN the scene audio pipeline runs THEN the system SHALL generate 4–6 individual voice lines from Groq in `VOICE:<voiceName>|<line>` format, parse them into a `SceneLine[]` array with voice name, voice ID, and spoken text

2.2 WHEN synthesising scene audio THEN the system SHALL make one TTS call per `SceneLine` in parallel, each using the voice ID assigned to that line, and concatenate all resulting audio chunks in order into a single `Blob`

2.3 WHEN the concatenated audio plays THEN the system SHALL sound like multiple distinct voices speaking in sequence — not a single narrator

2.4 WHEN a voice name from Groq matches a known entry in the voice lookup table THEN the system SHALL map it to the correct ElevenLabs voice ID (Charlie → `IKne3meq5aSn9XLyUdCD`, Laura → `FGY2WhTYpPnrIDTdsKH5`, Brian → `nPczCjzI2devNBz1zQrb`, Jessica → `cgSgspJ2msm6clMCkdW9`, Will → `bIHbv24MWmeRgasZH58o`, Roger → `CwhRBWXzGAHq8TQ4Fs17`, Liam → `TX3LPaxmHKxFdv7VOQHJ`, Sarah → `EXAVITQu4vr4xnSDxMaL`)

2.5 WHEN all TTS calls fail THEN the system SHALL return `null` and fall back to ambient-only audio (non-fatal, same as current behaviour)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the ambient soundscape pipeline runs THEN the system SHALL CONTINUE TO generate and play the looping ambient audio layer independently of the scene audio changes

3.2 WHEN scene audio finishes playing THEN the system SHALL CONTINUE TO pause the ambient layer, reset both audio elements, and set `isPlaying` to `false`

3.3 WHEN the user toggles playback THEN the system SHALL CONTINUE TO pause or resume both audio layers together

3.4 WHEN a new city/era is selected THEN the system SHALL CONTINUE TO abort any in-flight requests and restart the full generation pipeline

3.5 WHEN Groq Call 1 runs THEN the system SHALL CONTINUE TO return `eventName`, `atmosphere`, and `soundscapePrompt` as structured JSON, unchanged

3.6 WHEN scene audio generation fails THEN the system SHALL CONTINUE TO fall back gracefully to ambient-only playback without throwing a fatal error

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SceneAudioRequest
  OUTPUT: boolean

  // Bug is triggered whenever scene audio is synthesised using a single voice
  RETURN X.voiceCount = 1 AND X.synthesisMode = SINGLE_SCRIPT
END FUNCTION
```

**Fix Checking — all buggy inputs must produce multi-voice output:**
```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← synthesiseSceneLines'(X.sceneLines)
  ASSERT result IS single concatenated Blob
  ASSERT result contains audio from >= 2 distinct voice IDs
  ASSERT no_crash(result)
END FOR
```

**Preservation Checking — non-buggy paths must be unchanged:**
```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  // ambient soundscape, toggle, abort, fallback paths
  ASSERT F(X) = F'(X)
END FOR
```
