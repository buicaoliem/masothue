import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  buildProfileSubmissionMessage,
  buildRemovalRequestMessage,
  buildSponsorLeadMessage,
  notifyAdmin,
} from "./telegram";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
});

test("buildProfileSubmissionMessage includes public fields and admin link", () => {
  const msg = buildProfileSubmissionMessage({
    companyName: "Công ty ABC",
    mst: "0300588569",
    groupLabel: "Kế toán, thuế",
    provinceName: "TP. Hồ Chí Minh",
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.match(msg, /Công ty ABC/);
  assert.match(msg, /0300588569/);
  assert.match(msg, /Kế toán, thuế/);
  assert.match(msg, /TP\. Hồ Chí Minh/);
  assert.match(msg, /https:\/\/masothuedn\.com\/admin/);
});

test("buildSponsorLeadMessage includes group, province, mst and admin link", () => {
  const msg = buildSponsorLeadMessage({
    groupLabel: "Quảng cáo, marketing",
    provinceName: "TP. Hà Nội",
    mst: "0101248141",
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.match(msg, /Quảng cáo, marketing/);
  assert.match(msg, /TP\. Hà Nội/);
  assert.match(msg, /0101248141/);
  assert.match(msg, /https:\/\/masothuedn\.com\/admin/);
});

test("buildSponsorLeadMessage omits the MST line when not provided", () => {
  const msg = buildSponsorLeadMessage({
    groupLabel: "Quảng cáo, marketing",
    provinceName: "TP. Hà Nội",
    mst: null,
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.doesNotMatch(msg, /MST:/);
});

test("buildRemovalRequestMessage includes the tax code and company name when known", () => {
  const msg = buildRemovalRequestMessage({
    taxCode: "0300588569",
    companyName: "Công ty ABC",
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.match(msg, /0300588569/);
  assert.match(msg, /Công ty ABC/);
});

test("buildRemovalRequestMessage omits the company name line when unknown", () => {
  const msg = buildRemovalRequestMessage({
    taxCode: "0300588569",
    companyName: null,
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.doesNotMatch(msg, /Doanh nghiệp:/);
});

test("none of the message builders leak submitter contact details", () => {
  const msg = buildProfileSubmissionMessage({
    companyName: "Công ty ABC",
    mst: "0300588569",
    groupLabel: "Kế toán, thuế",
    provinceName: "TP. Hồ Chí Minh",
    adminUrl: "https://masothuedn.com/admin",
  });
  assert.doesNotMatch(msg, /0912|Nguyễn Văn|@/);
});

test("notifyAdmin does nothing when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is unset", async () => {
  let called = false;
  global.fetch = (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch;

  await notifyAdmin("hello");
  assert.equal(called, false);
});

test("notifyAdmin does not throw when the fetch call fails", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";
  global.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  await assert.doesNotReject(() => notifyAdmin("hello"));
});

test("notifyAdmin sends the message to the Telegram API when configured", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";
  let capturedUrl = "";
  let capturedBody: { chat_id?: string; text?: string } = {};
  global.fetch = (async (url: string | URL, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  await notifyAdmin("hello world");
  assert.match(capturedUrl, /bottest-token\/sendMessage/);
  assert.equal(capturedBody.chat_id, "12345");
  assert.equal(capturedBody.text, "hello world");
});
