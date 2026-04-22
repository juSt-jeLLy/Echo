# Design Document: Historian Agent

## Overview

A single ElevenLabs Conversational AI agent (`agent_2501kpv83qvnfpas77a74tedp0kk`) acts as a context-aware local historian. The agent is embedded via the `@elevenlabs/convai-widget-embed` web component directly inside the CityPanel. Dynamic variables (city, country, year, event) are injected at conversation start so the agent speaks as if physically present in that city at that historical moment.

## Architecture

```
CityPanel
├── Mode toggle (Wander / Documentary)
├── Scene info (event name + atmosphere)
├── Playback controls (play/pause)
├── HistorianWidget (shown when isConversing=true)
│   └── <elevenlabs-convai> web component
│       ├── agent-id: agent_2501kpv83qvnfpas77a74tedp0kk
│       └── dynamic-variables: { city, country, year, event }
└── Footer
    ├── "Talk to Historian" button (shown when isConversing=false)
    └── "Explore another city →"
```

## Agent Configuration

- **Agent ID**: `agent_2501kpv83qvnfpas77a74tedp0kk`
- **Voice**: George (JBFqnCBsd6RMkjVDRZzb) — warm, captivating storyteller
- **LLM**: gemini-2.0-flash-001
- **System Prompt**: Uses `{{city}}`, `{{country}}`, `{{year}}`, `{{event}}` dynamic variables
- **Persona**: Local historian physically present in the city at that moment — speaks in first person, uses period-appropriate language, references sights/sounds around them

## Audio Coordination

| State | Scene Audio | Ambient Audio |
|-------|-------------|---------------|
| Normal playback | Playing (vol 1.0) | Playing (vol 0.3) |
| Conversation active | Paused | Playing (vol 0.15) |
| Conversation ended | Resumed | Playing (vol 0.3) |

## New Files

### `src/hooks/useHistorianAgent.ts`
Manages conversation state. Exposes `isConversing`, `startConversation`, `endConversation`. Coordinates audio pause/resume via refs.

### `src/components/ui-extras/HistorianWidget.tsx`
Loads the `@elevenlabs/convai-widget-embed` script once. Renders the `<elevenlabs-convai>` web component with dynamic variables. Shows a green "connected" indicator and an × button to end the conversation.

## Data Flow

```
User clicks "Talk to Historian"
  → handleStartConversation()
    → active.toggle() (pauses scene audio)
    → setIsConversing(true)
    → HistorianWidget renders
    → <elevenlabs-convai> activates with city/era context
    → Ambient continues at vol 0.15

User clicks × to end
  → handleEndConversation()
    → setIsConversing(false)
    → HistorianWidget unmounts
    → active.toggle() (resumes scene audio)
    → Ambient returns to vol 0.3
```

## Widget Embed

```tsx
<elevenlabs-convai
  agent-id="agent_2501kpv83qvnfpas77a74tedp0kk"
  dynamic-variables='{"city":"London","country":"UK","year":"1666","event":"Great Fire of London"}'
  variant="expanded"
  avatar-orb-color-1="hsl(200 95% 60%)"
  avatar-orb-color-2="hsl(265 85% 65%)"
/>
```

## Correctness Properties

1. **Audio isolation**: Scene audio is always paused before conversation starts
2. **Ambient continuity**: Ambient never stops during conversation — only volume changes
3. **Resume fidelity**: Scene audio resumes from the exact position it was paused
4. **Context accuracy**: Dynamic variables always reflect the current city/era/event
