# Requirements: Custom Historian Conversation UI

## Introduction

Replace the ElevenLabs widget embed with a fully custom React UI that uses the `@elevenlabs/client` SDK directly. The custom UI matches the app's dark cinematic aesthetic perfectly — no white backgrounds, no foreign widget chrome.

## How it works

`@elevenlabs/client` provides a `Conversation` class:
- `Conversation.startSession({ agentId, dynamicVariables })` — connects to the agent, starts mic capture
- Fires callbacks: `onConnect`, `onDisconnect`, `onMessage`, `onModeChange` (listening/speaking)
- `conversation.endSession()` — ends the call

## Requirements

### Requirement 1: Custom conversation hook
- `useHistorianConversation(city, era, eventName)` hook
- Manages: `status` (idle | connecting | connected | disconnected), `mode` (listening | speaking), `error`
- `startConversation()` — calls `Conversation.startSession` with agent ID + dynamic variables
- `endConversation()` — calls `conversation.endSession()`
- Requests microphone permission before connecting

### Requirement 2: Custom UI — full-screen overlay
- Same dark cinematic overlay as before
- Large animated orb that pulses based on `mode`:
  - **Listening**: slow blue pulse
  - **Speaking**: fast purple/cyan pulse (historian is talking)
  - **Connecting**: spinning gradient ring
- Status text: "Connecting…" / "Listening…" / "Speaking…"
- Microphone waveform visualization when user is speaking (using Web Audio API)

### Requirement 3: No ElevenLabs widget
- Remove `@elevenlabs/convai-widget-embed` script entirely
- Remove `<elevenlabs-convai>` web component
- Use only `@elevenlabs/client` SDK

### Requirement 4: Install `@elevenlabs/client`
- `npm install @elevenlabs/client`

### Requirement 5: Audio coordination (same as before)
- Scene audio pauses when conversation starts
- Ambient continues at 0.15 volume
- On end: ambient returns to 0.3, scene audio resumes
