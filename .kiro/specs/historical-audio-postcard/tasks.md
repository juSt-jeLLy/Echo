# Tasks

- [x] 1. Install groq-sdk
  - Run `npm install groq-sdk`
  - Verify it's in package.json

- [x] 2. Create `src/services/groqService.ts`
  - Implement Groq scene script generator with ScriptResult interface
  - System prompt: cinematic historian and immersive sound designer
  - User prompt: real historical event, 150-200 word second-person scene with ambient sounds and local language phrases
  - Response format: JSON `{ "script": "...", "ambientDescriptor": "..." }`
  - Model: llama3-8b-8192, max_tokens: 400, response_format json_object
  - Read key from `import.meta.env.VITE_GROQ_API_KEY`
  - Throw config error if key missing
  - Handle AbortSignal

- [x] 3. Create `src/services/elevenLabsService.ts`
  - Shared ElevenLabs client using VITE_ELEVENLABS_API_KEY
  - Region to voice mapping (europe, asia, americas, africa_mideast, default)
  - Country to region table covering all countries in cities.ts
  - `resolveVoice(city)` - look up region, verify voice via get(), fall back to George
  - `ensureMultilingualModel()` - cached check for eleven_multilingual_v2
  - `synthesiseNarration(script, voiceId, signal?)` - TTS with voice settings, returns objectURL
  - `generateAmbientSoundscape(descriptor, signal?)` - SFX generation, returns objectURL or null

- [x] 4. Create `src/hooks/useAudioPostcard.ts`
  - AudioPostcardState interface with isLoading, isPlaying, error, toggle, retry
  - Two audio element refs (narrator and ambient)
  - AbortController ref for cancellation
  - Main useEffect on [city, era, retryCount] running the full pipeline
  - narratorRef ended event handler to pause ambient and reset positions
  - toggle and retry callbacks
  - Cleanup on unmount

- [x] 5. Update `src/components/ui-extras/CityPanel.tsx`
  - Replace local useState(playing) with useAudioPostcard hook
  - Replace play button onClick with toggle
  - Show Loader2 spinner while isLoading, else Pause/Play icon
  - Pass isPlaying to AudioWaveform
  - Update status text to show loading/live/paused
  - Add error display with retry button below waveform

- [x] 6. Add loading state to CityPanel script display
  - While isLoading show "Generating your audio postcard…" italic pulsing text
  - Otherwise show the city whisper quote
