type RiskLevel = "stable" | "watch" | "at_risk" | "critical";
type BadgeSize = "sm" | "md";

type RiskBadgeProps = {
  level: RiskLevel;
  size?: BadgeSize;
  showLabel?: boolean;
};

const riskConfig: Record<RiskLevel, { label: string; classes: string }> = {
  stable: {
    label: "Stable",
    classes: "border border-[color:var(--color-risk-stable)]/20 text-risk-stable bg-[color:var(--color-risk-stable)]/10",
  },
  watch: {
    label: "Watch",
    classes: "border border-[color:var(--color-risk-watch)]/20 text-risk-watch bg-[color:var(--color-risk-watch)]/10",
  },
  at_risk: {
    label: "At Risk",
    classes: "border border-[color:var(--color-risk-at-risk)]/20 text-risk-at-risk bg-[color:var(--color-risk-at-risk)]/10",
  },
  critical: {
    label: "Critical",
    classes: "border border-[color:var(--color-risk-critical)]/20 text-risk-critical bg-[color:var(--color-risk-critical)]/10",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

export function RiskBadge({
  level,
  size = "sm",
  showLabel = true,
}: RiskBadgeProps) {
  const config = riskConfig[level] ?? riskConfig.stable;

  if (!showLabel) {
    return (
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${config.classes}`}
        aria-label={config.label}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${config.classes} ${sizeStyles[size]}`}
    >
      {config.label}
    </span>
  );
}
