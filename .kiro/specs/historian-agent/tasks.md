# Tasks

- [x] 1. Create historian agent via ElevenLabs MCP
  - Create agent with George voice and dynamic system prompt template
  - Store agent ID

- [x] 2. Create `src/hooks/useHistorianAgent.ts`
  - Manages conversation state (idle/active)
  - Handles audio pause/resume on conversation start/end
  - Exposes: isConversing, startConversation, endConversation

- [x] 3. Create `src/components/ui-extras/HistorianWidget.tsx`
  - Embeds @elevenlabs/convai-widget-embed script
  - Shows/hides based on isConversing state
  - Passes agent ID and dynamic variables

- [x] 4. Update `src/components/ui-extras/CityPanel.tsx`
  - Add "Talk to Historian" button in footer
  - Wire up useHistorianAgent hook
  - Pass ambient ref for volume control

- [x] 5. Build verification
