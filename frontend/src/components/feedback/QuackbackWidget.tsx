"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedbackWidgetSession } from "@/lib/types";

type Props = {
  session: Extract<FeedbackWidgetSession, { provider: "quackback" }>;
  email: string;
  onClose: () => void;
  onError: () => void;
};

export function QuackbackWidget({ session, email, onClose, onError }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"connecting" | "verified">("connecting");

  useEffect(() => {
    const origin = session.instance_url;
    let phase: "waiting" | "identifying" | "verified" = "waiting";
    const mobile = window.matchMedia("(max-width: 639px)");
    const sendMobile = () =>
      iframe.current?.contentWindow?.postMessage(
        { type: "quackback:mobile", data: mobile.matches },
        origin,
      );
    const timeout = window.setTimeout(onError, 15000);
    const matchesStaff = (user: unknown) =>
      user !== null &&
      typeof user === "object" &&
      "email" in user &&
      typeof user.email === "string" &&
      user.email.toLowerCase() === email.toLowerCase();
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== origin ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      const message = event.data;
      if (!message || typeof message !== "object" || !("type" in message))
        return;
      if (message.type === "quackback:ready" && phase === "waiting") {
        phase = "identifying";
        sendMobile();
        iframe.current?.contentWindow?.postMessage(
          { type: "quackback:identify", data: { ssoToken: session.sso_token } },
          origin,
        );
      } else if (
        message.type === "quackback:identify-result" &&
        phase !== "waiting"
      ) {
        if (
          !("success" in message) ||
          message.success !== true ||
          !("user" in message) ||
          !matchesStaff(message.user)
        ) {
          onError();
          return;
        }
        phase = "verified";
        window.clearTimeout(timeout);
        setStatus("verified");
        iframe.current?.contentWindow?.postMessage(
          { type: "quackback:open", data: { view: "feedback" } },
          origin,
        );
      } else if (
        message.type === "quackback:auth-change" &&
        phase === "verified"
      ) {
        if (!("user" in message) || !matchesStaff(message.user)) onError();
      } else if (message.type === "quackback:close") {
        onClose();
      } else if (
        message.type === "quackback:navigate" &&
        phase === "verified" &&
        "url" in message &&
        typeof message.url === "string"
      ) {
        try {
          const destination = new URL(message.url);
          if (
            destination.origin === origin &&
            !destination.username &&
            !destination.password
          )
            window.open(destination.href, "_blank", "noopener,noreferrer");
        } catch {
          return;
        }
      }
    };
    window.addEventListener("message", receive);
    mobile.addEventListener("change", sendMobile);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      mobile.removeEventListener("change", sendMobile);
    };
  }, [session, email, onClose, onError]);

  return (
    <div className="relative h-[min(65dvh,640px)] min-h-[240px]">
      {status === "connecting" && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
          Connecting to product feedback…
        </p>
      )}
      <iframe
        ref={iframe}
        title="Ruthva product feedback"
        src={`${session.instance_url}/widget`}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
        referrerPolicy="no-referrer"
        onError={onError}
        className="h-full w-full rounded-lg border-0"
        style={{ visibility: status === "verified" ? "visible" : "hidden" }}
      />
    </div>
  );
}
