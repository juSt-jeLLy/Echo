# ElevenLabs x Kiro Hackathon Submission

**Project Name**: City Whispers  
**Category**: Creative / Entertainment  
**Date Started**: April 21, 2026  
**Submission Deadline**: April 23, 2026

---

## 🎯 Hackathon Requirements Checklist

### ✅ Project Requirements
- [x] Built with Kiro (spec-driven development throughout)
- [x] Uses ElevenLabs API (TTS, SFX, Conversational Agents)
- [x] Meets ElevenLabs submission guide requirements
- [x] Meets Kiro challenge requirements

### ✅ Submission Materials
- [x] Text description of features and functionality (see README.md)
- [ ] Demonstration video (YouTube/Vimeo/Facebook/Youku) — to be recorded
- [x] Public GitHub repository with open source license (MIT)
- [x] `.kiro` directory included in repository (NOT in .gitignore)
- [x] All materials in English

### ✅ Repository Requirements
- [x] Contains all source code and assets
- [x] Includes setup/installation instructions (README.md)
- [x] Has OSI-approved open source license (MIT)
- [x] `.kiro` directory at root (with specs, hooks, steering, logs, settings)

### ✅ Kiro Usage Documentation
- [x] Vibe coding examples and conversations (see `logs/vibe-coding.md`)
- [x] Agent hooks implementation (see `hooks/` directory)
- [x] Spec-driven development approach (21 specs in `specs/`)
- [x] Steering docs usage (see `steering/` directory)
- [x] MCP integration details (see `logs/mcp-usage.md` and `settings/mcp.json`)
- [x] Kiro powers leveraged (ElevenLabs Power — see `logs/powers-usage.md`)

### ✅ Social Media
- [ ] Post with @kirodotdev and @elevenlabsio tags
- [ ] Include #ElevenHacks and #CodeWithKiro hashtags

---

## 📊 Kiro Features Used

### 1. Spec-Driven Development
**Status**: ✅ Complete  
**Specs Created**: 21 (10 feature specs + 11 bugfix specs)  
**Documentation**: See `specs/` directory

Every feature in City Whispers started as a spec. The workflow was:
1. Write requirements (what the feature must do)
2. Write design (how it will be implemented)
3. Generate tasks (step-by-step implementation plan)
4. Kiro executes each task systematically

The spec approach was especially valuable for:
- The audio pipeline (AbortControllers, playlist sequencing, memory cleanup)
- The ElevenLabs agent integration (session lifecycle, error states)
- Bugfixes (documenting the exact bug condition before writing any fix)

### 2. MCP Integration (ElevenLabs Power)
**Status**: ✅ Active  
**Configuration**: `.kiro/settings/mcp.json`  
**Tools Used**: 25+ ElevenLabs MCP tools

Key MCP-powered actions during development:
- Created the historian agent via `create_agent` MCP tool (no dashboard needed)
- Discovered voice IDs via `search_voices` and `search_voice_library`
- Verified model capabilities via `list_models`
- Tested TTS prompts live via `text_to_speech` during development
- Tested SFX prompts live via `text_to_sound_effects` during development

### 3. Agent Hooks
**Status**: ✅ Active  
**Hooks Created**: 3  
**Documentation**: See `hooks/` directory

| Hook | Trigger | Action |
|------|---------|--------|
| Lint on Save | `fileEdited` (*.ts, *.tsx) | `npm run lint` |
| Post-Task Tests | `postTaskExecution` | `npm test` |
| Build Verify | `userTriggered` | `npm run build` |

### 4. Steering Docs
**Status**: ✅ Active  
**Docs Created**: 3  
**Documentation**: See `steering/` directory

| Steering File | Purpose |
|---------------|---------|
| `project-standards.md` | TypeScript conventions, component patterns, file organization |
| `elevenlabs-integration.md` | API error handling, retry logic, object URL cleanup |
| `audio-architecture.md` | AbortController patterns, playlist sequencing, memory management |

### 5. Vibe Coding
**Status**: ✅ Used throughout  
**Documentation**: See `logs/vibe-coding.md`

Used for:
- Rapid UI iteration (globe layout, panel design, typography)
- Prompt engineering for Groq scene generation
- Quick fixes and visual polish
- Exploring ElevenLabs voice options interactively

### 6. Kiro Powers
**Status**: ✅ Active  
**Powers Used**: ElevenLabs Power  
**Documentation**: See `logs/powers-usage.md`

The ElevenLabs Power provided:
- 25+ pre-configured MCP tools
- Steering files for TTS, SFX, agents, and music
- Best practices documentation
- Voice metadata and recommendations

---

## 🏆 Judging Criteria

### Potential Value
City Whispers addresses a unique niche: making history viscerally experiential through audio. Unlike text-based history apps or static audio guides, it:
- Works for any of 100+ cities × 7 eras = 700+ unique experiences
- Generates fresh, unique content every time (not pre-recorded)
- Supports real-time conversation with a contextually-aware historian
- Is accessible via browser with no installation

### Implementation
Built entirely with Kiro's spec-driven approach:
- 21 specs document every design decision
- MCP tools used for agent creation and voice discovery
- Hooks automated testing and linting throughout development
- Steering docs maintained consistent patterns across 21 specs

### Quality and Design
- Photorealistic 3D globe with atmospheric effects
- Cinematic historian overlay with animated orb
- Progressive audio loading for seamless playback
- Multilingual voice generation (characters speak in local languages)
- Exponential backoff for resilient API usage

---

## 📝 Project Description (for submission form)

City Whispers is an immersive 3D globe experience that lets you travel to any city in any historical era and hear it come alive through AI-generated audio. Click London in 1666 and hear the Great Fire — vendors screaming in English, soldiers shouting orders, church bells ringing in panic, all layered over a crackling ambient soundscape. Switch to Documentary mode and hear a narrated historical overview. Then talk to a historian who was physically present at the event, speaking in first person with period-appropriate knowledge.

Built with React + Three.js for the 3D globe, Groq for AI script generation, and the full ElevenLabs API suite: Text-to-Speech for 8 character voices + documentary narration, Sound Effects for ambient soundscapes and scene SFX, and Conversational AI Agents for the real-time historian conversation. Every feature was built using Kiro's spec-driven development approach, with 21 specs documenting requirements, design, and implementation tasks.

---

## 🎥 Demo Video

**URL**: [To be added after recording]  
**Platform**: YouTube  
**Planned Content**:
1. Globe overview — spinning, clicking cities
2. Wander mode — London 1666 (Great Fire scene)
3. Documentary mode — Tokyo 1920 with George narrator
4. Historian conversation — asking about what's happening around them
5. Multiple cities/eras to show breadth

---

## 🔗 Links

- **Repository**: [GitHub URL — to be added]
- **Demo Video**: [YouTube URL — to be added]
- **Live Demo**: [Deployed URL — to be added]

---

*Last Updated: April 23, 2026*
