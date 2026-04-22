# Bugfix: Historian Session Cleanup

## Bugs

### Bug 1: Mode switch triggers historian auto-start
When switching between Wander/Documentary modes, `activeMode` changes which causes `eventName` to change, which is passed to `HistorianWidget`. The `useHistorianConversation` hook is called with new args, and the `useEffect` in `HistorianWidget` fires `startConversation()` even though `isConversing` is false — because the effect dependency on `status` triggers when the hook reinitializes.

**Root cause**: `HistorianWidget` is always rendered (even when `isConversing=false`) because it's inside `CityPanel`. The `useHistorianConversation` hook is always instantiated. When mode changes, the hook re-runs with new `eventName`, resetting `status` to "idle", which triggers the `useEffect` condition `isConversing && status === "idle"` — but `isConversing` is still `true` from a previous session.

**Fix**: Reset `isConversing` to `false` in `CityPanel` when `activeMode` changes.

### Bug 2: Closing window doesn't stop agent
`useHistorianConversation` has no cleanup on unmount — `conversationRef.current.endSession()` is never called when the component unmounts (e.g. user closes CityPanel or navigates away).

**Fix**: Add a `useEffect` cleanup in `useHistorianConversation` that calls `endSession()` on unmount.

## Files to fix
- `src/hooks/useHistorianConversation.ts` — add unmount cleanup
- `src/components/ui-extras/CityPanel.tsx` — reset `isConversing` on mode change
