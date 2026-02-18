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
          className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs font-mono leading-none text-gray-500"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
