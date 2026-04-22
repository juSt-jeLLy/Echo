# Kiro Configuration — City Whispers

This directory contains all Kiro-related configuration, specs, hooks, steering, and logs for the City Whispers hackathon submission.

## Directory Structure

```
.kiro/
├── README.md                              # This file
├── HACKATHON.md                           # Hackathon submission checklist and writeup
├── specs/                                 # 21 feature and bugfix specs
│   ├── historical-audio-postcard/         # Core Groq + ElevenLabs audio pipeline
│   ├── dual-mode-audio-experience/        # Wander vs Documentary mode
│   ├── short-documentary/                 # Initial documentary feature
│   ├── progressive-documentary-audio/     # Background segment prefetch
│   ├── scene-intro-audio/                 # TTS intro clip
│   ├── historian-agent/                   # ElevenLabs conversational agent
│   ├── custom-historian-ui/               # React UI for agent conversation
│   ├── historian-ui-redesign/             # Cinematic historian overlay
│   ├── ui-typography-scale/               # Typography polish
│   ├── ui-center-longer-scene/            # Layout improvements
│   ├── groq-json-script-fix/              # [bugfix] JSON escaping with multilingual dialogue
│   ├── documentary-segment-parse-fix/     # [bugfix] Segment parsing failures
│   ├── elevenlabs-api-error-handling/     # [bugfix] 429 rate limit crashes
│   ├── mode-switch-audio-cleanup/         # [bugfix] Audio continuing after mode switch
│   ├── immersive-scene-audio/             # [bugfix] Voice/SFX interleaving
│   ├── scene-audio-immersion-fix/         # [bugfix] Ambient loop issues
│   ├── multi-voice-scene-audio/           # [bugfix] Parallel voice synthesis
│   ├── event-specific-sequenced-audio/    # [bugfix] SFX not matching event
│   ├── audio-loop-realism-fix/            # [bugfix] Loop click artifact
│   ├── scene-ui-audio-polish/             # [bugfix] UI state sync with audio
│   └── historian-session-cleanup/         # [bugfix] Session cleanup on unmount
├── hooks/                                 # Agent automation hooks
│   ├── lint-on-save.json                  # ESLint on every .ts/.tsx save
│   ├── post-task-tests.json               # npm test after each spec task
│   └── build-verify.json                  # Manual build verification trigger
├── steering/                              # Custom steering files
│   ├── project-standards.md               # TypeScript conventions, file organization
│   ├── elevenlabs-integration.md          # API patterns, retry logic, memory management
│   └── audio-architecture.md             # AbortController, playlist, progressive loading
├── settings/
│   └── mcp.json                           # ElevenLabs MCP server configuration
└── logs/
    ├── elevenlabs-usage.md                # All ElevenLabs APIs, voices, and error handling
    ├── vibe-coding.md                     # Conversation logs and key generations
    ├── mcp-usage.md                       # MCP tools used and impact
    ├── powers-usage.md                    # ElevenLabs Power usage and steering files loaded
    └── hooks-usage.md                     # Hook definitions and workflow improvements
```

## For Judges

### Spec-Driven Development
See `specs/` — 21 specs covering every feature and bugfix. Each follows the requirements → design → tasks workflow. The bugfix specs are particularly illustrative: they document the exact bug condition, root cause analysis, and fix strategy before any code is written.

### MCP Integration
See `settings/mcp.json` and `logs/mcp-usage.md`. The ElevenLabs Power provided 25 MCP tools. Most impactful: `create_agent` (historian agent created in 2 minutes), `search_voices` (voice selection), and `text_to_sound_effects` (SFX prompt tuning during development).

### Agent Hooks
See `hooks/` — 3 hooks automating lint, testing, and build verification. The `postTaskExecution` hook was most valuable, running `npm test` automatically after every spec task to catch regressions immediately.

### Steering Docs
See `steering/` — 3 steering files providing project-specific context across all sessions. `audio-architecture.md` was especially important for maintaining consistent AbortController and memory management patterns across 21 specs.

### Vibe Coding
See `logs/vibe-coding.md` — documents 5 key sessions showing how natural language prompts drove complex code generation (the `useAudioPostcard` hook, the dual-call Groq pattern, the historian agent system prompt).

---

*Last Updated: April 23, 2026*
