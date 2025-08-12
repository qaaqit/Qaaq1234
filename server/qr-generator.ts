import express from 'express';

export function setupQREndpoints(app: express.Application) {
  // QBOTbaby QR Code endpoint
  app.get('/api/qbot-baby/qr', async (req, res) => {
    try {
      // Import QBOTbaby service
      const { startQBotWhatsApp } = await import('./whatsapp-service');
      
      console.log('🔄 QR code request received for QBOTbaby');
      
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Send initial HTML
      res.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QBOTbaby WhatsApp QR Code</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: linear-gradient(135deg, #ea580c, #dc2626);
              color: white;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: rgba(255,255,255,0.1);
              border-radius: 15px;
              padding: 30px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .logo {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              margin: 20px 0;
            }
            .phone {
              font-size: 24px;
              background: rgba(255,255,255,0.2);
              padding: 10px 20px;
              border-radius: 25px;
              display: inline-block;
              margin: 15px 0;
            }
            .qr-container {
              background: white;
              border-radius: 15px;
              padding: 20px;
              margin: 20px 0;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .instructions {
              text-align: left;
              background: rgba(255,255,255,0.1);
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
            }
            .status {
              font-size: 18px;
              font-weight: bold;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            }
            .loading {
              background: rgba(255,193,7,0.3);
              border: 2px solid #ffc107;
            }
            .ready {
              background: rgba(40,167,69,0.3);
              border: 2px solid #28a745;
            }
            .error {
              background: rgba(220,53,69,0.3);
              border: 2px solid #dc3545;
            }
            .feature {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              margin: 5px;
              padding: 8px 15px;
              border-radius: 20px;
              font-size: 14px;
            }
            #qr-code {
              color: black;
              font-family: monospace;
              font-size: 12px;
              line-height: 1;
              white-space: pre;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🚢</div>
            <div class="title">QBOTbaby Authentication</div>
            <div class="phone">📱 +905363694997</div>
            
            <div class="status loading" id="status">
              🔄 Initializing QBOTbaby service...
            </div>
            
            <div class="qr-container" style="display: none;" id="qr-container">
              <h3 style="color: #333; margin-top: 0;">Scan with WhatsApp</h3>
              <div id="qr-code"></div>
            </div>
            
            <div class="instructions">
              <h3>📋 Setup Instructions:</h3>
              <ol>
                <li>Open WhatsApp on phone <strong>+905363694997</strong></li>
                <li>Go to <strong>Settings → Linked Devices</strong></li>
                <li>Tap <strong>"Link a Device"</strong></li>
                <li>Scan the QR code above when it appears</li>
                <li>QBOTbaby will be ready for maritime questions!</li>
              </ol>
            </div>
            
            <div>
              <h3>🎯 QBOTbaby Features:</h3>
              <div class="feature">🤖 GrandMaster Rules</div>
              <div class="feature">🧠 OpenAI GPT-4o</div>
              <div class="feature">⚓ Maritime Technical Support</div>
              <div class="feature">🚨 Emergency Protocols</div>
              <div class="feature">📊 Conversation Logging</div>
              <div class="feature">🔄 Real-time Processing</div>
            </div>
          </div>
          
          <script>
            // Auto-refresh status every 5 seconds
            let checkInterval;
            
            function updateStatus() {
              fetch('/api/qbot-baby/status')
                .then(res => res.json())
                .then(data => {
                  const statusEl = document.getElementById('status');
                  if (data.ready) {
                    statusEl.className = 'status ready';
                    statusEl.innerHTML = '✅ QBOTbaby service ready and waiting for QR scan!';
                  } else {
                    statusEl.className = 'status loading';
                    statusEl.innerHTML = '🔄 Starting QBOTbaby service...';
                  }
                })
                .catch(err => {
                  const statusEl = document.getElementById('status');
                  statusEl.className = 'status error';
                  statusEl.innerHTML = '❌ Service connection error - please refresh page';
                });
            }
            
            // Check status every 3 seconds
            checkInterval = setInterval(updateStatus, 3000);
            updateStatus();
            
            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
              if (checkInterval) clearInterval(checkInterval);
            });
          </script>
        </body>
        </html>
      `);

      // Start QBOTbaby service and wait for QR code
      console.log('🚀 Starting QBOTbaby for QR code generation...');
      
      try {
        const qbotService = await startQBotWhatsApp('+905363694997');
        console.log('✅ QBOTbaby service started, QR should be displayed');
        
        // Service is now running and QR code should have been displayed in console
        res.write(`
          <script>
            document.getElementById('status').className = 'status ready';
            document.getElementById('status').innerHTML = '✅ QBOTbaby service ready! Check console for QR code.';
          </script>
        `);
        
      } catch (error) {
        console.error('❌ Error starting QBOTbaby:', error);
        res.write(`
          <script>
            document.getElementById('status').className = 'status error';
            document.getElementById('status').innerHTML = '❌ Failed to start QBOTbaby service';
          </script>
        `);
      }

    } catch (error) {
      console.error('❌ QR endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate QR code',
        error: error.message 
      });
    }
  });

  // QBOTbaby status endpoint
  app.get('/api/qbot-baby/status', async (req, res) => {
    try {
      const { getQBotWhatsApp } = await import('./whatsapp-service');
      const qbotService = getQBotWhatsApp();
      
      res.json({
        success: true,
        ready: qbotService ? qbotService.isClientReady() : false,
        phoneNumber: '+905363694997',
        botName: 'QBOTbaby'
      });
    } catch (error) {
      res.json({
        success: false,
        ready: false,
        error: error.message
      });
    }
  });

  console.log('📱 QBOTbaby QR endpoints configured:');
  console.log('   GET /api/qbot-baby/qr - Generate QR code page');
  console.log('   GET /api/qbot-baby/status - Check service status');
}