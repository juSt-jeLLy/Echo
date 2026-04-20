export function Hint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-8 z-10 animate-fade-in-slow">
      <div className="panel-glass rounded-full px-4 py-2 text-xs text-muted-foreground tracking-wide">
        Drag to spin · Scroll to zoom · Click a glowing point
      </div>
    </div>
  );
}
