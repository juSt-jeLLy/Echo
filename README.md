# 🌍 ECHO

> *Step into history. Hear the world as it was.*

**ECHO** is an immersive 3D globe experience that lets you time-travel to any city in any historical era through AI-generated audio. Click London in 1666 and you're standing in the Great Fire. Click Tokyo in 1920 and the jazz age roars around you. Vendors shout in local languages, crowds react to the events unfolding, and a hyper-specific ambient soundscape pulls you into the moment. Or slow down and let a narrator guide you through a four-part documentary about the city and era you've landed in. Then, when you're ready, talk to a historian who was actually there — someone who lived through it, speaks from it, and knows only what the world knew then.

Built for the **ElevenLabs × Kiro Hackathon** using spec-driven development with Kiro and the full ElevenLabs API suite.

---

[How Kiro was used](https://github.com/juSt-jeLLy/Echo/blob/main/README.md#-how-kiro-was-used)

[Details of .kiro directory](https://github.com/juSt-jeLLy/Echo/blob/main/.kiro/HACKATHON.md)

---

## ✨ Features

### 🗺️ Interactive 3D Earth
- Photorealistic rotating globe with 100+ clickable city markers across every continent
- Smooth GSAP camera animations, atmospheric glow, cloud layer, and starfield
- City search, era selection (1800–Present), and custom year input

### 🎭 Wander the City Mode
- **Groq AI** (`llama-3.1-8b-instant`) finds a real historical event for your city + era
- **ElevenLabs TTS** generates multi-voice scene audio — 8 different character voices (vendors, soldiers, crowd members) each with their own ElevenLabs voice ID
- **ElevenLabs SFX** generates event-specific ambient soundscapes (cannon fire, market bells, rain on cobblestones)
- Intro clip: *"Welcome to London. You are now witnessing the Great Fire of London."*
- Voices and SFX interleaved with natural pauses — you feel like you're there

### 🎬 Documentary Mode
- Groq generates a 4-segment narrated documentary about the city and era
- Choose your narrator: George (warm storyteller), Daniel (formal broadcaster), Brian (resonant), Matilda, Alice, or River
- Progressive audio loading — first segment plays immediately while others load in the background

### 🏛️ Talk to the Historian
- **ElevenLabs Conversational AI Agent** — a historian who is physically present in that city at that moment
- Speaks in first person, uses period-appropriate language, references what's happening around them
- Knows only what someone in that era would know — no future knowledge
- Full-screen cinematic overlay with animated orb (blue = listening, purple = speaking)
- Scene audio pauses during conversation, ambient continues at reduced volume, resumes when you end the chat

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| 3D | Three.js + React Three Fiber + GSAP |
| UI | TailwindCSS + shadcn/ui + Radix UI |
| AI Scene Generation | Groq (`llama-3.1-8b-instant`) |
| Text-to-Speech | ElevenLabs TTS (`eleven_multilingual_v2`) |
| Sound Effects | ElevenLabs SFX |
| Conversational AI | ElevenLabs Agents (`@elevenlabs/client`) |
| Testing | Vitest + fast-check (property-based) |

---

### Environment Variables

Create a `.env` file in the root:

```env
# ElevenLabs
VITE_ELEVENLABS_API_KEY=sk_your_key_here

# Groq
VITE_GROQ_API_KEY=gsk_your_key_here

# ElevenLabs Historian Agent (pre-created via MCP)
VITE_HISTORIAN_AGENT_ID=agent_2501kpv83qvnfpas77a74tedp0kk
```

> **Note**: The historian agent (`agent_2501kpv83qvnfpas77a74tedp0kk`) is pre-configured with the City Whispers historian persona. You can use this agent ID directly, or create your own via the ElevenLabs dashboard.

---

## 🎯 How to Use

1. **Spin the globe** — drag to rotate, scroll to zoom
2. **Click a glowing city** — or search in the top bar
3. **Choose an era** — 1800, 1850, 1900, 1920, 1950, 1980, Present, or any custom year
4. **Pick your mode**:
   - **Wander the City** — immersive multi-voice scene with ambient soundscape
   - **Documentary** — narrated historical overview (choose your narrator voice)
5. **Listen** — audio generates automatically and plays
6. **Talk to the Historian** — click the button to have a real-time voice conversation with someone who was there

---

## 🏗️ Architecture

```
src/
├── services/
│   ├── groqService.ts          # Scene + documentary script generation (dual-call pattern)
│   ├── elevenLabsService.ts    # TTS, SFX, intro synthesis with retry + backoff
│   └── documentaryService.ts  # Documentary script + progressive audio loading
├── hooks/
│   ├── useAudioPostcard.ts     # Wander mode audio orchestration + playlist sequencing
│   ├── useDocumentary.ts       # Documentary mode with segment prefetch
│   └── useHistorianConversation.ts  # ElevenLabs agent real-time conversation
├── components/
│   ├── globe/                  # 3D Earth, city markers, atmosphere, clouds, starfield
│   └── ui-extras/              # CityPanel, HistorianWidget, EraCard, ModeCard, TopBar
└── data/
    ├── cities.ts               # 100+ cities with coordinates and whisper taglines
    ├── eras.ts                 # 7 historical eras (1800–Present)
    └── voices.ts               # 6 narrator voices for documentary mode
```

### ElevenLabs APIs Used

| API | Usage |
|-----|-------|
| `textToSpeech.convert()` | Intro clips, 8 character voices, documentary narration |
| `textToSoundEffects.convert()` | Ambient soundscapes (10s loops) + scene SFX (2s clips) |
| `Conversation.startSession()` | Historian agent real-time voice conversation |

### Key Engineering Decisions

**Dual-call Groq pattern**: Scene generation uses two parallel API calls — one for structured JSON fields (event name, atmosphere, soundscape prompt) and one for plain-text VOICE/SFX script lines. This sidesteps JSON escaping failures when the model generates multilingual dialogue with brackets and special characters.

**Progressive documentary loading**: Only segment 0 is synthesised before playback starts. Segments 1–3 are prefetched in the background at the 30-second mark of each segment, eliminating wait time between chapters.

**AbortController throughout**: Every async pipeline (scene generation, TTS, SFX) is wired to an AbortController so switching cities or eras mid-generation cleanly cancels all in-flight requests and revokes object URLs.

**Exponential backoff on 429s**: All ElevenLabs API calls retry up to 3 times with 1s/2s/4s delays on rate limit errors, making the app resilient to burst usage.

---

## 🔬 How Kiro Was Used

This project was built entirely using **Kiro's spec-driven development** approach. Every feature started as a spec before a single line of code was written.

### Spec-Driven Development

The `.kiro/specs/` directory contains **21 specs** covering every feature and bugfix:

**Feature Specs**:
| Spec | What It Built |
|------|--------------|
| `historical-audio-postcard/` | Core Groq + ElevenLabs audio pipeline |
| `dual-mode-audio-experience/` | Wander vs Documentary mode selection UI |
| `short-documentary/` | Initial documentary narration feature |
| `progressive-documentary-audio/` | Background prefetch for seamless playback |
| `scene-intro-audio/` | TTS intro clip before scene voices |
| `historian-agent/` | ElevenLabs conversational AI agent integration |
| `custom-historian-ui/` | Custom React UI using `@elevenlabs/client` |
| `historian-ui-redesign/` | Cinematic full-screen historian overlay |
| `ui-typography-scale/` | Typography and visual polish |
| `ui-center-longer-scene/` | Layout improvements for longer scenes |

**Bugfix Specs** (each documents a real bug, root cause, and fix):
| Spec | Bug Fixed |
|------|----------|
| `groq-json-script-fix/` | JSON escaping failures with multilingual dialogue |
| `documentary-segment-parse-fix/` | Segment parsing breaking on certain Groq outputs |
| `elevenlabs-api-error-handling/` | Unhandled 429 rate limit errors crashing the app |
| `mode-switch-audio-cleanup/` | Audio continuing to play after switching modes |
| `immersive-scene-audio/` | Scene audio not interleaving correctly with SFX |
| `scene-audio-immersion-fix/` | Ambient soundscape not looping properly |
| `multi-voice-scene-audio/` | Multiple voices not synthesising in parallel |
| `event-specific-sequenced-audio/` | SFX not matching the specific historical event |
| `audio-loop-realism-fix/` | Ambient loop creating jarring click at loop point |
| `scene-ui-audio-polish/` | UI state not reflecting audio playback state |
| `historian-session-cleanup/` | Conversation session not cleaning up on unmount |

Each spec follows the requirements → design → tasks workflow. Kiro implemented each spec systematically, catching edge cases that vibe coding would have missed.

### MCP Integration

The **ElevenLabs Kiro Power** was installed and configured in `.kiro/settings/mcp.json`. This gave Kiro direct access to 25+ ElevenLabs tools, enabling:
- **Agent creation**: The historian agent was created directly via the `create_agent` MCP tool — no dashboard needed
- **Voice discovery**: `search_voices` and `search_voice_library` to find the right voices for each character role
- **Model verification**: `list_models` to confirm `eleven_multilingual_v2` supports all target languages
- **Live testing**: `text_to_speech` and `text_to_sound_effects` MCP tools to test prompts during development without writing code

### Agent Hooks

Hooks in `.kiro/hooks/` automated key development workflows:
- **Lint on save**: ESLint runs automatically on every `.ts`/`.tsx` file edit
- **Post-task testing**: `npm test` runs automatically after each spec task completes
- **Build verification**: Build check triggered before committing

### Steering Docs

Custom steering in `.kiro/steering/` provided project-specific context to Kiro across all sessions:
- `project-standards.md` — TypeScript strict mode, functional components, Tailwind conventions
- `elevenlabs-integration.md` — API error handling patterns, retry logic, object URL cleanup
- `audio-architecture.md` — AbortController patterns, playlist sequencing, memory management

### Vibe Coding + Spec Hybrid

The project used both approaches strategically:
- **Vibe coding** for rapid iteration on UI layout, prompt engineering, and visual polish
- **Spec-driven** for complex features (audio pipeline, agent integration, error handling, memory cleanup)

The spec approach was critical for the audio pipeline — managing AbortControllers, playlist sequencing, memory cleanup, and rate limit handling required formal requirements to get right. The bugfix specs in particular were invaluable: documenting the exact bug condition before writing any fix code led to cleaner, more targeted solutions.

---

## 📁 Repository Structure

```
.
├── .kiro/
│   ├── specs/          # 21 feature and bugfix specs
│   ├── settings/       # MCP configuration (ElevenLabs Power)
│   ├── steering/       # Project guidelines for Kiro
│   ├── hooks/          # Agent automation hooks
│   └── logs/           # Usage tracking and documentation
├── src/                # Application source
├── public/             # Static assets
└── README.md           # This file
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🏆 Hackathon Submission

**Event**: ElevenLabs × Kiro Hackathon (Hack #5)

**Category**: Creative / Entertainment

**ElevenLabs APIs Used**:
- Text-to-Speech (`eleven_multilingual_v2`) — character voices + documentary narration
- Sound Effects — ambient soundscapes + scene SFX
- Conversational AI Agents — real-time historian voice conversation

**Kiro Features Used**:
- Spec-driven development (21 specs)
- MCP integration (ElevenLabs Power — 25+ tools)
- Steering docs (project standards + ElevenLabs patterns)
- Agent hooks (lint on save, post-task testing)
- Vibe coding (UI iteration, prompt engineering)

**Social**: Tag [@kirodotdev](https://twitter.com/kirodotdev) and [@elevenlabsio](https://twitter.com/elevenlabsio) with `#ElevenHacks #CodeWithKiro`

---

*Built with ❤️ using [Kiro](https://kiro.dev) and [ElevenLabs](https://elevenlabs.io)*
