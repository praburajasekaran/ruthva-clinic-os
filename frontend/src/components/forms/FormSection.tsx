"use client";

import { type ReactNode, useId } from "react";

type FormSectionProps = {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  id?: string;
};

export function FormSection({
  title,
  subtitle,
  children,
  id,
}: FormSectionProps) {
  const generatedId = useId();
  const sectionId = id ?? `form-section-${generatedId}`;

  return (
    <section id={sectionId} className="space-y-5">
      <div className="border-b border-border pb-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}
