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
  countryCode?: string;
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
  async addContact(contact: WatiContact): Promise<any> {
    try {
      const data: any = {};
      if (contact.name) data.name = contact.name;
      if (contact.customParams) data.customParams = contact.customParams;

      // Use full phone number with country code for WATI API endpoint
      const fullPhoneNumber = contact.countryCode ? 
        `${contact.countryCode}${contact.whatsappNumber}` : 
        contact.whatsappNumber;

      const result = await this.makeRequest(`/addContact/${fullPhoneNumber.replace('+', '')}`, 'POST', data);
      
      console.log(`👤 Contact added: ${contact.name || contact.whatsappNumber} (${fullPhoneNumber})`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to add contact ${contact.whatsappNumber}:`, error.message);
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
    await this.addContact({
      whatsappNumber: payload.waId,
      name: payload.senderName,
      customParams: [
        { name: 'source', value: 'whatsapp_new_contact' },
        { name: 'platform', value: 'qaaqconnect' },
        { name: 'industry', value: 'maritime' }
      ]
    });
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

  /**
   * Export all users from database to WATI format
   */
  async exportUsersToWati(): Promise<{ success: boolean; contacts: any[]; csvData: string; vcfData: string }> {
    try {
      console.log('📤 Starting user export to WATI...');
      
      // Get all users from database with WhatsApp numbers
      const allUsers = await db.select().from(users);
      
      const watiContacts = [];
      const csvRows = ['Full Name,WhatsApp Number,Maritime Rank,Email,Company,Current City,Question Count,Present/Last Ship'];
      const vcfContacts = [];
      
      for (const user of allUsers) {
        // Skip users without WhatsApp numbers
        if (!user.id || !user.id.startsWith('+')) continue;
        
        // Extract country code and phone number properly
        const fullPhoneNumber = user.id; // e.g., "+919481344941"
        let countryCode = '';
        let phoneNumber = '';
        
        // Extract country code (assuming +91 for India, +1 for US, etc.)
        if (fullPhoneNumber.startsWith('+91')) {
          countryCode = '+91';
          phoneNumber = fullPhoneNumber.substring(3); // Remove +91
        } else if (fullPhoneNumber.startsWith('+1')) {
          countryCode = '+1';
          phoneNumber = fullPhoneNumber.substring(2); // Remove +1
        } else if (fullPhoneNumber.startsWith('+')) {
          // Generic extraction for other country codes (2-3 digits)
          const match = fullPhoneNumber.match(/^(\+\d{1,3})(\d+)$/);
          if (match) {
            countryCode = match[1];
            phoneNumber = match[2];
          } else {
            countryCode = '+91'; // Default to India
            phoneNumber = fullPhoneNumber.substring(1);
          }
        } else {
          // If no + prefix, assume it's a phone number with default country code
          countryCode = '+91';
          phoneNumber = user.id;
        }
        
        const fullName = user.fullName || user.nickname || `Maritime User ${phoneNumber.substring(-4)}`;
        const maritimeRank = user.maritimeRank || user.rank || '';
        const email = user.email || '';
        const company = user.company || user.lastCompany || '';
        const currentCity = user.currentCity || user.city || '';
        const questionCount = user.questionCount || 0;
        const presentShip = user.shipName || user.lastShip || user.currentShipName || '';
        
        // WATI contact format with proper fields
        const watiContact = {
          whatsappNumber: phoneNumber, // Phone number without country code
          countryCode: countryCode,    // Country code with +
          name: fullName,
          customParams: [
            { name: 'country_code', value: countryCode },
            { name: 'full_phone', value: fullPhoneNumber },
            { name: 'maritime_rank', value: maritimeRank },
            { name: 'email', value: email },
            { name: 'company', value: company },
            { name: 'current_city', value: currentCity },
            { name: 'question_count', value: questionCount.toString() },
            { name: 'ship_name', value: presentShip }
          ].filter(param => param.value && param.value !== '') // Remove empty params
        };
        
        watiContacts.push(watiContact);
        
        // Enhanced CSV row
        csvRows.push(`"${fullName}","${user.id}","${maritimeRank}","${email}","${company}","${currentCity}","${questionCount}","${presentShip}"`);
        
        // VCF contact
        const vcfContact = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${fullName}`,
          `TEL;TYPE=CELL:${user.id}`,
          email ? `EMAIL:${email}` : '',
          currentCity ? `ADR:;;${currentCity};;;;` : '',
          maritimeRank ? `TITLE:${maritimeRank}` : '',
          company ? `ORG:${company}` : '',
          presentShip ? `NOTE:Ship: ${presentShip}` : '',
          'END:VCARD'
        ].filter(line => line).join('\r\n');
        
        vcfContacts.push(vcfContact);
      }
      
      const csvData = csvRows.join('\n');
      const vcfData = vcfContacts.join('\r\n\r\n');
      
      console.log(`📤 Exported ${watiContacts.length} maritime contacts for WATI`);
      
      return {
        success: true,
        contacts: watiContacts,
        csvData,
        vcfData
      };
      
    } catch (error) {
      console.error('Error exporting users to WATI:', error);
      throw error;
    }
  }

  /**
   * Bulk import contacts to WATI (with proper chunking for large datasets)
   */
  async bulkImportContacts(contacts: WatiContact[]): Promise<any> {
    try {
      console.log(`📤 Bulk importing ${contacts.length} contacts to WATI...`);
      
      const results = [];
      const batchSize = 5; // Smaller batches for large datasets
      const maxRetries = 3;
      
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        console.log(`📤 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(contacts.length/batchSize)} (${batch.length} contacts)`);
        
        const batchPromises = batch.map(async (contact, index) => {
          let retries = 0;
          
          while (retries < maxRetries) {
            try {
              // Add small delay for each contact to avoid overwhelming the API
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              
              const result = await this.addContact(contact);
              console.log(`✅ Imported ${contact.name} (${contact.whatsappNumber})`);
              return { success: true, contact: contact.whatsappNumber, result };
              
            } catch (error) {
              retries++;
              console.warn(`⚠️ Attempt ${retries} failed for ${contact.whatsappNumber}: ${error.message}`);
              
              if (retries >= maxRetries) {
                console.error(`❌ Failed to import ${contact.whatsappNumber} after ${maxRetries} attempts`);
                return { success: false, contact: contact.whatsappNumber, error: error.message };
              }
              
              // Exponential backoff delay
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
            }
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Longer delay between batches to respect rate limits
        if (i + batchSize < contacts.length) {
          console.log(`⏳ Waiting 3 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`📤 Bulk import complete: ${successful} successful, ${failed} failed out of ${contacts.length} total`);
      
      return {
        success: true,
        total: contacts.length,
        successful,
        failed,
        results: results.slice(0, 10) // Only return first 10 results to avoid payload size issues
      };
      
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw error;
    }
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