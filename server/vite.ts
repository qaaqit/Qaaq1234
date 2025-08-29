// server/vite.ts — drop-in replacement (ESM/TS)
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

// Simple logger export to match your existing import { log } from './vite'
export const log: Console = console as unknown as Console;

/**
 * DEV: mount Vite middleware (prod uses serveStatic).
 */
export async function setupVite(app: Express, _server?: unknown) {
  if (process.env.NODE_ENV === "production") return;

  try {
    const root = fs.existsSync(path.resolve("client/index.html"))
      ? path.resolve("client")
      : process.cwd();

    const vite = await (
      await import("vite")
    ).createServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
    log.log(`🔧 Vite dev middleware enabled (root: ${root})`);
  } catch (e) {
    log.error("⚠️ setupVite failed (continuing without dev middleware):", e);
  }
}

/**
 * PROD: serve the built SPA. Auto-detect common output dirs:
 *  - ./dist
 *  - ./client/dist
 *  - ./build
 */
export function serveStatic(app: Express) {
  const candidates = [
    path.resolve("dist"),
    path.resolve("client", "dist"),
    path.resolve("build"),
  ];

  const distDir = candidates.find((p) =>
    fs.existsSync(path.join(p, "index.html")),
  );

  if (!distDir) {
    log.error(
      "❌ No built client found. Looked for index.html in:",
      candidates.join(", "),
    );
    app.get("*", (_req, res) =>
      res.status(500).json({
        error:
          "Front-end not built. Run the client build so index.html exists.",
      }),
    );
    return;
  }

  log.log(`🗂️  Serving static SPA from: ${distDir}`);

  // Static assets (no index) …
  app.use(express.static(distDir, { index: false, maxAge: "1y" }));
  // SPA fallback to index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}
