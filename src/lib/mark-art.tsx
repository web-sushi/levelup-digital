const BAR_STEPS = [8, 13, 18, 23, 28] as const;

/** Five ascending bars from the Level Shift mark, sized for generated images. */
export function LevelBars({
  barWidth,
  gap,
  maxHeight,
}: {
  barWidth: number;
  gap: number;
  maxHeight: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      {BAR_STEPS.map((step) => (
        <div
          key={step}
          style={{
            width: barWidth,
            height: Math.max(2, Math.round((step / 28) * maxHeight)),
            background: "#00F050",
          }}
        />
      ))}
    </div>
  );
}
