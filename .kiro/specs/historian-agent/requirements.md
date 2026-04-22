# Requirements: Historian Agent

## Introduction

A "Talk to Historian" button appears in both Wander and Documentary modes of the CityPanel. When clicked, the scene audio (voices/narration) pauses but the ambient background sound continues playing. An ElevenLabs conversational AI agent widget opens — the agent speaks and behaves as a local historian who is physically present in that city at that exact historical moment. The user can have a real-time voice conversation asking questions about the city, the era, and what is happening around them. When the conversation ends, the scene audio resumes from where it paused.

## Requirements

### Requirement 1: Historian Agent Creation
- A single ElevenLabs conversational agent is created with a dynamic system prompt
- The agent persona: a knowledgeable local historian who is PRESENT in the city at that time — speaks in first person as if they are there, uses period-appropriate language, references what is happening around them right now
- System prompt is dynamically constructed with city name, country, era year, and event name
- Example: "You are a historian living in London in 1666 during the Great Fire of London. You are standing on the streets watching the fire spread. Speak as if you are there right now..."
- Agent uses George voice (id: JBFqnCBsd6RMkjVDRZzb) for consistency with the intro

### Requirement 2: Talk to Historian Button
- A "Talk to Historian" button appears in the CityPanel footer area in both modes
- Button shows a microphone icon and "Talk to Historian" label
- Button is disabled while audio is loading

### Requirement 3: Audio Behavior on Conversation Start
- When user clicks "Talk to Historian":
  - Scene audio (voices/narration playlist) pauses immediately
  - Ambient background sound continues playing at reduced volume (0.15)
  - The ElevenLabs widget opens/activates

### Requirement 4: Audio Behavior on Conversation End
- When user ends the conversation:
  - Ambient volume returns to normal (0.3)
  - Scene audio resumes from where it paused
  - Widget closes/hides

### Requirement 5: Widget Integration
- Use `@elevenlabs/convai-widget-embed` script for the widget
- Widget is embedded inline in the CityPanel (not floating)
- Widget shows/hides based on conversation state
- Agent ID is passed dynamically

### Requirement 6: Agent is Context-Aware
- The agent knows: city name, country, era year, event name, mode (wander/documentary)
- In Wander mode: agent references the specific historical event happening around them
- In Documentary mode: agent can discuss the broader historical context of the era
