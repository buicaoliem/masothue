import { after } from "next/server";

// Best-effort admin notifications via Telegram. Never blocks or fails the caller.

const TELEGRAM_API = "https://api.telegram.org";
const TIMEOUT_MS = 3000;

let warnedMissingConfig = false;

/** Sends `text` to TELEGRAM_CHAT_ID via the bot API. No-op (logged once) when env is unset. Never throws. */
export async function notifyAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (!warnedMissingConfig) {
      console.log("[notify/telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping notification.");
      warnedMissingConfig = true;
    }
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!res.ok) console.error(`[notify/telegram] sendMessage failed with status ${res.status}`);
  } catch (err) {
    console.error("[notify/telegram] sendMessage error:", err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Defers `build` + notifyAdmin to run after the response is sent (via Next.js `after()`), so the
 * caller's form response isn't delayed. Falls back to fire-and-forget when `after()` has no request
 * context to attach to (e.g. outside a server action/route handler, such as in tests).
 */
export function scheduleNotify(build: () => Promise<string> | string): void {
  const run = async () => notifyAdmin(await build());
  try {
    after(run);
  } catch {
    void run();
  }
}

export function buildProfileSubmissionMessage(input: {
  companyName: string;
  mst: string;
  groupLabel: string;
  provinceName: string;
  adminUrl: string;
}): string {
  return [
    "🆕 Hồ sơ mới chờ duyệt",
    `Doanh nghiệp: ${input.companyName}`,
    `MST: ${input.mst}`,
    `Ngành: ${input.groupLabel}`,
    `Tỉnh/thành: ${input.provinceName}`,
    input.adminUrl,
  ].join("\n");
}

export function buildSponsorLeadMessage(input: {
  groupLabel: string;
  provinceName: string;
  mst: string | null;
  adminUrl: string;
}): string {
  const lines = ["💰 Yêu cầu báo giá vị trí nổi bật", `Ngành: ${input.groupLabel}`, `Tỉnh/thành: ${input.provinceName}`];
  if (input.mst) lines.push(`MST: ${input.mst}`);
  lines.push(input.adminUrl);
  return lines.join("\n");
}

export function buildRemovalRequestMessage(input: {
  taxCode: string;
  companyName: string | null;
  adminUrl: string;
}): string {
  const lines = ["🗑 Yêu cầu gỡ thông tin", `MST: ${input.taxCode}`];
  if (input.companyName) lines.push(`Doanh nghiệp: ${input.companyName}`);
  lines.push(input.adminUrl);
  return lines.join("\n");
}
