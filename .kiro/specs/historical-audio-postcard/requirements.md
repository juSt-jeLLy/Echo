# Requirements Document

## Introduction

The **Historical Audio Postcard** feature transforms City Whispers from a visual experience into a fully immersive audio journey. When a user selects a city and a historical era on the 3D globe, the system generates a cinematic ~30-second audio scene grounded in real historical events from that city and time. A Groq LLM call produces a vivid, second-person scene script — ambient sounds, local voices, weather, street life, and local-language phrases — which is then synthesised into narration audio via the ElevenLabs TTS API. Simultaneously, ElevenLabs Sound Effects generation produces a loopable ambient soundscape extracted from the same script. Both audio streams play together: narration at full volume, ambient soundscape underneath at reduced volume. The narrator voice is selected dynamically based on the city's geographic region. The resulting dual-audio experience plays inside the existing `CityPanel` component, with the `AudioWaveform` animation reflecting real playback state.

---

## Glossary

- **AudioPostcardService**: The client-side module responsible for orchestrating script generation, audio synthesis, and sound effect generation.
- **ScriptGenerator**: The sub-module that calls the Groq API to produce a scene script and extract ambient sound descriptors.
- **AudioSynthesiser**: The sub-module that calls the ElevenLabs TTS API to convert a script into a narration audio blob.
- **SoundEffectGenerator**: The sub-module that calls the ElevenLabs Sound Effects API to produce a loopable ambient soundscape blob.
- **VoiceSelector**: The sub-module that determines the appropriate ElevenLabs narrator voice based on the city's geographic region.
- **AudioPlayer**: The browser `HTMLAudioElement` (or equivalent abstraction) used to play audio.
- **NarratorAudio**: The `HTMLAudioElement` instance playing the TTS narration at full volume.
- **AmbientAudio**: The `HTMLAudioElement` instance playing the ambient soundscape loop at volume 0.35.
- **CityPanel**: The existing React component that displays city/era information and the play/pause control.
- **AudioWaveform**: The existing animated-bar React component rendered inside `CityPanel`.
- **Scene Script**: A ~150–200 word second-person narrative describing ambient sounds, voices, weather, and street life at a specific city and era, anchored to a real historical event, with local-language phrases naturally woven in.
- **Ambient Sound Descriptor**: A short text phrase (e.g. "busy 1920s Paris market with horse carts and accordion music") extracted from the Scene Script and used as input to the Sound Effects API.
- **City**: A data record with `id`, `name`, `country`, `lat`, `lng`, and `whisper` fields (see `src/data/cities.ts`).
- **Era**: A data record with `id`, `year`, `label`, and `tagline` fields (see `src/data/eras.ts`).
- **VITE_GROQ_API_KEY**: Environment variable holding the Groq API key.
- **VITE_ELEVENLABS_API_KEY**: Environment variable holding the ElevenLabs API key.
- **George**: ElevenLabs voice (id: `JBFqnCBsd6RMkjVDRZzb`) — warm, captivating storyteller; used for European, African/Middle Eastern cities and as the default fallback.
- **Daniel**: ElevenLabs voice (id: `onwK4e9ZLuTAKqWW03F9`) — British, formal broadcaster; used for Asian cities.
- **Brian**: ElevenLabs voice (id: `nPczCjzI2devNBz1zQrb`) — American, resonant; used for American cities.

---

## Requirements

### Requirement 1: Scene Script Generation

**User Story:** As a user, I want the app to generate a historically grounded scene script for my chosen city and era, so that the audio postcard feels authentic and immersive.

#### Acceptance Criteria

1. WHEN a user selects a city and an era, THE ScriptGenerator SHALL send a request to the Groq API using the `VITE_GROQ_API_KEY` environment variable.
2. THE ScriptGenerator SHALL include in the prompt the city name, country, and era year, and SHALL instruct the model to identify a real historical event occurring in that city during that era.
3. THE ScriptGenerator SHALL instruct the model to write the scene in the second person ("you are standing…"), describing ambient sounds, local voices, street vendors, weather, and the language of the place, targeting 150–200 words.
4. THE ScriptGenerator SHALL instruct the model to naturally weave in a few words or phrases in the local language of the city (e.g. a vendor calling out in Japanese, a French café owner greeting someone in French), so that the narration reflects the authentic linguistic texture of the place.
5. WHEN the Groq API returns a successful response, THE ScriptGenerator SHALL extract the text content of the first choice message and return it as the Scene Script.
6. IF the Groq API returns an error or a network failure occurs, THEN THE ScriptGenerator SHALL throw a typed error containing the HTTP status code and a human-readable message.
7. THE ScriptGenerator SHALL use the `llama3-8b-8192` model (or the fastest available Groq model) with a `max_tokens` value of 300 to keep latency low.

---

### Requirement 2: Ambient Sound Descriptor Extraction

**User Story:** As a user, I want the system to derive an ambient soundscape from the scene script, so that the audio postcard has an immersive environmental backdrop.

#### Acceptance Criteria

1. WHEN a Scene Script is available, THE ScriptGenerator SHALL extract 3–5 key ambient sound descriptors from the script text.
2. THE ScriptGenerator SHALL select descriptors that capture the dominant environmental sounds of the scene (e.g. "busy 1920s Paris market with horse carts and accordion music", "Tokyo 1950 rain on cobblestones with distant temple bells").
3. THE ScriptGenerator SHALL combine the extracted descriptors into a single Ambient Sound Descriptor string suitable for use as input to the ElevenLabs Sound Effects API.
4. THE ScriptGenerator SHALL return both the Scene Script and the Ambient Sound Descriptor as a single result object so that downstream modules receive both in one call.

---

### Requirement 3: Narrator Voice Selection

**User Story:** As a user, I want the narrator voice to reflect the geographic character of the city, so that the audio postcard feels regionally appropriate.

#### Acceptance Criteria

1. WHEN a city is provided, THE VoiceSelector SHALL determine the narrator voice based on the city's geographic region using the following mapping:
   - European cities → George (id: `JBFqnCBsd6RMkjVDRZzb`)
   - Asian cities → Daniel (id: `onwK4e9ZLuTAKqWW03F9`)
   - American cities (North and South) → Brian (id: `nPczCjzI2devNBz1zQrb`)
   - African and Middle Eastern cities → George (id: `JBFqnCBsd6RMkjVDRZzb`)
   - All other cities → George (id: `JBFqnCBsd6RMkjVDRZzb`) as the default fallback
2. BEFORE using a selected voice, THE VoiceSelector SHALL call the ElevenLabs `get_voice` endpoint to verify the voice is available in the account.
3. IF the preferred voice is unavailable, THEN THE VoiceSelector SHALL fall back to George (id: `JBFqnCBsd6RMkjVDRZzb`) and log a warning.
4. THE VoiceSelector SHALL determine region from the city's `country` field using a static region mapping table defined in `src/services/elevenLabsService.ts`.

---

### Requirement 4: Audio Narration Synthesis

**User Story:** As a user, I want the generated scene script to be converted into realistic spoken audio, so that I can hear the historical postcard rather than just read it.

#### Acceptance Criteria

1. WHEN a Scene Script and a resolved voice id are available, THE AudioSynthesiser SHALL call the ElevenLabs TTS API using the `VITE_ELEVENLABS_API_KEY` environment variable.
2. THE AudioSynthesiser SHALL use the `eleven_multilingual_v2` model for all narration, since city scenes span 29 languages and local-language phrases require multilingual support.
3. THE AudioSynthesiser SHALL confirm `eleven_multilingual_v2` is available by calling the ElevenLabs `list_models` endpoint once at service initialisation and caching the result; IF the model is unavailable, THEN THE AudioSynthesiser SHALL throw a configuration error.
4. THE AudioSynthesiser SHALL apply the following voice settings for a cinematic feel: `stability=0.6`, `similarity_boost=0.8`, `style=0.3`, `use_speaker_boost=true`.
5. THE AudioSynthesiser SHALL request audio in `mp3_44100_128` format to balance quality and download size.
6. WHEN the ElevenLabs TTS API returns a successful audio stream, THE AudioSynthesiser SHALL collect the stream into a `Blob` and return an object URL suitable for an `HTMLAudioElement`.
7. IF the ElevenLabs TTS API returns an error or a network failure occurs, THEN THE AudioSynthesiser SHALL throw a typed error containing the HTTP status code and a human-readable message.
8. THE AudioSynthesiser SHALL revoke the previously created object URL before creating a new one, to prevent memory leaks across multiple postcard generations.

---

### Requirement 5: Ambient Soundscape Generation

**User Story:** As a user, I want an ambient soundscape to play underneath the narration, so that the audio postcard feels like a fully realised sonic environment.

#### Acceptance Criteria

1. WHEN an Ambient Sound Descriptor is available, THE SoundEffectGenerator SHALL call the ElevenLabs Sound Effects API using the `VITE_ELEVENLABS_API_KEY` environment variable.
2. THE SoundEffectGenerator SHALL request a soundscape with a duration between 3 and 5 seconds and SHALL set `loop=true` so the soundscape loops continuously during playback.
3. THE SoundEffectGenerator SHALL request audio in `mp3_44100_128` format.
4. WHEN the ElevenLabs Sound Effects API returns a successful audio blob, THE SoundEffectGenerator SHALL return an object URL suitable for an `HTMLAudioElement`.
5. IF the ElevenLabs Sound Effects API returns an error or a network failure occurs, THEN THE SoundEffectGenerator SHALL log a warning and return `null`, allowing the postcard to play with narration only rather than failing entirely.
6. THE SoundEffectGenerator SHALL revoke the previously created object URL before creating a new one, to prevent memory leaks.

---

### Requirement 6: Dual Audio Playback

**User Story:** As a user, I want the narration and ambient soundscape to play simultaneously, so that the audio postcard is fully immersive.

#### Acceptance Criteria

1. WHEN both the NarratorAudio URL and the AmbientAudio URL are available, THE AudioPlayer SHALL start both audio elements simultaneously when playback begins.
2. THE AudioPlayer SHALL play NarratorAudio at full volume (1.0) and AmbientAudio at volume 0.35.
3. THE AmbientAudio element SHALL have its `loop` property set to `true` so it loops continuously for the duration of narration playback.
4. WHEN the user toggles play/pause, THE AudioPlayer SHALL pause or resume both NarratorAudio and AmbientAudio simultaneously.
5. WHEN NarratorAudio finishes playing, THE AudioPlayer SHALL pause AmbientAudio and reset both elements' playback positions to the beginning.
6. WHEN the `CityPanel` unmounts, THE AudioPlayer SHALL pause both audio elements and revoke both object URLs to free memory.
7. WHERE AmbientAudio is unavailable (generation failed or returned null), THE AudioPlayer SHALL play NarratorAudio alone without error.

---

### Requirement 7: Audio Playback Integration

**User Story:** As a user, I want the generated audio to play automatically when I open the CityPanel, so that the experience is seamless and requires no extra interaction.

#### Acceptance Criteria

1. WHEN the `CityPanel` mounts with a valid city and era, THE AudioPlayer SHALL begin loading and playing the audio postcard automatically.
2. WHILE audio is loading or generating, THE CityPanel SHALL display a loading indicator in place of the play/pause button so the user knows the system is working.
3. WHEN the user clicks the play/pause button, THE AudioPlayer SHALL toggle between playing and paused states for both audio elements.
4. WHEN the narration audio finishes playing, THE AudioPlayer SHALL set the playback state to paused and reset both playback positions to the beginning.
5. IF audio generation or playback fails, THEN THE CityPanel SHALL display a human-readable error message below the waveform area and SHALL show a retry button.
6. WHEN the user clicks the retry button after a failure, THE AudioPostcardService SHALL restart the full generation pipeline for the current city and era.
7. WHEN the `CityPanel` unmounts, THE AudioPlayer SHALL pause playback and release all audio object URLs to free memory.

---

### Requirement 8: Waveform Synchronisation

**User Story:** As a user, I want the AudioWaveform animation to reflect real playback state, so that the visual feedback matches what I'm hearing.

#### Acceptance Criteria

1. WHILE the AudioPlayer is in the playing state, THE AudioWaveform SHALL animate its bars continuously.
2. WHILE the AudioPlayer is in the paused or loading state, THE AudioWaveform SHALL render its bars in a static, low-opacity state.
3. THE CityPanel SHALL pass the real `playing` boolean (derived from `AudioPlayer` state) to the `AudioWaveform` component, replacing the previous local toggle state.
4. THE AudioWaveform component interface SHALL remain unchanged (accepts `playing` and optional `bars` props) so no other consumers are broken.

---

### Requirement 9: Generation State Management

**User Story:** As a developer, I want audio postcard state to be managed in a dedicated hook, so that the CityPanel stays focused on presentation and the logic is testable in isolation.

#### Acceptance Criteria

1. THE AudioPostcardService SHALL be encapsulated in a custom React hook named `useAudioPostcard` located at `src/hooks/useAudioPostcard.ts`.
2. THE `useAudioPostcard` hook SHALL accept `city: City | null` and `era: Era | null` as parameters and SHALL return `{ narratorUrl, ambientUrl, isLoading, isPlaying, error, toggle, retry }`.
3. WHEN either `city` or `era` changes to a non-null value, THE `useAudioPostcard` hook SHALL automatically trigger a new generation pipeline.
4. WHEN either `city` or `era` changes while a generation is in progress, THE `useAudioPostcard` hook SHALL cancel the in-flight request (via `AbortController`) before starting a new one.
5. THE `useAudioPostcard` hook SHALL manage two internal `HTMLAudioElement` refs: one for NarratorAudio and one for AmbientAudio.
6. THE `useAudioPostcard` hook SHALL expose a `toggle` function that plays both audio elements if paused and pauses both if playing.
7. THE `useAudioPostcard` hook SHALL expose a `retry` function that re-runs the full generation pipeline for the current city and era.

---

### Requirement 10: API Key Safety

**User Story:** As a developer, I want API keys to be accessed only through Vite environment variables, so that secrets are never hard-coded or exposed in source control.

#### Acceptance Criteria

1. THE ScriptGenerator SHALL read the Groq API key exclusively from `import.meta.env.VITE_GROQ_API_KEY`.
2. THE AudioSynthesiser and SoundEffectGenerator SHALL read the ElevenLabs API key exclusively from `import.meta.env.VITE_ELEVENLABS_API_KEY`.
3. IF either environment variable is undefined or empty at runtime, THEN THE AudioPostcardService SHALL throw a configuration error with a message identifying which key is missing, before making any network request.
4. THE codebase SHALL contain no hard-coded API key strings.

---

### Requirement 11: Groq SDK Installation

**User Story:** As a developer, I want the Groq SDK available as a project dependency, so that the ScriptGenerator can use the official client rather than raw fetch calls.

#### Acceptance Criteria

1. THE project SHALL declare `groq-sdk` as a dependency in `package.json`.
2. WHEN `npm install` (or equivalent) is run, THE `groq-sdk` package SHALL be resolvable and importable in TypeScript source files.
3. THE ScriptGenerator SHALL import and instantiate the `Groq` client from `groq-sdk`, passing the API key via the constructor options.

---

### Requirement 12: ElevenLabs SDK Usage

**User Story:** As a developer, I want the ElevenLabs SDK used consistently across all ElevenLabs API calls, so that authentication, error handling, and streaming are handled uniformly.

#### Acceptance Criteria

1. THE project SHALL use the `@elevenlabs/elevenlabs-js` package (already declared in `package.json`) for all ElevenLabs API calls.
2. THE AudioSynthesiser, SoundEffectGenerator, and VoiceSelector SHALL all instantiate a single shared `ElevenLabsClient` configured with `VITE_ELEVENLABS_API_KEY`.
3. THE shared `ElevenLabsClient` instance SHALL be created once in `src/services/elevenLabsService.ts` and exported for use by all sub-modules.
