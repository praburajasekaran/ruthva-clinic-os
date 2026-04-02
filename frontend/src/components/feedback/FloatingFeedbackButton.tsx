"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

export function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-lg transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-xl active:scale-95"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
