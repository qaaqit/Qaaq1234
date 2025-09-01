import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as QRCode from 'qrcode-terminal';
import { AIService } from './ai-service';
import { pool } from './db';

// Type definitions
type WhatsAppClient = InstanceType<typeof Client>;
interface WhatsAppMessage {
  body: string;
  getContact(): Promise<{ number: string, pushname?: string }>;
  reply(text: string): Promise<any>;
  from: string;
}

class QBOTwaBot {
  private client: WhatsAppClient;
  private aiService: AIService;
  private isReady = false;

  constructor() {
    // Set Puppeteer to use system Chromium
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
    process.env.PUPPETEER_EXECUTABLE_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'qbotwa-bot-905363694997'
      }),
      puppeteer: {
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--metrics-recording-only',
          '--disable-features=VizDisplayCompositor'
        ]
      }
    });

    this.aiService = new AIService();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr: string) => {
      console.log('\n🤖 QBOTwa WhatsApp Bot - REAL QR Code for +905363694997:');
      console.log('📱 SCAN THIS AUTHENTIC WHATSAPP QR CODE:');
      try {
        QRCode.generate(qr, { small: true });
      } catch (error) {
        console.log('QR generation error, showing QR data:', qr);
      }
      console.log('\n📱 Scan the QR code above with WhatsApp phone +905363694997 to connect QBOTwa bot.');
      console.log('🔗 Once connected, users can send technical maritime questions to get AI-powered answers.');
      console.log('⚠️  QR Code will expire in 60 seconds - scan quickly!\n');
    });

    this.client.on('ready', () => {
      console.log('✅ QBOTwa WhatsApp Bot is ready and connected to +905363694997!');
      console.log('🤖 Users can now send technical maritime questions and get AI-powered answers');
      this.isReady = true;
    });

    this.client.on('message', async (message: WhatsAppMessage) => {
      await this.handleMessage(message);
    });

    this.client.on('auth_failure', (msg: any) => {
      console.error('❌ QBOTwa WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason: any) => {
      console.log('📱 QBOTwa Bot disconnected:', reason);
      this.isReady = false;
    });
  }

  private async handleMessage(message: WhatsAppMessage) {
    try {
      const messageBody = message.body.trim();
      const messageBodyLower = messageBody.toLowerCase();
      const sender = await message.getContact();
      const senderNumber = sender.number;
      const senderName = sender.pushname || 'Maritime Professional';

      console.log(`🤖 QBOTwa: Received message from ${senderNumber} (${senderName}): "${messageBody.substring(0, 50)}..."`);

      // Skip empty messages or status updates
      if (!messageBody || messageBody.length < 3) {
        return;
      }

      // Handle greeting messages
      if (this.isGreeting(messageBodyLower)) {
        await this.sendWelcomeMessage(message, senderName);
        return;
      }

      // Handle help commands
      if (this.isHelpCommand(messageBodyLower)) {
        await this.sendHelpMessage(message);
        return;
      }

      // Process as technical question using OpenAI
      await this.handleTechnicalQuestion(message, messageBody, senderNumber, senderName);

    } catch (error) {
      console.error('❌ QBOTwa: Error handling message:', error);
      await message.reply('❌ Sorry, I encountered an error processing your message. Please try again in a moment.');
    }
  }

  private isGreeting(messageBodyLower: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'hola', 'salaam', 'salam', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => messageBodyLower.includes(greeting));
  }

  private isHelpCommand(messageBodyLower: string): boolean {
    return messageBodyLower === 'help' || messageBodyLower === '/help' || messageBodyLower === '\\help' || messageBodyLower.includes('how to use');
  }

  private async handleTechnicalQuestion(message: WhatsAppMessage, questionText: string, senderNumber: string, senderName: string) {
    try {
      console.log(`🤖 QBOTwa: Processing technical question from ${senderNumber}`);

      // Get or create user info for AI context
      const user = await this.getUserInfo(senderNumber, senderName);

      // Send typing indicator by replying with a brief processing message
      await message.reply('🤖 Processing your technical question...');

      // Generate AI response using the same system as web QBOT
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const aiResponse = await this.aiService.generateDualResponse(
        questionText,
        'Maritime Technical Support',
        user,
        undefined, // no active rules
        'openai', // prefer OpenAI for consistency with web QBOT
        'en' // default to English
      );

      // Format response for WhatsApp
      let formattedResponse = `🤖 *QBOTwa Technical Answer:*\n\n`;
      formattedResponse += `${aiResponse.response}\n\n`;
      formattedResponse += `⚡ Powered by OpenAI | ⏱️ ${aiResponse.responseTime}ms\n`;
      formattedResponse += `📱 Ask another question anytime or type "help" for more info`;

      await message.reply(formattedResponse);

      // Store the Q&A in database for history
      await this.storeQuestionAnswer(senderNumber, questionText, aiResponse.response);

      console.log(`✅ QBOTwa: Sent AI answer to ${senderNumber} (${aiResponse.responseTime}ms)`);

    } catch (error) {
      console.error('❌ QBOTwa: Error processing technical question:', error);
      
      // Send fallback response
      const fallbackResponse = `❌ I'm having trouble processing your question right now. This could be due to:\n\n` +
        `• Temporary AI service issues\n` +
        `• High server load\n` +
        `• Network connectivity\n\n` +
        `Please try again in a few moments. For urgent issues, visit qaaq.app`;
      
      await message.reply(fallbackResponse);
    }
  }

  private async getUserInfo(phoneNumber: string, displayName: string) {
    try {
      // Try to find existing user by WhatsApp number
      const result = await pool.query(`
        SELECT id, full_name, maritime_rank, ship_name, email, is_premium, is_admin
        FROM users 
        WHERE whatsapp_number = $1 OR phone_number = $1
        LIMIT 1
      `, [phoneNumber]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return {
          id: user.id,
          fullName: user.full_name || displayName,
          maritimeRank: user.maritime_rank || 'Maritime Professional',
          shipName: user.ship_name,
          email: user.email,
          isPremium: user.is_premium || false,
          isAdmin: user.is_admin || false,
          whatsappNumber: phoneNumber
        };
      } else {
        // Create basic user record for WhatsApp interaction
        const insertResult = await pool.query(`
          INSERT INTO users (whatsapp_number, full_name, maritime_rank, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id
        `, [phoneNumber, displayName, 'Maritime Professional']);

        return {
          id: insertResult.rows[0].id,
          fullName: displayName,
          maritimeRank: 'Maritime Professional',
          shipName: null,
          email: null,
          isPremium: false,
          isAdmin: false,
          whatsappNumber: phoneNumber
        };
      }
    } catch (error) {
      console.error('❌ QBOTwa: Error getting/creating user info:', error);
      
      // Return default user info
      return {
        id: null,
        fullName: displayName,
        maritimeRank: 'Maritime Professional',
        shipName: null,
        email: null,
        isPremium: false,
        isAdmin: false,
        whatsappNumber: phoneNumber
      };
    }
  }

  private async storeQuestionAnswer(phoneNumber: string, question: string, answer: string) {
    try {
      await pool.query(`
        INSERT INTO whatsapp_qa_history (phone_number, question, answer, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
      `, [phoneNumber, question, answer]);
    } catch (error) {
      console.error('❌ QBOTwa: Error storing Q&A history:', error);
      // Don't throw error as this is not critical for user experience
    }
  }

  private async sendWelcomeMessage(message: WhatsAppMessage, senderName: string) {
    const welcomeText = `🤖 *Welcome to QBOTwa, ${senderName}!*\n\n` +
      `I'm your AI-powered maritime technical assistant, providing the same expert answers as QBOT on qaaq.app\n\n` +
      `*What I can help with:*\n` +
      `• Maritime engineering questions\n` +
      `• Equipment troubleshooting\n` +
      `• Safety procedures\n` +
      `• Navigation guidance\n` +
      `• Regulations (SOLAS, MARPOL, STCW)\n` +
      `• Career advice\n\n` +
      `*How to use:*\n` +
      `Simply send me your technical question in plain English and I'll provide expert answers powered by advanced AI.\n\n` +
      `🔗 *Visit qaaq.app for the full platform experience*`;
    
    await message.reply(welcomeText);
  }

  private async sendHelpMessage(message: WhatsAppMessage) {
    const helpText = `🤖 *QBOTwa Help - Maritime AI Assistant*\n\n` +
      `*How to ask questions:*\n` +
      `• Send any maritime technical question\n` +
      `• Use natural language - no special commands needed\n` +
      `• Be specific for best results\n\n` +
      `*Example questions:*\n` +
      `"How to troubleshoot main engine overheating?"\n` +
      `"What are SOLAS requirements for lifeboats?"\n` +
      `"How to calibrate radar properly?"\n\n` +
      `*Features:*\n` +
      `• 24/7 AI-powered responses\n` +
      `• Expert maritime knowledge\n` +
      `• Same technology as qaaq.app QBOT\n` +
      `• Instant technical guidance\n\n` +
      `🌐 *Full platform: qaaq.app*\n` +
      `📱 *Just ask - I'm here to help!*`;
    
    await message.reply(helpText);
  }

  public async start() {
    try {
      console.log('🚀 Starting QBOTwa WhatsApp Bot for +905363694997...');
      console.log('📱 This bot will provide AI-powered maritime technical answers via WhatsApp');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to start QBOTwa WhatsApp bot:', error);
      throw error;
    }
  }

  public async stop() {
    if (this.client) {
      await this.client.destroy();
      console.log('🛑 QBOTwa WhatsApp Bot stopped');
      this.isReady = false;
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  public getStatus(): string {
    if (this.isReady) {
      return 'Connected and ready to answer maritime technical questions';
    } else {
      return 'Disconnected - scan QR code to connect +905363694997';
    }
  }
}

export default QBOTwaBot;