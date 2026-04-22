---
inclusion: fileMatch
fileMatchPattern: "**/elevenlabs*"
---

# ElevenLabs Integration Guidelines

## API Client
- Use `@elevenlabs/elevenlabs-js` for TTS and SFX (server-style SDK)
- Use `@elevenlabs/client` for Conversational AI Agents (browser real-time SDK)
- Instantiate the client once at module level in `elevenLabsService.ts`
- Never expose the API key in logs or error messages

## Text-to-Speech
- Model: `eleven_multilingual_v2` for all character voices and narration
- Output format: `mp3_44100_128` for good quality at reasonable size
- Voice settings for scene characters: `stability: 0.35, similarity_boost: 0.8, style: 0.7`
- Voice settings for narration: `stability: 0.5, similarity_boost: 0.8, style: 0.3`
- Always stream the response and collect chunks into a Blob, then `URL.createObjectURL(blob)`
- Revoke previous object URLs before creating new ones to prevent memory leaks

## Sound Effects
- Use `textToSoundEffects.convert()` for ambient soundscapes and scene SFX
- Ambient soundscapes: `duration_seconds: 10` (loopable)
- Scene SFX clips: `duration_seconds: 2` (short, interleaved)
- Truncate SFX text prompts to 450 characters max before calling the API
- Log a warning when truncation occurs

## Rate Limiting
- Wrap all ElevenLabs API calls in `retryWithBackoff()` with `maxRetries: 3`
- Backoff delays: 1s, 2s, 4s (exponential)
- Only retry on 429 errors — throw immediately on all other errors
- Check `signal.aborted` before and after each retry delay

## Conversational Agents
- Use `Conversation.startSession()` from `@elevenlabs/client`
- Always request microphone permission before starting a session
- Pass `dynamicVariables` for city, country, year, and event context
- Handle all four callbacks: `onConnect`, `onDisconnect`, `onError`, `onModeChange`
- Use `startAttemptRef` pattern to prevent race conditions on rapid start/stop
- Always call `endSession()` in the cleanup effect on unmount

## Memory Management
- Track all object URLs created from Blobs
- Revoke URLs when they are no longer needed (before creating replacements)
- Use `AbortController` for every async pipeline — abort on city/era change or unmount
- Check `signal.aborted` after every `await` in async functions

## Error Messages
- 429: "Rate limit exceeded after retries"
- 400: "Invalid request (400)" + log the error object
- AbortError: silently return `null` — this is expected behavior
- All other errors: log with context, return `null` or empty array (non-fatal)
