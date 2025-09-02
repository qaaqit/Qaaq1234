import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as qrcode from 'qrcode-terminal';
import { DatabaseStorage } from './storage';
import { FeedbackService } from './feedback-service';
import { AIService } from './ai-service';
import { getQuestions, searchQuestions } from './questions-service';

// Type definitions to fix TypeScript errors
type WhatsAppClient = InstanceType<typeof Client>;
interface WhatsAppMessage {
  body: string;
  getContact(): Promise<{ number: string }>;
  reply(text: string): Promise<any>;
}

interface ProximityUser {
  fullName: string;
  rank: string;
  shipName: string;
  city: string;
  country: string;
  distance: number;
  whatsappNumber: string;
}

class QoiGPTBot {
  private client: WhatsAppClient;
  private storage: DatabaseStorage;
  private aiService: AIService;
  private isReady = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'qoi-gpt-bot'
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

    this.storage = new DatabaseStorage();
    this.aiService = new AIService();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr: string) => {
      console.log('\n🔗 Qoi GPT WhatsApp Bot - Scan QR Code:');
      qrcode.generate(qr, { small: true });
      console.log('\nScan the QR code above with your WhatsApp to connect the bot.\n');
    });

    this.client.on('ready', () => {
      console.log('✅ Qoi GPT WhatsApp Bot is ready!');
      console.log('📱 Basic greeting functionality enabled');
      this.isReady = true;
    });

    this.client.on('message', async (message: WhatsAppMessage) => {
      await this.handleMessage(message);
    });

    this.client.on('auth_failure', (msg: any) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason: any) => {
      console.log('📱 Qoi GPT Bot disconnected:', reason);
      this.isReady = false;
    });
  }

  private async handleMessage(message: WhatsAppMessage) {
    try {
      const messageBody = message.body.trim();
      const messageBodyLower = messageBody.toLowerCase();
      const sender = await message.getContact();
      const senderNumber = sender.number;

      // DISABLED: Extract ship name from any message
      // await this.extractAndUpdateShipName(messageBody, senderNumber);

      // DISABLED: Check if it's a koihai command
      // if (messageBodyLower === '\\koihai' || messageBodyLower === '/koihai' || messageBodyLower === 'koihai') {
      //   console.log(`📍 Koihai request from ${senderNumber}`);
      //   await this.handleKoihaiRequest(message, senderNumber);
      // }
      // DISABLED: Help command
      // else if (messageBodyLower === '\\help' || messageBodyLower === '/help' || messageBodyLower === 'help') {
      //   await this.sendHelpMessage(message);
      // }
      // QBOTwa Q&A functionality - any question that doesn't start with special commands
      if (!messageBodyLower.startsWith('\\') && 
          !messageBodyLower.startsWith('/') && 
          !messageBodyLower.includes('hello') && 
          !messageBodyLower.includes('hi') && 
          !messageBodyLower.includes('hey') &&
          messageBody.length > 5 && 
          messageBody.includes('?')) {
        console.log(`🤖 QBOTwa Q&A request from ${senderNumber}: ${messageBody.substring(0, 50)}...`);
        await this.handleQBOTwaQA(message, messageBody, senderNumber);
      }
      // Welcome new users or respond to greetings
      else if (messageBodyLower.includes('hello') || messageBodyLower.includes('hi') || messageBodyLower.includes('hey')) {
        await this.sendWelcomeMessage(message);
      }
    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
      await message.reply('Sorry, something went wrong. Please try again later.');
    }
  }

  private async handleKoihaiRequest(message: any, senderNumber: string) {
    try {
      // Get all users with location data
      const allUsers = await this.storage.getUsersWithLocation();
      
      if (allUsers.length === 0) {
        await message.reply('🌊 No sailors found in our network right now. Try again later!');
        return;
      }

      // For now, we'll show users from different maritime locations
      // In a real implementation, you'd get the sender's location and calculate proximity
      const nearbyUsers = this.selectNearbyUsers(allUsers, senderNumber);

      if (nearbyUsers.length === 0) {
        await message.reply('🌊 No sailors found nearby. Try expanding your search area!');
        return;
      }

      const responseMessage = this.formatKoihaiResponse(nearbyUsers);
      await message.reply(responseMessage);

      console.log(`📍 Sent ${nearbyUsers.length} nearby sailors to ${senderNumber}`);
    } catch (error) {
      console.error('Error handling koihai request:', error);
      await message.reply('⚠️ Unable to find nearby sailors right now. Please try again later.');
    }
  }

  private async extractAndUpdateShipName(messageBody: string, senderNumber: string) {
    try {
      const messageBodyLower = messageBody.toLowerCase();
      
      // Ship name patterns to match
      const shipPatterns = [
        /(?:currently\s+on|on\s+(?:the\s+)?|aboard\s+(?:the\s+)?|ship\s+|vessel\s+|mv\s+|ms\s+)([a-zA-Z0-9\s\-]+)/gi,
        /(?:sailing\s+on|working\s+on|stationed\s+on)\s+([a-zA-Z0-9\s\-]+)/gi,
        /(?:my\s+ship\s+is|our\s+ship\s+is|ship\s+name\s+is)\s+([a-zA-Z0-9\s\-]+)/gi
      ];

      let extractedShipName = null;

      for (const pattern of shipPatterns) {
        const matches = Array.from(messageBody.matchAll(pattern));
        for (const match of matches) {
          if (match[1]) {
            extractedShipName = match[1].trim();
            // Clean up common words that might be captured
            extractedShipName = extractedShipName
              .replace(/^(the|a|an)\s+/i, '')
              .replace(/\s+(ship|vessel)$/i, '')
              .trim();
            
            if (extractedShipName.length > 2) {
              break;
            }
          }
        }
        if (extractedShipName) break;
      }

      if (extractedShipName) {
        console.log(`🚢 Extracted ship name "${extractedShipName}" from ${senderNumber}`);
        
        // Update user's ship name in database
        await this.storage.updateUserShipName(senderNumber, extractedShipName);
        console.log(`✅ Updated ship name for ${senderNumber}: ${extractedShipName}`);
      }
    } catch (error) {
      console.error('Error extracting ship name:', error);
    }
  }

  private selectNearbyUsers(allUsers: any[], senderNumber: string): ProximityUser[] {
    // Filter out the sender if they're in the list
    const filteredUsers = allUsers.filter(user => 
      user.whatsappNumber !== senderNumber && user.userType === 'sailor'
    );

    // For demonstration, select up to 5 random sailors from different locations
    const shuffled = filteredUsers.sort(() => 0.5 - Math.random());
    const selectedUsers = shuffled.slice(0, 5);

    return selectedUsers.map((user, index) => ({
      fullName: user.fullName,
      rank: user.rank || 'Maritime Professional',
      shipName: user.shipName || 'Shore-based',
      city: user.city,
      country: user.country,
      distance: Math.floor(Math.random() * 50) + 1, // Simulated distance in km
      whatsappNumber: user.whatsappNumber || 'Not available'
    }));
  }

  private formatKoihaiResponse(users: ProximityUser[]): string {
    let response = '🚢 *Koihai! Found nearby sailors:*\n\n';
    
    users.forEach((user, index) => {
      response += `*${index + 1}. ${user.fullName}*\n`;
      response += `⚓ ${user.rank}\n`;
      if (user.shipName && user.shipName !== 'Shore-based') {
        response += `🚢 ${user.shipName}\n`;
      }
      response += `📍 ${user.city}, ${user.country}\n`;
      response += `📏 ~${user.distance} km away\n`;
      if (user.whatsappNumber && user.whatsappNumber !== 'Not available') {
        response += `📱 Contact available\n`;
      }
      response += '\n';
    });

    response += '💬 *Reply with sailor number (1-5) to get contact info*\n';
    response += '🔄 Send "\\koihai" again to refresh results\n';
    response += '❓ Send "\\help" for more commands';

    return response;
  }

  private async sendWelcomeMessage(message: any) {
    const welcomeText = `🌊 *Welcome to QBOTwa Maritime Assistant!*\n\n` +
      `I'm your AI-powered maritime expert connected to the QAAQ database.\n\n` +
      `*How to use:*\n` +
      `• Ask any maritime question with a "?" - I'll provide expert answers\n` +
      `• I search our extensive QAAQ maritime database for related content\n` +
      `• Get AI-powered responses from OpenAI with maritime expertise\n\n` +
      `*Example questions:*\n` +
      `"How do I troubleshoot engine problems?"\n` +
      `"What are the safety procedures for cargo handling?"\n\n` +
      `🤖 Ready to help with your maritime challenges!`;
    
    await message.reply(welcomeText);
  }

  private async sendHelpMessage(message: any) {
    const helpText = `🔧 *Qoi GPT Commands:*\n\n` +
      `*\\koihai* - Find nearby sailors and maritime professionals\n` +
      `*\\help* - Show this help message\n` +
      `*hello/hi* - Get welcome message\n\n` +
      `*How it works:*\n` +
      `1. Send \\koihai to see nearby sailors\n` +
      `2. Reply with a number (1-5) to get contact info\n` +
      `3. Connect and chat with fellow maritime professionals!\n\n` +
      `🌐 Powered by QaaqConnect - Maritime Community Platform`;
    
    await message.reply(helpText);
  }

  private async handleQBOTwaQA(message: any, questionText: string, senderNumber: string) {
    try {
      console.log(`🤖 Processing QBOTwa Q&A for ${senderNumber}`);
      
      // First, search for similar questions in the QAAQ database
      let relatedQuestions: any[] = [];
      try {
        const searchResults = await searchQuestions(questionText, 1, 3);
        relatedQuestions = searchResults.questions || [];
        console.log(`📚 Found ${relatedQuestions.length} related questions in QAAQ database`);
      } catch (error: any) {
        console.log('⚠️ Could not search questions database:', error?.message || 'Unknown error');
      }

      // Get user information from database for context
      let userInfo = null;
      try {
        userInfo = await this.storage.getUserByWhatsApp(senderNumber);
      } catch (error: any) {
        console.log('⚠️ Could not get user info:', error?.message || 'Unknown error');
      }

      // Prepare context for AI response
      let contextInfo = '';
      if (relatedQuestions.length > 0) {
        contextInfo = '\n\nRelated questions from QAAQ maritime database:\n';
        relatedQuestions.forEach((q: any, index: number) => {
          contextInfo += `${index + 1}. ${q.content.substring(0, 100)}...\n`;
        });
      }

      // Generate AI response using OpenAI with QAAQ database context
      const aiResponse = await this.aiService.generateOpenAIResponse(
        questionText + contextInfo,
        'Maritime Q&A',
        userInfo || { maritimeRank: 'Maritime Professional' },
        'Provide helpful, accurate maritime engineering and operational guidance',
        'en'
      );

      // Format response for WhatsApp
      let responseText = `🤖 *QBOTwa Maritime Assistant*\n\n`;
      responseText += `${aiResponse.content}\n\n`;
      
      if (relatedQuestions.length > 0) {
        responseText += `📚 *Related QAAQ Questions:*\n`;
        relatedQuestions.forEach((q: any, index: number) => {
          responseText += `${index + 1}. ${q.content.substring(0, 80)}...\n`;
        });
        responseText += `\n🔗 Visit QaaqConnect for detailed answers\n`;
      }
      
      responseText += `\n⚡ Powered by QAAQ Maritime Database & OpenAI`;

      // Send response
      await message.reply(responseText);
      
      console.log(`✅ QBOTwa response sent to ${senderNumber}`);

    } catch (error) {
      console.error('Error in QBOTwa Q&A:', error);
      await message.reply('🔧 Sorry, I encountered an issue processing your maritime question. Please try again or contact support.');
    }
  }

  public async start() {
    try {
      console.log('🚀 Starting Qoi GPT WhatsApp Bot...');
      await this.client.initialize();
    } catch (error) {
      console.error('Failed to start WhatsApp bot:', error);
    }
  }

  public async stop() {
    if (this.client) {
      await this.client.destroy();
      console.log('🛑 Qoi GPT WhatsApp Bot stopped');
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }
}

export default QoiGPTBot;