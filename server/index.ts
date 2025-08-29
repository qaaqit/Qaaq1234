import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { pool } from "./db";
import { secretValidator } from "./secret-validation";

secretValidator.validateStartupSecrets();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Health checks ---
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.get("/readyz", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ db: "ok" });
  } catch (e: any) {
    res.status(503).json({ db: "down", error: e?.message ?? String(e) });
  }
});

// --- Request logging for APIs ---
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  res.json = function (body: any) {
    (res as any)._body = body;
    return originalJson.apply(this, [body]);
  };
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const dur = Date.now() - start;
      let line = `${req.method} ${req.path} ${res.statusCode} in ${dur}ms`;
      if ((res as any)._body)
        line += ` :: ${JSON.stringify((res as any)._body)}`;
      log(line);
    }
  });
  next();
});

// --- Mount API routes ---
(async () => {
  const server = await registerRoutes(app);

  // Only serve static frontend in production
  if (process.env.NODE_ENV === "production" && process.env.REPLIT_DEPLOYMENT) {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 QAAQ running on port ${port}`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    log("🛑 Shutting down...");
    try {
      await pool.end();
      log("DB connections closed");
    } catch {}
    process.exit(0);
  });
})();
