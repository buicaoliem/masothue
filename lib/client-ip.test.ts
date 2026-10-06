import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clientIpFrom, isCloudflareIp } from "./client-ip";
import { resolveClientIp } from "./directory/security";

const h = (o: Record<string, string>) => (n: string) => o[n.toLowerCase()] ?? null;

describe("clientIpFrom", () => {
  test("direct Railway request: uses x-real-ip, ignores a forged CF header", () => {
    assert.equal(clientIpFrom(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "203.0.113.9" })), "203.0.113.9");
  });
  test("direct Railway request without x-real-ip: last x-forwarded-for entry wins over client-supplied ones", () => {
    assert.equal(clientIpFrom(h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9" })), "203.0.113.9");
  });
  test("via Cloudflare (IPv4 hop): trusts CF-Connecting-IP", () => {
    assert.equal(
      clientIpFrom(h({ "x-real-ip": "172.70.1.2", "x-forwarded-for": "198.51.100.7, 172.70.1.2", "cf-connecting-ip": "198.51.100.7" })),
      "198.51.100.7",
    );
  });
  test("via Cloudflare (IPv6 hop, IPv6 visitor)", () => {
    assert.equal(clientIpFrom(h({ "x-real-ip": "2606:4700:10::1", "cf-connecting-ip": "2001:db8::5" })), "2001:db8::5");
  });
  test("spoofed CF-Connecting-IP from a non-Cloudflare hop is ignored", () => {
    assert.equal(clientIpFrom(h({ "x-real-ip": "203.0.113.9", "cf-connecting-ip": "8.8.8.8" })), "203.0.113.9");
    assert.equal(clientIpFrom(h({ "x-forwarded-for": "8.8.8.8, 203.0.113.9", "cf-connecting-ip": "8.8.8.8" })), "203.0.113.9");
  });
  test("Cloudflare hop with a missing/garbage CF-Connecting-IP falls back to the hop", () => {
    assert.equal(clientIpFrom(h({ "x-real-ip": "172.70.1.2", "cf-connecting-ip": "not-an-ip" })), "172.70.1.2");
    assert.equal(clientIpFrom(h({ "x-real-ip": "172.70.1.2" })), "172.70.1.2");
  });
  test("no proxy headers -> null (local dev)", () => {
    assert.equal(clientIpFrom(h({})), null);
  });
  test("Vercel-style single client entry is unchanged", () => {
    assert.equal(clientIpFrom(h({ "x-forwarded-for": "198.51.100.7" })), "198.51.100.7");
  });
});

describe("isCloudflareIp", () => {
  test("matches range edges", () => {
    assert.equal(isCloudflareIp("104.16.0.0"), true);
    assert.equal(isCloudflareIp("104.23.255.255"), true);
    assert.equal(isCloudflareIp("104.24.0.1"), true);
    assert.equal(isCloudflareIp("104.28.0.0"), false);
    assert.equal(isCloudflareIp("::ffff:172.70.1.2"), true);
    assert.equal(isCloudflareIp("2a06:98c0:0:1::1"), true);
    assert.equal(isCloudflareIp("2a06:98c8::1"), false);
    assert.equal(isCloudflareIp("garbage"), false);
  });
});

describe("resolveClientIp (Vercel dual-run)", () => {
  test("on Vercel: x-vercel-forwarded-for wins", () => {
    assert.equal(resolveClientIp(h({ "x-vercel-forwarded-for": "198.51.100.7, 10.0.0.1", "x-forwarded-for": "9.9.9.9" }), true), "198.51.100.7");
  });
  test("on Railway: a forged x-vercel-forwarded-for is ignored", () => {
    assert.equal(resolveClientIp(h({ "x-vercel-forwarded-for": "8.8.8.8", "x-real-ip": "203.0.113.9" }), false), "203.0.113.9");
  });
  test("on Vercel without the header: falls back to the shared rule", () => {
    assert.equal(resolveClientIp(h({ "x-forwarded-for": "198.51.100.7" }), true), "198.51.100.7");
  });
});
