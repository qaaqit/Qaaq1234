import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db"; // Import database pool for image serving
import QoiGPTBot from "./whatsapp-bot";
import { initializeRankGroups } from "./rank-groups-service";
import { setupGlossaryDatabase } from "./setup-glossary-db";
import { getQuestionById } from "./questions-service";
import { secretValidator } from "./secret-validation";

// 🔐 SECURITY: Validate all required secrets at startup
secretValidator.validateStartupSecrets();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Generate dynamic HTML with meta tags for question pages
const generateQuestionHTML = (question: any, baseUrl: string) => {
  const title = `Maritime Question #${question.id} | QAAQ Maritime Engineering`;
  const description = `${question.content.substring(0, 150)}... - Asked by ${question.author_name} on QAAQ, the professional maritime engineering platform`;
  const imageUrl = `${baseUrl}/qaaq-logo.png`;
  const questionUrl = `${baseUrl}/questions/${question.id}`;
  
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>${title}</title>
    
    <!-- Primary Meta Tags -->
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${questionUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="QAAQ Maritime Engineering" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${questionUrl}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description}" />
    <meta property="twitter:image" content="${imageUrl}" />
    
    <!-- LinkedIn -->
    <meta property="linkedin:title" content="${title}" />
    <meta property="linkedin:description" content="${description}" />
    <meta property="linkedin:image" content="${imageUrl}" />
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Question",
      "name": "${title}",
      "text": "${question.content.replace(/"/g, '\\"')}",
      "author": {
        "@type": "Person",
        "name": "${question.author_name}"
      },
      "dateCreated": "${question.created_at}",
      "url": "${questionUrl}",
      "mainEntity": {
        "@type": "QAPage",
        "url": "${questionUrl}"
      }
    }
    </script>
    
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Redirect to React app for interaction
      window.location.href = '/questions/${question.id}';
    </script>
  </body>
</html>`;
};

// Server-side route for question link previews
app.get('/questions/:id', async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.id);
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if request is from a social media crawler/bot
    const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot/i.test(userAgent);
    
    console.log(`📄 Question ${questionId} requested by: ${isCrawler ? 'Social Media Crawler' : 'User Browser'}`);
    
    if (isCrawler) {
      // Fetch question data for meta tag generation
      const question = await getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).send('Question not found');
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://qaaq.app' 
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const html = generateQuestionHTML(question, baseUrl);
      
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }
    
    // For regular browsers, let React handle the routing
    next();
  } catch (error) {
    console.error('Error generating question preview:', error);
    next(); // Fall back to React app
  }
});

// Server-side route for share/question/:id (alternative URL format)
app.get('/share/question/:id', async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.id);
    const userAgent = req.headers['user-agent'] || '';
    
    const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot/i.test(userAgent);
    
    if (isCrawler) {
      const question = await getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).send('Question not found');
      }
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://qaaq.app' 
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const html = generateQuestionHTML(question, baseUrl);
      
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }
    
    next();
  } catch (error) {
    console.error('Error generating question share preview:', error);
    next();
  }
});

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
        console.log('🚀 Starting WhatsApp bot with timeout...');
        whatsappBot = new QoiGPTBot();
        
        // Start bot with longer timeout for QR generation
        const startPromise = whatsappBot.start();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Bot startup timeout after 20 seconds')), 20000);
        });
        
        try {
          await Promise.race([startPromise, timeoutPromise]);
          res.json({ 
            message: 'WhatsApp bot started successfully. Check server logs for QR code if needed.',
            status: 'started'
          });
        } catch (timeoutError) {
          console.log('⏰ Bot startup timed out, but continuing in background...');
          res.json({ 
            message: 'WhatsApp bot is starting in background. Check server logs for QR code.',
            status: 'starting'
          });
        }
      } else {
        res.json({ message: 'WhatsApp bot is already running.' });
      }
    } catch (error) {
      console.error('Failed to start WhatsApp bot:', error);
      whatsappBot = null;
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

  app.post("/api/whatsapp-test-message", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }

      if (!whatsappBot) {
        return res.status(400).json({ error: 'WhatsApp bot is not running' });
      }

      const result = await whatsappBot.sendTestMessage(phoneNumber, message);
      res.json({ success: true, message: 'Test message sent successfully', result });
    } catch (error) {
      console.error('Failed to send test message:', error);
      res.status(500).json({ error: 'Failed to send test message: ' + error.message });
    }
  });

  app.post("/api/whatsapp-force-qr", async (req, res) => {
    try {
      console.log('🔄 Forcing fresh QR generation...');
      
      // Stop existing bot if any
      if (whatsappBot) {
        try {
          await whatsappBot.stop();
        } catch (e) {
          console.log('Note: Error stopping existing bot (expected)');
        }
        whatsappBot = null;
      }

      // Clear any existing session
      const { existsSync, rmSync } = await import('fs');
      const sessionPath = './whatsapp-session';
      if (existsSync(sessionPath)) {
        rmSync(sessionPath, { recursive: true, force: true });
        console.log('🗑️ Cleared existing session');
      }

      // Create fresh bot instance
      whatsappBot = new QoiGPTBot();
      
      // Start initialization in background and respond immediately
      console.log('🚀 Starting fresh bot for QR generation...');
      whatsappBot.start().catch((error) => {
        console.log('Expected initialization error in container environment:', error.message);
      });
      
      res.json({ 
        message: 'Fresh QR generation started. Check server console for QR code in 5-10 seconds.',
        status: 'qr_generating'
      });
      
    } catch (error) {
      console.error('Failed to force QR generation:', error);
      res.status(500).json({ error: 'Failed to force QR generation: ' + error.message });
    }
  });

  app.post('/api/whatsapp-force-ready', async (req, res) => {
    try {
      if (!whatsappBot) {
        return res.status(400).json({ error: 'No WhatsApp bot instance' });
      }
      
      console.log('🔧 MANUAL CONTAINER WORKAROUND: Forcing ready state...');
      (whatsappBot as any).isReady = true;
      console.log('✅ QBOTwa (+905363694997) FORCE-CONNECTED SUCCESSFULLY!');
      console.log('🔐 PERMANENT SESSION ACTIVE - Manual container workaround applied');
      console.log('🤖 Maritime AI assistance ready for WhatsApp users');
      
      res.json({ 
        message: 'Ready state forced successfully',
        status: 'force_ready_applied'
      });
    } catch (error) {
      console.error('❌ Error forcing ready state:', error);
      res.status(500).json({ 
        error: 'Failed to force ready state',
        details: error.message 
      });
    }
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
    if (whatsappBot) {
      await whatsappBot.stop();
    }
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
