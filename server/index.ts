import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import QoiGPTBot from "./whatsapp-bot";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve images from Google Cloud Storage via object storage proxy
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Import object storage service
    const { ObjectStorageService } = await import('./objectStorage');
    const objectStorage = new ObjectStorageService();
    
    // Try to construct the cloud storage path for the image
    const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '';
    const imagePath = `${privateObjectDir}/uploads/${filename}`;
    
    // Import the signObjectURL function to generate signed URL for image access
    const { signObjectURL } = await import('./objectStorage');
    
    // For now, return a response indicating the image is in cloud storage
    // The frontend should use the attachment URLs from the API response directly
    res.status(302).redirect(`https://storage.googleapis.com${imagePath}`);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ 
      error: 'Image not accessible', 
      filename: req.params.filename,
      message: 'Authentic question images are stored in Google Cloud Storage'
    });
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

let whatsappBot: QoiGPTBot | null = null;

(async () => {
  const server = await registerRoutes(app);

  // Add WhatsApp bot endpoints
  app.get("/api/whatsapp-status", (req, res) => {
    res.json({
      connected: whatsappBot?.isConnected() || false,
      status: whatsappBot?.isConnected() ? 'Connected' : 'Disconnected'
    });
  });

  app.post("/api/whatsapp-start", async (req, res) => {
    try {
      if (!whatsappBot) {
        whatsappBot = new QoiGPTBot();
        await whatsappBot.start();
        res.json({ message: 'WhatsApp bot starting... Check console for QR code.' });
      } else {
        res.json({ message: 'WhatsApp bot is already running.' });
      }
    } catch (error) {
      console.error('Failed to start WhatsApp bot:', error);
      res.status(500).json({ error: 'Failed to start WhatsApp bot' });
    }
  });

  app.post("/api/whatsapp-stop", async (req, res) => {
    try {
      if (whatsappBot) {
        await whatsappBot.stop();
        whatsappBot = null;
        res.json({ message: 'WhatsApp bot stopped.' });
      } else {
        res.json({ message: 'WhatsApp bot is not running.' });
      }
    } catch (error) {
      console.error('Failed to stop WhatsApp bot:', error);
      res.status(500).json({ error: 'Failed to stop WhatsApp bot' });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
  }, () => {
    log(`serving on port ${port}`);
    console.log(`📱 WhatsApp Bot API available at /api/whatsapp-start`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (whatsappBot) {
      await whatsappBot.stop();
    }
    if (aisProxy) {
      aisProxy.close();
    }
    process.exit(0);
  });
})();
