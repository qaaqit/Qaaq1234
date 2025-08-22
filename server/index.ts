import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db"; // Import database pool for image serving
import QoiGPTBot from "./whatsapp-bot";
import { initializeRankGroups } from "./rank-groups-service";
import { setupGlossaryDatabase } from "./setup-glossary-db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve authentic maritime images from multiple sources
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    
    // First try server/uploads for authentic WhatsApp images
    const serverUploadsPath = join('./server/uploads', filename);
    if (existsSync(serverUploadsPath)) {
      const fileContent = readFileSync(serverUploadsPath);
      res.set({
        'Content-Type': 'image/jpeg',
        'Content-Length': fileContent.length,
        'Cache-Control': 'public, max-age=31536000'
      });
      return res.send(fileContent);
    }
    
    // Then try root uploads directory
    const rootUploadsPath = join('./uploads', filename);
    if (existsSync(rootUploadsPath)) {
      const fileContent = readFileSync(rootUploadsPath);
      const mimeType = filename.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
      res.set({
        'Content-Type': mimeType,
        'Content-Length': fileContent.length,
        'Cache-Control': 'public, max-age=3600'
      });
      return res.send(fileContent);
    }
    
    // If not found locally, return 404 but log the request
    console.log(`📸 Image requested but not found locally: ${filename}`);
    res.status(404).json({ 
      error: 'Image not found locally',
      filename: filename,
      note: 'This may be served by another instance'
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// STEP 2: Disable WhatsApp bot variable
// let whatsappBot: QoiGPTBot | null = null;

(async () => {
  const server = await registerRoutes(app);

  // STEP 2: Disable WhatsApp bot endpoints temporarily
  app.get("/api/whatsapp-status", (req, res) => {
    res.json({
      connected: false,
      status: 'Disabled for stable startup'
    });
  });

  app.post("/api/whatsapp-start", async (req, res) => {
    res.json({ message: 'WhatsApp bot temporarily disabled for stable startup' });
  });

  app.post("/api/whatsapp-stop", async (req, res) => {
    res.json({ message: 'WhatsApp bot temporarily disabled for stable startup' });
  });

  // Deployment health monitoring
  app.get('/api/deployment/status', (req, res) => {
    res.status(200).json({
      status: 'operational',
      environment: process.env.REPLIT_DEPLOYMENT ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '2.1.0'
    });
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('Server error:', {
      message,
      status,
      stack: err.stack,
      deployment: process.env.REPLIT_DEPLOYMENT || 'development'
    });

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production" && process.env.REPLIT_DEPLOYMENT) {
    // Only use serveStatic for true production builds
    serveStatic(app);
  } else {
    // Use setupVite for development and Replit environments to handle client-side routing
    await setupVite(app, server);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    console.log(`📱 WhatsApp Bot API available at /api/whatsapp-start`);
    
    // Initialize 15 individual rank groups on server startup
    try {
      const result = await initializeRankGroups();
      if (result.success) {
        console.log('🎯 Rank groups initialization completed during startup');
      } else {
        console.error('❌ Rank groups initialization failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during rank groups initialization:', error);
    }

    // Initialize glossary database and auto-update service
    try {
      await setupGlossaryDatabase();
      console.log('📚 Glossary database setup completed');
      
      // Auto-updater disabled - manual updates only via Admin panel
      console.log('🚫 Glossary auto-update service DISABLED - Manual updates only');
    } catch (error) {
      console.error('❌ Error setting up glossary system:', error);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down QaaqConnect server...');
    // WhatsApp bot disabled for stable startup
    console.log('🤖 WhatsApp bot is disabled');
    try {
      await pool.end();
      console.log('📊 Database connections closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
    process.exit(0);
  });

  // Handle uncaught exceptions and prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception - QaaqConnect:', error);
    // Don't exit in production to maintain uptime
    if (!process.env.REPLIT_DEPLOYMENT) {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production to maintain uptime
  });
})();
