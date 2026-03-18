type BilingualLabelProps = {
  english: string;
  tamil: string;
  required?: boolean;
  htmlFor?: string;
  as?: "label" | "span" | "h3";
  className?: string;
};

export function BilingualLabel({
  english,
  tamil,
  required,
  htmlFor,
  as: Tag = "label",
  className = "",
}: BilingualLabelProps) {
  const baseProps = Tag === "label" && htmlFor ? { htmlFor } : {};

  return (
    <Tag {...baseProps} className={`block ${className}`}>
      <span className="text-sm font-medium text-gray-700">{english}</span>
      <span lang="ta" className="ml-1.5 text-xs text-gray-500">{tamil}</span>
      {required && (
        <>
          <span className="text-red-600" aria-hidden="true">
            {" "}
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      )}
    </Tag>
  );
}
