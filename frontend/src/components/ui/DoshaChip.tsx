"use client";

import { Wind, Flame, Droplet } from "lucide-react";

const DOSHA_CONFIG = {
  vatham: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    icon: Wind,
    label: "Vatham",
    labelTamil: "\u0BB5\u0BBE\u0BA4\u0BAE\u0BCD",
  },
  pitham: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    icon: Flame,
    label: "Pitham",
    labelTamil: "\u0BAA\u0BBF\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD",
  },
  kapham: {
    bg: "bg-teal-100",
    text: "text-teal-700",
    icon: Droplet,
    label: "Kapham",
    labelTamil: "\u0B95\u0BAA\u0BAE\u0BCD",
  },
} as const;

type DoshaType = keyof typeof DOSHA_CONFIG;

type DoshaChipProps = {
  dosha: DoshaType;
  showTamil?: boolean;
};

export function DoshaChip({ dosha, showTamil = true }: DoshaChipProps) {
  const config = DOSHA_CONFIG[dosha];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${config.bg} ${config.text}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label}
      {showTamil && (
        <span lang="ta" className="text-xs opacity-75">
          {config.labelTamil}
        </span>
      )}
    </span>
  );
}

/** Check if a string matches a supported dosha type */
export function isDoshaType(value: string): value is DoshaType {
  return value.toLowerCase() in DOSHA_CONFIG;
}
