"use client";

import { useEffect, useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The contact address, written into the page only after hydration. Cloudflare's Email Obfuscation rewrites any address it
 * finds in the HTML into a /cdn-cgi/ link before React hydrates, so the server markup no longer matches and React throws
 * the tree away and re-renders it (which also broke the Turnstile widget in the forms). The server HTML carries a
 * spelled-out form that the obfuscator does not match.
 */
export function ContactEmail() {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  if (!shown) return <span>{CONTACT_EMAIL.replace("@", " [a] ")}</span>;
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}
