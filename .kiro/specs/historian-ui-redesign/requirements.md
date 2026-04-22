# Requirements: Historian UI Redesign

## Problem
The ElevenLabs widget renders with a white background inside the dark glassmorphism card, creating a jarring visual clash. The widget is also cramped and partially cut off.

## Solution
Move the historian widget into a **full-screen dark overlay modal** that sits above everything. The CityPanel stays visible but dimmed behind it. The overlay matches the app's cinematic dark aesthetic.

## Requirements

### Requirement 1: Full-screen overlay
- When "Talk to Historian" is clicked, a full-screen overlay appears (z-50)
- Overlay background: dark semi-transparent (`bg-background/90 backdrop-blur-xl`)
- The globe and CityPanel are visible but dimmed behind it

### Requirement 2: Overlay layout
- Centered content with the historian's identity at the top
- Large title: "The Historian" with city + era subtitle
- The ElevenLabs widget centered in the middle with enough space
- "End Conversation" button at the bottom

### Requirement 3: Widget container
- Widget container has a dark background (`bg-card/40`) with rounded corners
- No white background visible — the widget's white bg is hidden by overflow-hidden + dark wrapper
- Widget is given enough height (400px+) to display properly

### Requirement 4: Status indicator
- Show "Listening..." / "Talking..." status text with animated indicator
- Pulsing green dot when listening, pulsing primary dot when talking

### Requirement 5: CityPanel button
- "Talk to Historian" button in footer remains
- When conversation is active, button changes to "End Conversation" (red)
- Clicking either opens/closes the overlay
