"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Explicitly rendered Cloudflare Turnstile. The implicit `<div class="cf-turnstile">` mode depended on the widget script
 * finding that div before React touched it, and its hidden token input was outside React's control. Here the token is
 * React state, posted as `cf-turnstile-response`. A token is single-use, so the widget is reset whenever `resetKey`
 * changes (pass the action state: it changes after every server answer).
 */
export function TurnstileField({ siteKey, resetKey, onToken }: { siteKey: string; resetKey: unknown; onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile || widget.current) return;
    const set = (t: string) => {
      setToken(t);
      onTokenRef.current(t);
    };
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      "response-field": false,
      callback: (t: string) => {
        setFailed(false);
        set(t);
      },
      "expired-callback": () => set(""),
      "error-callback": () => {
        setFailed(true);
        set("");
      },
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [ready, siteKey]);

  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    if (widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      setToken("");
      onTokenRef.current("");
    }
  }, [resetKey]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={box} />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
      {failed && <p role="alert">Không tải được bước xác minh chống máy tự động. Vui lòng tắt chặn quảng cáo cho trang này hoặc tải lại trang.</p>}
    </>
  );
}
