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
        className="no-print fixed right-0 top-1/2 z-50 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-500 shadow-md transition-all [writing-mode:vertical-lr] hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg active:scale-95"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-3.5 w-3.5 rotate-90" aria-hidden="true" />
        Feedback
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
