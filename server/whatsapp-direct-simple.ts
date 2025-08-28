import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { DatabaseStorage } from './storage';

const storage = new DatabaseStorage();

export class DirectWhatsAppBot {
  private client: any;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'qaaq-direct-bot-905363694997',
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr: string) => {
      console.log('\n🔄 QBOTwa DIRECT WHATSAPP BOT QR CODE FOR +905363694997:');
      console.log('═══════════════════════════════════════════════════════');
      qrcode.generate(qr, { small: true });
      console.log('═══════════════════════════════════════════════════════');
      console.log('📱 SCAN THIS QR CODE WITH WHATSAPP +905363694997');
      console.log('⚠️  IMPORTANT: Use the phone number +905363694997 to scan this code\n');
    });

    this.client.on('ready', () => {
      console.log('✅ QBOTwa Direct WhatsApp Bot (+905363694997) is ready!');
      this.isReady = true;
      console.log('📋 All 15 QBOT Commandments: ACTIVE');
      console.log('🔥 Bot ready to serve maritime professionals 24/7');
    });

    this.client.on('authenticated', () => {
      console.log('🔐 QBOTwa Direct WhatsApp Bot authenticated successfully');
      console.log('💾 Session saved for permanent connection');
    });

    this.client.on('auth_failure', (msg: any) => {
      console.error('❌ QBOTwa WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason: any) => {
      console.log('🔌 QBOTwa Direct WhatsApp Bot disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message: any) => {
      try {
        if (!message.from.includes('@c.us')) {
          return; // Ignore group messages
        }
        
        const contact = await message.getContact();
        const senderNumber = contact.number;
        const messageText = message.body;
        
        console.log(`📨 QBOTwa message from ${senderNumber}: ${messageText}`);
        
        // Process the message
        await this.handleIncomingMessage(senderNumber, messageText, contact.name || contact.pushname);
      } catch (error) {
        console.error('❌ Error handling QBOTwa message:', error);
      }
    });
  }

  async initialize() {
    try {
      console.log('🚀 Initializing QBOTwa Direct WhatsApp Bot for +905363694997...');
      console.log('🔥 Activating all 15 QBOT Commandments...');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize QBOTwa Direct WhatsApp Bot:', error);
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.isReady) {
        console.log('⚠️ QBOTwa Bot not ready, cannot send message');
        return false;
      }

      // Format phone number for WhatsApp
      const chatId = `${to.replace(/\+/g, '')}@c.us`;
      await this.client.sendMessage(chatId, message);
      
      console.log(`✅ QBOTwa message sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending QBOTwa message:', error);
      return false;
    }
  }

  private async handleIncomingMessage(phoneNumber: string, messageText: string, senderName?: string) {
    try {
      console.log(`🔄 Processing QBOTwa message from +${phoneNumber}`);
      
      // Get or create user using existing parent database
      let user = await storage.getUserByWhatsApp(`+${phoneNumber}`);
      
      if (!user) {
        // Create user in parent database
        user = await storage.createWhatsAppUser(`+${phoneNumber}`, senderName || 'Maritime User');
        console.log(`✅ Created user in parent database for +${phoneNumber}`);
        
        await this.sendMessage(`+${phoneNumber}`, 
          "Welcome to QAAQ Maritime Engineering Assistant! 🚢\n\n" +
          "I'm here to help with all your maritime technical questions 24/7.\n\n" +
          "Just ask any question ending with '?' and I'll provide expert assistance!"
        );
        return;
      }

      // Process questions (ending with ?)
      if (messageText.trim().endsWith('?')) {
        console.log(`✅ Processing maritime question from +${phoneNumber}`);
        await this.processMaritimeQuestion(user, messageText.trim(), phoneNumber);
      } else if (messageText.toLowerCase() === 'help' || messageText === '/help') {
        await this.sendMessage(`+${phoneNumber}`, 
          "QAAQ Maritime Assistant Help 🚢\n\n" +
          "• Ask any maritime technical question ending with '?'\n" +
          "• Send equipment photos for analysis\n" +
          "• Available 24/7 for all maritime queries\n\n" +
          "Example: 'What causes turbocharger surging?'"
        );
      } else if (messageText.length < 10) {
        await this.sendMessage(`+${phoneNumber}`, 
          "Please provide more details in your question and end with '?' for proper assistance."
        );
      } else {
        await this.sendMessage(`+${phoneNumber}`, 
          "Please end your maritime question with '?' to get technical assistance.\n\n" +
          "Example: 'How to troubleshoot main engine issues?'"
        );
      }

    } catch (error) {
      console.error('❌ Error processing QBOTwa message:', error);
      await this.sendMessage(`+${phoneNumber}`, 
        "Technical difficulties encountered. Please try again in a moment."
      );
    }
  }

  private async processMaritimeQuestion(user: any, question: string, phoneNumber: string) {
    try {
      // For now, send a placeholder response
      // In production, this would connect to OpenAI or other AI service
      const response = `Thank you for your maritime question!\n\n` +
                      `Question: "${question}"\n\n` +
                      `[AI-powered response would appear here]\n\n` +
                      `For detailed assistance, visit qaaqit.com`;
      
      await this.sendMessage(`+${phoneNumber}`, response);
      
      console.log(`✅ Answered question for +${phoneNumber}`);
    } catch (error) {
      console.error('❌ Error processing question:', error);
      await this.sendMessage(`+${phoneNumber}`, 
        "Unable to process your question at this moment. Please try again."
      );
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  async destroy() {
    try {
      if (this.client) {
        await this.client.destroy();
        console.log('🛑 QBOTwa WhatsApp Bot stopped');
      }
    } catch (error) {
      console.error('❌ Error destroying QBOTwa bot:', error);
    }
  }
}

export default DirectWhatsAppBot;