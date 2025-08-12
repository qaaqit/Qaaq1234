// Using existing qrcode-terminal package that's already installed
import QRCode from 'qrcode-terminal';
import { GrandmasterWatiBot } from './grandmaster-wati-bot';
import { getWatiService } from './wati-service';
import OpenAI from 'openai';

// Mock WhatsApp client for QR code generation
class MockWhatsAppClient {
  private phoneNumber: string;
  private isAuthenticated: boolean = false;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(phoneNumber: string) {
    this.phoneNumber = phoneNumber;
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  async initialize() {
    console.log(`🔄 Initializing WhatsApp client for ${this.phoneNumber}...`);
    
    // Simulate QR code generation
    setTimeout(() => {
      const mockQRData = `qaaq-qbot-baby-${this.phoneNumber}-${Date.now()}`;
      this.emit('qr', mockQRData);
    }, 2000);

    // Simulate authentication after QR scan
    setTimeout(() => {
      console.log('🔐 Simulating QR code scan...');
      this.isAuthenticated = true;
      this.emit('authenticated');
      this.emit('ready');
    }, 10000);
  }

  async destroy() {
    console.log('🛑 Destroying mock WhatsApp client');
    this.isAuthenticated = false;
  }

  async sendMessage(chatId: string, message: string) {
    if (!this.isAuthenticated) {
      throw new Error('WhatsApp client not authenticated');
    }
    console.log(`📤 Mock send to ${chatId}: ${message.substring(0, 50)}...`);
  }
}

// Direct WhatsApp service using mock client
class DirectWhatsAppService {
  private whatsappClient: MockWhatsAppClient;

  constructor(private phoneNumber: string) {
    this.phoneNumber = phoneNumber;
    this.whatsappClient = new MockWhatsAppClient(phoneNumber);
  }

  async sendMessage(whatsappNumber: string, message: string): Promise<void> {
    try {
      // Format phone number for WhatsApp
      const chatId = whatsappNumber.includes('@') ? whatsappNumber : `${whatsappNumber}@c.us`;
      await this.whatsappClient.sendMessage(chatId, message);
      console.log(`📤 QBOTbaby sent to ${whatsappNumber}: ${message.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ QBOTbaby send error:', error);
      // Don't throw to avoid breaking the flow
    }
  }

  async sendQuestionAnsweredNotification(whatsappNumber: string, questionTitle: string, answererName: string): Promise<void> {
    const message = `🔔 Your question "${questionTitle}" has been answered by ${answererName}! Check it out on QAAQ.`;
    await this.sendMessage(whatsappNumber, message);
  }

  async addContact(whatsappNumber: string, name: string, customParams?: any): Promise<any> {
    console.log(`📝 QBOTbaby contact added: ${name} (${whatsappNumber})`);
    return { success: true, contact: { name, whatsappNumber } };
  }

  setWhatsAppClient(client: MockWhatsAppClient) {
    this.whatsappClient = client;
  }

  getWhatsAppClient(): MockWhatsAppClient {
    return this.whatsappClient;
  }
}

export class QBotWhatsAppService {
  private client: Client;
  private grandmasterBot: GrandmasterWatiBot;
  private directService: DirectWhatsAppService;
  private openai: OpenAI;
  private phoneNumber: string;
  private isReady: boolean = false;

  constructor(phoneNumber: string) {
    this.phoneNumber = phoneNumber;
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    // Initialize WhatsApp client with session management
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: `qbotbaby-${phoneNumber.replace(/\D/g, '')}`
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

    // Create direct service and grandmaster bot
    this.directService = new DirectWhatsAppService(phoneNumber);
    this.directService.setWhatsAppClient(this.client);
    this.grandmasterBot = new GrandmasterWatiBot(this.directService);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // QR Code generation for authentication
    this.client.on('qr', (qr) => {
      console.log('\n🚢 QBOTbaby WhatsApp Integration Starting...');
      console.log(`📱 Phone Number: ${this.phoneNumber}`);
      console.log('\n📲 Scan this QR code with WhatsApp:\n');
      QRCode.generate(qr, { small: true });
      console.log('\n⚡ Waiting for QR code scan...');
      console.log('🔧 Setup: Open WhatsApp → Settings → Linked Devices → Link a Device');
    });

    // Client ready
    this.client.on('ready', async () => {
      console.log('\n✅ QBOTbaby WhatsApp Client Ready!');
      console.log(`🔗 Connected as: ${this.phoneNumber}`);
      console.log('🤖 GrandMaster rules activated');
      console.log('🧠 OpenAI GPT-4o integration enabled');
      console.log('📥 Ready to receive maritime questions...\n');
      this.isReady = true;
    });

    // Message received handler with GrandMaster rules
    this.client.on('message', async (message: Message) => {
      try {
        // Skip own messages and status updates
        if (message.fromMe || message.isStatus) return;

        const contact = await message.getContact();
        const chatId = message.from;
        const messageText = message.body;
        const senderName = contact.pushname || contact.name || 'Maritime Professional';

        // Extract phone number
        const phoneNumber = chatId.replace('@c.us', '').replace('@g.us', '');

        console.log(`\n📨 QBOTbaby - Incoming Message:`);
        console.log(`👤 From: ${senderName} (${phoneNumber})`);
        console.log(`💬 Message: ${messageText}`);
        console.log(`⏰ Time: ${new Date().toLocaleString()}`);

        // Process with GrandMaster Bot
        await this.grandmasterBot.processMessage(phoneNumber, messageText, senderName);

        console.log(`✅ QBOTbaby - Message processed\n`);

      } catch (error) {
        console.error('❌ QBOTbaby message error:', error);
        
        try {
          await message.reply('⚠️ QBOTbaby technical difficulty. Our team has been notified. Please try again.');
        } catch (replyError) {
          console.error('❌ QBOTbaby reply error:', replyError);
        }
      }
    });

    // Connection events
    this.client.on('authenticated', () => {
      console.log('🔐 QBOTbaby authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ QBOTbaby authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 QBOTbaby disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('error', (error) => {
      console.error('❌ QBOTbaby Client Error:', error);
    });
  }

  async start(): Promise<void> {
    try {
      console.log(`\n🚀 Starting QBOTbaby WhatsApp service for ${this.phoneNumber}...`);
      console.log('📱 Direct WhatsApp Web.js integration');
      console.log('🤖 GrandMaster rules activated');
      console.log('🧠 OpenAI GPT-4o integration enabled');
      console.log('📲 QR code will appear below for scanning...\n');
      
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to start QBOTbaby:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.client.destroy();
      this.isReady = false;
      console.log('🛑 QBOTbaby WhatsApp service stopped');
    } catch (error) {
      console.error('❌ Error stopping QBOTbaby:', error);
    }
  }

  isClientReady(): boolean {
    return this.isReady;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }

  async sendDirectMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('QBOTbaby service not ready');
    }
    await this.directService.sendMessage(phoneNumber, message);
  }

  // Test maritime AI response
  async testMaritimeAI(question: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4o as specified in blueprint
        messages: [
          {
            role: "system",
            content: "You are a Marine Chief Engineer with 20+ years experience providing maritime technical assistance. Provide accurate, practical responses to maritime engineering questions."
          },
          {
            role: "user",
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content || 'Unable to generate response';
    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      return 'AI service temporarily unavailable. Please try again.';
    }
  }
}

// Global service instance
let qbotService: QBotWhatsAppService | null = null;

export async function startQBotWhatsApp(phoneNumber: string): Promise<QBotWhatsAppService> {
  if (qbotService) {
    console.log('⚠️ QBot WhatsApp service already running');
    return qbotService;
  }

  qbotService = new QBotWhatsAppService(phoneNumber);
  await qbotService.start();
  return qbotService;
}

export async function stopQBotWhatsApp(): Promise<void> {
  if (qbotService) {
    await qbotService.stop();
    qbotService = null;
  }
}

export function getQBotWhatsApp(): QBotWhatsAppService | null {
  return qbotService;
}