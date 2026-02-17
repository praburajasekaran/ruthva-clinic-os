"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

type FormSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  id?: string;
};

export function FormSection({
  title,
  defaultOpen = true,
  children,
  id,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={id} className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="border-t border-gray-200 px-6 py-4">{children}</div>}
    </section>
  );
}
