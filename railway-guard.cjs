/* eslint-disable @typescript-eslint/no-require-imports */
// Railway entry for a Next.js app: starts `next start` on an internal port and
// fronts it with a tiny reverse proxy on $PORT.
//
// Only job: hosts ending in `.up.railway.app` (temporary Railway domains) get
// `X-Robots-Tag: noindex, nofollow` on every response and `/robots.txt` answers
// `Disallow: /`. Real domains pass through untouched.
//
// Usage (Dockerfile CMD):  node railway-guard.cjs
// Master copy: D:\data\migrate-railway\railway-guard.cjs (copied into each repo).
"use strict";
const http = require("http");
const { spawn } = require("child_process");

const PUBLIC_PORT = Number(process.env.PORT) || 3000;
const INNER_PORT = PUBLIC_PORT + 1;
const TEMP_SUFFIX = ".up.railway.app";
const HOP = ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer"];

const app = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(INNER_PORT)],
  { stdio: "inherit" },
);
app.on("exit", (code) => process.exit(code == null ? 1 : code));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => app.kill(sig));

function isTempHost(headers) {
  const raw = String(headers["x-forwarded-host"] || headers.host || "");
  const host = raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return host.endsWith(TEMP_SUFFIX);
}

const server = http.createServer((req, res) => {
  const temp = isTempHost(req.headers);
  if (temp && req.url.split("?")[0] === "/robots.txt") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow" });
    res.end("User-agent: *\nDisallow: /\n");
    return;
  }
  const reqHeaders = { ...req.headers };
  for (const h of HOP) delete reqHeaders[h];
  const upstream = http.request(
    { host: "127.0.0.1", port: INNER_PORT, path: req.url, method: req.method, headers: reqHeaders, agent: false },
    (up) => {
      const headers = { ...up.headers };
      for (const h of HOP) delete headers[h];
      if (temp) headers["x-robots-tag"] = "noindex, nofollow";
      res.writeHead(up.statusCode, up.statusMessage, headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.listen(PUBLIC_PORT, "0.0.0.0");
