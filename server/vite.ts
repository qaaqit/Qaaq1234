// server/vite.ts — SAFE MODE for production
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export const log: Console = console as unknown as Console;

// Dev: keep no-op here to avoid surprises in prod
export async function setupVite(_app: Express, _server?: unknown) {
  // intentionally empty in SAFE MODE
}

export function serveStatic(app: Express) {
  const distDir = path.resolve("dist");
  const indexFile = path.join(distDir, "index.html");

  if (!fs.existsSync(indexFile)) {
    log.warn("⚠️  dist/index.html not found. Serving temporary fallback page.");
    app.get("*", (_req, res) => {
      res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8"><title>QAAQ</title></head>
<body style="font-family: ui-sans-serif, system-ui; padding: 2rem;">
  <h1>QAAQ</h1>
  <p>Frontend build not found on this instance. APIs remain operational.</p>
  <p>Health: <a href="/healthz">/healthz</a></p>
</body></html>`);
    });
    return;
  }

  log.log(`🗂️  Serving static SPA from: ${distDir}`);
  // Serve assets without auto-index…
  app.use(express.static(distDir, { index: false, maxAge: "1y" }));
  // …and SPA fallback
  app.get("*", (_req, res) => res.sendFile(indexFile));
}
