"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Script from "next/script";

export interface TurnstileHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  action: string;
  onToken: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          callback: (token: string) => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "";
export const TURNSTILE_ENABLED = SITEKEY !== "";

const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ action, onToken }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        onToken("");
      },
    }));

    if (!SITEKEY) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => {
            if (!containerRef.current || widgetIdRef.current || !window.turnstile) return;
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
              sitekey: SITEKEY,
              action,
              callback: onToken,
            });
          }}
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div ref={containerRef} />
        </div>
      </>
    );
  },
);

export default TurnstileWidget;
