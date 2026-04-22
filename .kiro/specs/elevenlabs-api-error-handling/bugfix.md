# Bugfix Requirements Document

## Introduction

The audio postcard generation system is experiencing critical API errors when interacting with the ElevenLabs API. Users encounter two types of failures: (1) 429 rate limiting errors when multiple API calls are made in parallel to generate ambient soundscapes and scene line audio, and (2) 400 validation errors when soundscape prompt text exceeds the 450 character limit imposed by the sound generation endpoint. These errors result in failed audio generation with generic error messages, degrading the user experience and preventing successful postcard creation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a soundscape prompt exceeds 450 characters THEN the system sends the full text to the `/v1/sound-generation` endpoint and receives a 400 validation error

1.2 WHEN multiple API calls are made in parallel to ElevenLabs endpoints (`/v1/sound-generation` and `/v1/text-to-speech/{voiceId}`) THEN the system receives 429 rate limiting errors

1.3 WHEN a 429 rate limiting error occurs THEN the system immediately fails without attempting to retry the request

1.4 WHEN API errors occur (429 or 400) THEN the system displays a generic error message "Could not generate the soundscape for this scene. Please retry." without distinguishing between error types or providing actionable feedback

### Expected Behavior (Correct)

2.1 WHEN a soundscape prompt exceeds 450 characters THEN the system SHALL truncate the text to 450 characters before sending it to the `/v1/sound-generation` endpoint

2.2 WHEN a 429 rate limiting error occurs on any ElevenLabs API call THEN the system SHALL implement exponential backoff retry logic with configurable maximum retry attempts

2.3 WHEN API errors occur THEN the system SHALL provide specific error messages that distinguish between rate limiting, validation errors, and other failure types

2.4 WHEN parallel API calls are made THEN the system SHALL implement request throttling or sequential processing to reduce the likelihood of hitting rate limits

### Unchanged Behavior (Regression Prevention)

3.1 WHEN soundscape prompts are 450 characters or less THEN the system SHALL CONTINUE TO send them to the API without modification

3.2 WHEN API calls succeed on the first attempt THEN the system SHALL CONTINUE TO process responses immediately without unnecessary delays

3.3 WHEN audio generation completes successfully THEN the system SHALL CONTINUE TO play the intro, scene lines, and ambient soundscape in the correct sequence

3.4 WHEN users interact with play/pause controls THEN the system SHALL CONTINUE TO respond correctly to toggle and retry actions

3.5 WHEN AbortController signals are triggered THEN the system SHALL CONTINUE TO cancel in-flight requests and clean up resources properly
