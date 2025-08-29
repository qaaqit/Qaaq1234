import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { secretValidator } from "./secret-validation";

secretValidator.validateStartupSecrets();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Health check
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

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

(async () => {
  const server = await registerRoutes(app);

  if (process.env.NODE_ENV === "production" && process.env.REPLIT_DEPLOYMENT) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`✅ QAAQ running on port ${port}`);
  });
})();
