import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface WatiConfig {
  token: string;
  apiEndpoint: string;
}

interface WatiMessage {
  whatsappNumber: string;
  messageText?: string;
  templateName?: string;
  parameters?: Array<{ name: string; value: string }>;
}

interface WatiContact {
  whatsappNumber: string;
  name?: string;
  customParams?: Array<{ name: string; value: string }>;
}

interface WatiWebhookPayload {
  eventType: string;
  id?: string;
  whatsappMessageId?: string;
  conversationId?: string;
  waId: string;
  senderName?: string;
  text?: string;
  timestamp?: string;
  type?: string;
  templateName?: string;
  failedDetail?: string;
  failedCode?: string;
}

export class WatiService {
  private config: WatiConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: WatiConfig) {
    this.config = config;
    this.baseHeaders = {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    console.log('🔗 WATI Service initialized');
  }

  /**
   * Make HTTP request using built-in fetch
   */
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any): Promise<any> {
    const url = `${this.config.apiEndpoint}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: this.baseHeaders,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`WATI API error: ${response.status} - ${JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error: any) {
      console.error(`❌ WATI API request failed: ${method} ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Send a session message (works within 24-hour conversation window)
   */
  async sendSessionMessage(whatsappNumber: string, messageText: string): Promise<any> {
    try {
      const result = await this.makeRequest(`/sendSessionMessage/${whatsappNumber}`, 'POST', {
        messageText
      });
      
      console.log(`📱 Session message sent to ${whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send session message to ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a template message (can initiate new conversations)
   */
  async sendTemplateMessage(
    whatsappNumber: string, 
    templateName: string, 
    parameters: Array<{ name: string; value: string }> = [],
    broadcastName = 'QaaqConnect API'
  ): Promise<any> {
    try {
      const result = await this.makeRequest('/sendTemplateMessage', 'POST', {
        whatsappNumber,
        template_name: templateName,
        broadcast_name: broadcastName,
        parameters
      });
      
      console.log(`📧 Template message "${templateName}" sent to ${whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send template message to ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Send an interactive list message
   */
  async sendInteractiveListMessage(
    whatsappNumber: string,
    headerText: string,
    bodyText: string,
    listItems: Array<{ id: string; title: string; description?: string }>
  ): Promise<any> {
    try {
      const result = await this.makeRequest('/sendInteractiveListMessage', 'POST', {
        whatsappNumber,
        header: { text: headerText },
        body: { text: bodyText },
        listItems
      });
      
      console.log(`📋 Interactive list sent to ${whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send interactive list to ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Send interactive button message
   */
  async sendInteractiveButtonMessage(
    whatsappNumber: string,
    headerText: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<any> {
    try {
      const result = await this.makeRequest('/sendInteractiveButtonsMessage', 'POST', {
        whatsappNumber,
        header: { text: headerText },
        body: { text: bodyText },
        buttons
      });
      
      console.log(`🔘 Interactive buttons sent to ${whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send interactive buttons to ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Add a new contact to WATI
   */
  async addContact(whatsappNumber: string, name?: string, customParams?: Array<{ name: string; value: string }>): Promise<any> {
    try {
      const data: any = {};
      if (name) data.name = name;
      if (customParams) data.customParams = customParams;

      const result = await this.makeRequest(`/addContact/${whatsappNumber}`, 'POST', data);
      
      console.log(`👤 Contact added: ${name || whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to add contact ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(whatsappNumber: string, name?: string, customParams?: Array<{ name: string; value: string }>): Promise<any> {
    try {
      const data: any = {};
      if (name) data.name = name;
      if (customParams) data.customParams = customParams;

      const result = await this.makeRequest(`/updateContact/${whatsappNumber}`, 'PUT', data);
      
      console.log(`✏️ Contact updated: ${name || whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to update contact ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all contacts from WATI
   */
  async getContacts(): Promise<any> {
    try {
      const result = await this.makeRequest('/getContacts');
      console.log(`📇 Retrieved ${result?.contacts?.length || 0} contacts`);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to get contacts:', error.message);
      throw error;
    }
  }

  /**
   * Get messages for a specific WhatsApp number
   */
  async getMessages(whatsappNumber: string): Promise<any> {
    try {
      const result = await this.makeRequest(`/getMessages/${whatsappNumber}`);
      console.log(`💬 Retrieved messages for ${whatsappNumber}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to get messages for ${whatsappNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Get available message templates
   */
  async getMessageTemplates(): Promise<any> {
    try {
      const result = await this.makeRequest('/getMessageTemplates');
      console.log(`📝 Retrieved ${result?.templates?.length || 0} templates`);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to get message templates:', error.message);
      throw error;
    }
  }

  /**
   * Handle incoming WATI webhook
   */
  async handleWebhook(payload: WatiWebhookPayload): Promise<void> {
    console.log(`🔄 Processing WATI webhook: ${payload.eventType}`);
    
    try {
      switch (payload.eventType) {
        case 'message':
          await this.handleIncomingMessage(payload);
          break;
        case 'templateMessageSent':
          await this.handleTemplateMessageSent(payload);
          break;
        case 'sentMessageDELIVERED':
          await this.handleMessageDelivered(payload);
          break;
        case 'newContactMessageReceived':
          await this.handleNewContact(payload);
          break;
        case 'templateMessageFailed':
          await this.handleMessageFailed(payload);
          break;
        default:
          console.log(`⚠️ Unhandled webhook event: ${payload.eventType}`);
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message from user
   */
  private async handleIncomingMessage(payload: WatiWebhookPayload): Promise<void> {
    const { waId, text, senderName } = payload;
    
    console.log(`📨 New message from ${senderName} (${waId}): ${text}`);
    
    if (!text) return;
    
    // Check if user exists in our database
    const existingUser = await this.findUserByWhatsApp(waId);
    
    // Maritime-specific auto-responses
    if (text.toLowerCase().includes('port') || text.toLowerCase().includes('ship')) {
      await this.sendPortAndShipInfo(waId);
    } else if (text.toLowerCase().includes('rank') || text.toLowerCase().includes('officer')) {
      await this.sendRankGroupInfo(waId);
    } else if (text.toLowerCase().includes('question') || text.toLowerCase().includes('help')) {
      await this.sendQuestionAssistance(waId);
    } else if (text.toLowerCase().includes('location') || text.toLowerCase().includes('where')) {
      await this.sendLocationServices(waId);
    } else if (text.toLowerCase().includes('connect') || text.toLowerCase().includes('chat')) {
      await this.sendConnectionInfo(waId);
    } else {
      // Default response for maritime professionals
      await this.sendDefaultMaritimeResponse(waId, existingUser ? existingUser.fullName : senderName);
    }
  }

  /**
   * Send port and ship information
   */
  private async sendPortAndShipInfo(whatsappNumber: string): Promise<void> {
    const message = `🚢 *Maritime Port & Ship Services*

• Track ship locations and schedules
• Find nearby ports and facilities  
• Connect with crew members at ports
• Access port services and shore leave info

Would you like to:
1. Find ships in a specific port
2. Get port facility information
3. Connect with nearby crew members

Reply with 1, 2, or 3 to continue.`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Send rank group information
   */
  private async sendRankGroupInfo(whatsappNumber: string): Promise<void> {
    const message = `⚓ *Maritime Rank Groups*

Connect with maritime professionals by rank:
• Captains & Masters
• Chief Engineers  
• Officers (1st, 2nd, 3rd)
• Crew Members
• Shore-based Maritime Staff

Join your rank group to:
✓ Share professional experiences
✓ Ask technical questions
✓ Network with peers
✓ Get career guidance

Type your maritime rank to get connected!`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Send question assistance
   */
  private async sendQuestionAssistance(whatsappNumber: string): Promise<void> {
    const message = `❓ *Maritime Q&A Assistance*

Get help with:
• Technical equipment issues
• Navigation procedures
• Safety protocols
• Certification requirements
• Career guidance

*Popular Categories:*
🔧 Engine Room
⚓ Deck Operations  
🧭 Navigation
🛡️ Safety & Security
📋 Documentation

Ask your question and our maritime experts will help!

You can also browse 1,200+ answered questions on our platform.`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Send location services info
   */
  private async sendLocationServices(whatsappNumber: string): Promise<void> {
    const message = `📍 *Location & Discovery Services*

*"Koi Hai?" - Who's There?*
Find maritime professionals near you:

• Sailors at the same port
• Officers on shore leave
• Maritime professionals in your city
• Crew members from your company

*Features:*
✓ Real-time location sharing
✓ Port-based discovery
✓ Ship crew finder
✓ Shore leave connections

Share your location to find who's nearby!`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Send connection information
   */
  private async sendConnectionInfo(whatsappNumber: string): Promise<void> {
    const message = `💬 *Connect with Maritime Community*

*Available on QaaqConnect:*
• Direct messaging with professionals
• Rank-based group chats
• Port location sharing
• Professional networking

*To get started:*
1. Visit our web platform
2. Login with your WhatsApp number
3. Complete your maritime profile
4. Start connecting!

Type "profile" to set up your maritime profile now.`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Send default maritime response
   */
  private async sendDefaultMaritimeResponse(whatsappNumber: string, name?: string): Promise<void> {
    const greeting = name ? `Hello ${name}!` : 'Hello!';
    
    const message = `${greeting} 👋

Welcome to *QaaqConnect* - The Maritime Professional Network!

🚢 *How can I assist you today?*

Type:
• "port" - Ship & port information
• "rank" - Join your rank group  
• "question" - Ask maritime experts
• "location" - Find nearby sailors
• "connect" - Networking features

Or simply ask me anything about maritime life!

_Your maritime community is here to help_ ⚓`;

    await this.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * Handle template message sent confirmation
   */
  private async handleTemplateMessageSent(payload: WatiWebhookPayload): Promise<void> {
    console.log(`✅ Template "${payload.templateName}" sent to ${payload.waId}`);
  }

  /**
   * Handle message delivered confirmation
   */
  private async handleMessageDelivered(payload: WatiWebhookPayload): Promise<void> {
    console.log(`📬 Message delivered to ${payload.waId}: ${payload.whatsappMessageId}`);
  }

  /**
   * Handle new contact
   */
  private async handleNewContact(payload: WatiWebhookPayload): Promise<void> {
    console.log(`👋 New contact: ${payload.senderName} (${payload.waId})`);
    
    // Send welcome message to new contacts
    await this.sendDefaultMaritimeResponse(payload.waId, payload.senderName);
    
    // Add contact with maritime-specific attributes
    await this.addContact(payload.waId, payload.senderName, [
      { name: 'source', value: 'whatsapp_new_contact' },
      { name: 'platform', value: 'qaaqconnect' },
      { name: 'industry', value: 'maritime' }
    ]);
  }

  /**
   * Handle message failure
   */
  private async handleMessageFailed(payload: WatiWebhookPayload): Promise<void> {
    console.error(`❌ Message failed for ${payload.waId}: ${payload.failedDetail} (Code: ${payload.failedCode})`);
  }

  /**
   * Find user by WhatsApp number in database
   */
  private async findUserByWhatsApp(whatsappNumber: string): Promise<any> {
    try {
      const [user] = await db.select().from(users).where(eq(users.whatsAppNumber, whatsappNumber));
      return user;
    } catch (error) {
      console.error('Error finding user by WhatsApp:', error);
      return null;
    }
  }

  /**
   * Send maritime-specific welcome template
   */
  async sendMaritimeWelcome(whatsappNumber: string, userName: string, shipName?: string): Promise<any> {
    return this.sendTemplateMessage(whatsappNumber, 'maritime_welcome', [
      { name: 'user_name', value: userName },
      { name: 'ship_name', value: shipName || 'your vessel' }
    ]);
  }

  /**
   * Send port arrival notification
   */
  async sendPortArrivalNotification(whatsappNumber: string, portName: string, arrivalTime: string): Promise<any> {
    return this.sendTemplateMessage(whatsappNumber, 'port_arrival', [
      { name: 'port_name', value: portName },
      { name: 'arrival_time', value: arrivalTime }
    ]);
  }

  /**
   * Send question answered notification
   */
  async sendQuestionAnsweredNotification(whatsappNumber: string, questionTitle: string, answererName: string): Promise<any> {
    return this.sendTemplateMessage(whatsappNumber, 'question_answered', [
      { name: 'question_title', value: questionTitle },
      { name: 'answerer_name', value: answererName }
    ]);
  }
}

// Initialize WATI service
let watiService: WatiService | null = null;

export function initializeWatiService(token: string, apiEndpoint: string = 'https://app-server.wati.io/api/v1'): WatiService {
  watiService = new WatiService({ token, apiEndpoint });
  return watiService;
}

export function getWatiService(): WatiService | null {
  return watiService;
}