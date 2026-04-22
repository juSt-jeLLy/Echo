# Bugfix Requirements Document

## Introduction

The audio postcard feature generates a `soundscapePrompt` via Groq and passes it to ElevenLabs `textToSoundEffects` to produce immersive historical audio. Currently, the Groq prompt produces vague, generic descriptors (e.g. "colonial Singapore ambient sounds") that cause ElevenLabs to generate bland background noise — no voices, no vendor shouts, no crowd chatter, no era-specific sounds. The fix requires updating the Groq prompt in `src/services/groqService.ts` to produce rich, cinematic sound design briefs that explicitly include human voices (with phonetic local-language phrases), specific era sounds, and detailed scene elements so ElevenLabs generates truly immersive audio matching the displayed atmosphere text.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Groq prompt requests a `soundscapePrompt` for a historical scene THEN the system generates a vague, generic descriptor (e.g. "colonial Singapore ambient sounds, night atmosphere") that lacks human voices, local-language phrases, and specific era sounds

1.2 WHEN the vague `soundscapePrompt` is sent to ElevenLabs `textToSoundEffects` THEN the system produces generic ambient background noise (wind, hum) with no vendor shouts, crowd chatter, or era-specific sounds

1.3 WHEN the UI card displays a rich atmosphere text containing specific details (e.g. vendor shouting "Raffles takat! Kambings for sale!", soldiers' boots, crowd murmuring in Malay) THEN the system plays audio that does not match those described sounds

### Expected Behavior (Correct)

2.1 WHEN the Groq prompt requests a `soundscapePrompt` for a historical scene THEN the system SHALL generate a detailed, cinematic sound design brief (60–80 words) that explicitly includes human voices with phonetic local-language shouts/calls, crowd sounds, and specific era-appropriate environmental sounds

2.2 WHEN the rich `soundscapePrompt` is sent to ElevenLabs `textToSoundEffects` THEN the system SHALL produce immersive audio containing identifiable voices, vendor calls, crowd chatter, and era-specific sounds that match the scene's atmosphere

2.3 WHEN the UI card displays atmosphere text referencing specific sounds (e.g. vendor shouts, soldiers' boots, musket fire) THEN the system SHALL play audio that aurally reflects those same specific elements

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `generateScene` is called with any valid `City` and `Era` THEN the system SHALL CONTINUE TO return a `SceneResult` object containing all three fields: `eventName`, `atmosphere`, and `soundscapePrompt`

3.2 WHEN the Groq API returns a valid JSON response THEN the system SHALL CONTINUE TO parse it and pass `soundscapePrompt` directly to `generateAmbientSoundscape` without any transformation

3.3 WHEN a city and era combination is selected THEN the system SHALL CONTINUE TO display the `eventName` and `atmosphere` text on the UI card immediately while audio loads

3.4 WHEN `generateAmbientSoundscape` receives the `soundscapePrompt` THEN the system SHALL CONTINUE TO call ElevenLabs `textToSoundEffects.convert` with a 5-second duration and return an object URL for the audio element

3.5 WHEN the user triggers retry or selects a new city/era THEN the system SHALL CONTINUE TO abort any in-flight requests and start a fresh generation pipeline

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type GroqPromptConfig (city, era, generatedSoundscapePrompt)
  OUTPUT: boolean

  // Bug is triggered when the generated soundscapePrompt is vague —
  // i.e. it lacks human voices, local-language phrases, and specific era sounds
  RETURN length(X.soundscapePrompt) < 50
      OR NOT contains_human_voice_cues(X.soundscapePrompt)
      OR NOT contains_specific_era_sounds(X.soundscapePrompt)
END FUNCTION
```

**Fix Checking Property:**
```pascal
// Property: Fix Checking — rich soundscapePrompt is generated
FOR ALL X WHERE isBugCondition(X) DO
  result ← generateScene'(X.city, X.era)
  ASSERT word_count(result.soundscapePrompt) >= 40
    AND contains_human_voice_cues(result.soundscapePrompt)
    AND contains_specific_era_sounds(result.soundscapePrompt)
END FOR
```

**Preservation Property:**
```pascal
// Property: Preservation Checking — non-prompt fields and pipeline are unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT generateScene'(X) returns { eventName, atmosphere, soundscapePrompt }
    AND pipeline(F(X)) = pipeline(F'(X))  // same field names, same downstream flow
END FOR
```
