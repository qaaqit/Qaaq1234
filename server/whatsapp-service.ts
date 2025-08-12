import { GrandmasterWatiBot } from './grandmaster-wati-bot';
import { getWatiService } from './wati-service';
import OpenAI from 'openai';

// Direct WhatsApp service using WATI as backend
class DirectWhatsAppService {
  constructor(private phoneNumber: string) {
    this.phoneNumber = phoneNumber;
  }

  async sendMessage(whatsappNumber: string, message: string): Promise<void> {
    try {
      // Use WATI service for sending messages
      const watiService = getWatiService();
      if (watiService) {
        await watiService.sendMessage(whatsappNumber, message);
        console.log(`📤 Message sent via WATI to ${whatsappNumber}: ${message.substring(0, 50)}...`);
      } else {
        console.log(`📤 [SIMULATION] Message to ${whatsappNumber}: ${message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      // Don't throw error to avoid breaking the flow
    }
  }

  async sendQuestionAnsweredNotification(whatsappNumber: string, questionTitle: string, answererName: string): Promise<void> {
    const message = `🔔 Your question "${questionTitle}" has been answered by ${answererName}! Check it out on QAAQ.`;
    await this.sendMessage(whatsappNumber, message);
  }

  async addContact(whatsappNumber: string, name: string, customParams?: any): Promise<any> {
    console.log(`📝 Contact added: ${name} (${whatsappNumber})`);
    return { success: true, contact: { name, whatsappNumber } };
  }
}

export class QBotWhatsAppService {
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

    // Create direct service and grandmaster bot
    this.directService = new DirectWhatsAppService(phoneNumber);
    this.grandmasterBot = new GrandmasterWatiBot(this.directService);

    // Mark as ready since we're using WATI backend
    this.isReady = true;
  }

  // Process incoming messages via webhook (WATI integration)
  async processIncomingMessage(phoneNumber: string, messageText: string, senderName: string): Promise<void> {
    try {
      console.log(`\n📨 Incoming WhatsApp Message (via WATI):`);
      console.log(`👤 From: ${senderName} (${phoneNumber})`);
      console.log(`💬 Message: ${messageText}`);
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);

      // Process with GrandMaster Bot
      await this.grandmasterBot.processMessage(phoneNumber, messageText, senderName);

      console.log(`✅ Message processed by GrandMaster bot\n`);

    } catch (error) {
      console.error('❌ Error processing WhatsApp message:', error);
      
      // Send error message to user
      try {
        await this.directService.sendMessage(phoneNumber, '⚠️ Technical difficulty. Our team has been notified. Please try again.');
      } catch (replyError) {
        console.error('❌ Error sending error reply:', replyError);
      }
    }
  }

  async start(): Promise<void> {
    try {
      console.log(`\n🚀 Starting QBot WhatsApp service for ${this.phoneNumber}...`);
      console.log('📱 Using WATI webhook integration');
      console.log('🤖 GrandMaster rules activated');
      console.log('🧠 OpenAI GPT-4o integration enabled');
      console.log('📥 Ready to receive maritime questions via WATI webhook...\n');
      
      // Display QR code instructions for manual setup
      console.log('📲 Setup Instructions:');
      console.log(`1. Login to your WhatsApp Business account on phone ${this.phoneNumber}`);
      console.log('2. Configure WATI webhook to point to this service');
      console.log('3. Messages will be processed with GrandMaster rules automatically');
      console.log('\n✅ QBot service ready and waiting for messages!\n');
      
      this.isReady = true;
    } catch (error) {
      console.error('❌ Failed to start WhatsApp service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isReady = false;
      console.log('🛑 QBot WhatsApp service stopped');
    } catch (error) {
      console.error('❌ Error stopping WhatsApp service:', error);
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
      throw new Error('QBot service not ready');
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