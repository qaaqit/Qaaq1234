import { directWhatsAppBot } from './whatsapp-direct';

export class BotManager {
  // Send message via specific bot (no routing)
  static async sendDirectBotMessage(to: string, message: string): Promise<boolean> {
    return await directWhatsAppBot.sendMessage(to, message);
  }



  // Get bot status for both systems
  static getBotStatus() {
    return {
      directBot: {
        number: '+905363694997',
        connected: directWhatsAppBot.isConnected(),
        type: 'Direct WhatsApp Web'
      },

    };
  }

  // Each bot processes its own messages independently
  static async processDirectBotMessage(phoneNumber: string, message: string) {
    console.log(`📨 Direct Bot processing message from ${phoneNumber}: ${message}`);
    // Direct bot handles its own messages internally
    return { status: 'processed', source: 'direct', bot: '+905363694997' };
  }


}

export const botManager = new BotManager();