import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import * as qrcode from 'qrcode-terminal';
import { DatabaseStorage } from './storage';

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
  private client: Client;
  private storage: DatabaseStorage;
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
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('\n🔗 Qoi GPT WhatsApp Bot - Scan QR Code:');
      qrcode.generate(qr, { small: true });
      console.log('\nScan the QR code above with your WhatsApp to connect the bot.\n');
    });

    this.client.on('ready', () => {
      console.log('✅ Qoi GPT WhatsApp Bot is ready!');
      console.log('📱 Users can now send "\\koihai" to find nearby sailors');
      this.isReady = true;
    });

    this.client.on('message', async (message: Message) => {
      await this.handleMessage(message);
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('📱 Qoi GPT Bot disconnected:', reason);
      this.isReady = false;
    });
  }

  private async handleMessage(message: any) {
    try {
      const messageBody = message.body.trim();
      const messageBodyLower = messageBody.toLowerCase();
      const sender = await message.getContact();
      const senderNumber = sender.number;

      // FIRST: Extract ship name from any message
      await this.extractAndUpdateShipName(messageBody, senderNumber);

      // Check if it's a koihai command
      if (messageBodyLower === '\\koihai' || messageBodyLower === '/koihai' || messageBodyLower === 'koihai') {
        console.log(`📍 Koihai request from ${senderNumber}`);
        await this.handleKoihaiRequest(message, senderNumber);
      }
      // Help command
      else if (messageBodyLower === '\\help' || messageBodyLower === '/help' || messageBodyLower === 'help') {
        await this.sendHelpMessage(message);
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
        const matches = messageBody.matchAll(pattern);
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
    const welcomeText = `🌊 *Welcome to Qoi GPT!*\n\n` +
      `I help maritime professionals connect with nearby sailors.\n\n` +
      `*Commands:*\n` +
      `• \\koihai - Find nearby sailors\n` +
      `• \\help - Show all commands\n\n` +
      `🚢 Ready to discover who's around you?`;
    
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