type KbdBadgeProps = {
  keys: string[];
  "aria-label"?: string;
};

/**
 * Visual keyboard shortcut hint badge.
 * Only rendered on desktop (hidden md:inline-flex).
 * Hidden in print layouts via the no-print class.
 */
export function KbdBadge({ keys, "aria-label": ariaLabel }: KbdBadgeProps) {
  return (
    <span
      className="no-print hidden items-center gap-0.5 md:inline-flex"
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="rounded-md border border-border-strong bg-surface-raised px-1.5 py-0.5 text-xs font-mono leading-none text-text-muted"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
