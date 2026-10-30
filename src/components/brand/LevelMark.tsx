type LevelMarkVariant = "green" | "white" | "mono";

type LevelMarkProps = {
  size?: number;
  variant?: LevelMarkVariant;
  /** When true, the mark is hidden from assistive tech. */
  decorative?: boolean;
  title?: string;
  className?: string;
};

const fills: Record<LevelMarkVariant, string> = {
  green: "var(--color-accent-primary, #00F050)",
  white: "var(--color-text-primary, #FFFFFF)",
  mono: "currentColor",
};

/** Five ascending bars — the Level Shift progression mark. */
export function LevelMark({
  size = 24,
  variant = "green",
  decorative = true,
  title = "LevelUp Digital mark",
  className,
}: LevelMarkProps) {
  const fill = fills[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      {decorative ? null : <title>{title}</title>}
      <rect x="1" y="22" width="4" height="8" fill={fill} />
      <rect x="7.5" y="17" width="4" height="13" fill={fill} />
      <rect x="14" y="12" width="4" height="18" fill={fill} />
      <rect x="20.5" y="7" width="4" height="23" fill={fill} />
      <rect x="27" y="2" width="4" height="28" fill={fill} />
    </svg>
  );
}
