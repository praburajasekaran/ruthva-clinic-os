"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import type { FeedbackWidgetSession } from "@/lib/types";
import { FeedbackModal } from "./FeedbackModal";
import { QuackbackWidget } from "./QuackbackWidget";

type Panel =
  | { kind: "closed" | "loading" | "legacy" | "error" }
  | {
      kind: "widget";
      session: Extract<FeedbackWidgetSession, { provider: "quackback" }>;
    };

export function FloatingFeedbackButton() {
  const { user } = useAuth();
  if (!user?.clinic) return null;
  return (
    <FeedbackLauncher
      key={`${user.id}:${user.clinic.id}:${user.email}`}
      email={user.email}
    />
  );
}

function FeedbackLauncher({ email }: { email: string }) {
  const [panel, setPanel] = useState<Panel>({ kind: "closed" });
  const close = useCallback(() => setPanel({ kind: "closed" }), []);
  const fail = useCallback(() => setPanel({ kind: "error" }), []);

  useEffect(() => {
    if (panel.kind !== "loading") return;
    const controller = new AbortController();
    api
      .get<FeedbackWidgetSession>("/feedback/widget/", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data.provider === "legacy") setPanel({ kind: "legacy" });
        else if (data.provider === "quackback")
          setPanel({ kind: "widget", session: data });
        else fail();
      })
      .catch(() => {
        if (!controller.signal.aborted) fail();
      });
    return () => controller.abort();
  }, [panel.kind, fail]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPanel({ kind: "loading" })}
        className="no-print fixed right-0 top-1/2 z-50 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-500 shadow-md transition-all [writing-mode:vertical-lr] hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-lg active:scale-95"
        aria-label="Send feedback"
      >
        <MessageSquarePlus
          className="h-3.5 w-3.5 rotate-90"
          aria-hidden="true"
        />
        Feedback
      </button>
      {panel.kind === "legacy" && <FeedbackModal open onClose={close} />}
      <Modal
        open={["loading", "widget", "error"].includes(panel.kind)}
        onClose={close}
        title="Product feedback"
        size="lg"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Feedback is shared with Quackback. Do not include patient details or
          clinical screenshots.
        </p>
        {panel.kind === "loading" && (
          <p role="status" className="py-10 text-center text-sm">
            Loading feedback…
          </p>
        )}
        {panel.kind === "widget" && (
          <QuackbackWidget
            session={panel.session}
            email={email}
            onClose={close}
            onError={fail}
          />
        )}
        {panel.kind === "error" && (
          <div role="alert" className="py-6 text-sm">
            <p>
              Product feedback could not connect with your staff account. Use
              the Ruthva form or try again.
            </p>
            <Button
              className="mt-3"
              onClick={() => setPanel({ kind: "loading" })}
            >
              Try again
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setPanel({ kind: "legacy" })}
        >
          Use the Ruthva feedback form
        </Button>
      </Modal>
    </>
  );
}
