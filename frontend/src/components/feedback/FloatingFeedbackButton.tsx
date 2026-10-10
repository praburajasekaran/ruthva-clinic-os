"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FeedbackModal } from "./FeedbackModal";

export function FloatingFeedbackButton() {
  const { user } = useAuth();
  if (!user?.clinic) return null;
  return <FeedbackLauncher key={`${user.id}:${user.clinic.id}`} />;
}

function FeedbackLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-md transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg active:scale-95 md:bottom-auto md:right-0 md:top-1/2 md:z-50 md:min-h-0 md:-translate-y-1/2 md:gap-1.5 md:rounded-none md:rounded-l-lg md:border-r-0 md:px-2.5 md:text-xs md:[writing-mode:vertical-lr]"
        aria-label="Send feedback"
      >
        <MessageSquarePlus
          className="h-4 w-4 md:h-3.5 md:w-3.5 md:rotate-90"
          aria-hidden="true"
        />
        Feedback
      </button>
      {open && <FeedbackModal open onClose={() => setOpen(false)} />}
    </>
  );
}
