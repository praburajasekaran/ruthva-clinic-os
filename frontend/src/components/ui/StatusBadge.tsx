type JourneyStatus = "active" | "completed" | "dropped";
type BadgeSize = "sm" | "md";

type StatusBadgeProps = {
  status: JourneyStatus;
  size?: BadgeSize;
};

const statusConfig: Record<JourneyStatus, { label: string; classes: string }> = {
  active: {
    label: "Active",
    classes: "border border-brand-200 bg-brand-50 text-brand-900",
  },
  completed: {
    label: "Completed",
    classes: "border border-border bg-surface-raised text-text-secondary",
  },
  dropped: {
    label: "Dropped",
    classes: "border border-red-200 bg-red-50 text-danger",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.active;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${config.classes} ${sizeStyles[size]}`}
    >
      {config.label}
    </span>
  );
}
