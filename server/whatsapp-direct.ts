import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, Message } = pkg;
import qrcode from 'qrcode-terminal';
import { storage } from './storage';
import { db } from './db';
import { users } from '../shared/schema';
import { and, or, eq, isNull, isNotNull } from 'drizzle-orm';

export class DirectWhatsAppBot {
  private client: Client;
  private isReady: boolean = false;
  private botProgramming: any = {};

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
    this.client.on('qr', (qr) => {
      console.log('\n🔄 DIRECT WHATSAPP BOT QR CODE FOR +905363694997:');
      console.log('═══════════════════════════════════════════════════════');
      qrcode.generate(qr, { small: true });
      console.log('═══════════════════════════════════════════════════════');
      console.log('📱 SCAN THIS QR CODE WITH WHATSAPP +905363694997 TO ACTIVATE BOT 1');
      console.log('⚠️  IMPORTANT: Use the phone number +905363694997 to scan this code\n');
    });

    this.client.on('ready', () => {
      console.log('✅ Direct WhatsApp Bot (+905363694997) is ready!');
      this.isReady = true;
      
      // BOT RULE: Only send messages as replies to user messages - NO BULK BROADCASTING
      console.log('📋 BOT RULE ENFORCED: Reply-only messaging - no bulk messages, no broadcasting');
    });

    this.client.on('authenticated', () => {
      console.log('🔐 Direct WhatsApp Bot authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Direct WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 Direct WhatsApp Bot disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message: Message) => {
      try {
        if (!message.from.includes('@c.us')) {
          console.log(`🚫 Direct Bot ignoring group message from: ${message.from}`);
          return; // Only handle individual chats
        }
        
        const contact = await message.getContact();
        const senderNumber = contact.number;
        const messageText = message.body;
        
        console.log(`📨 Direct Bot message from ${senderNumber}: ${messageText}`);
        console.log(`📨 Full message details - From: ${message.from}, Body: "${messageText}", Contact: ${contact.name || contact.pushname}`);
        
        // Process the message
        await this.handleIncomingMessage(senderNumber, messageText, contact.name || contact.pushname);
      } catch (error) {
        console.error('❌ Error handling direct WhatsApp message:', error);
        console.error('❌ Error details:', error);
        
        // Try to send error message to user if we can get their number
        try {
          const contact = await message.getContact();
          const senderNumber = contact.number;
          await this.sendMessage(`+${senderNumber}`, "Technical difficulties. Try again later.");
        } catch (sendError) {
          console.error('❌ Failed to send error message:', sendError);
        }
      }
    });
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Direct WhatsApp Bot for +905363694997...');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize Direct WhatsApp Bot:', error);
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.isReady) {
        console.log('⚠️ Direct WhatsApp Bot not ready, cannot send message');
        return false;
      }

      // Format phone number for WhatsApp
      const chatId = `${to.replace(/\+/g, '')}@c.us`;
      await this.client.sendMessage(chatId, message);
      
      console.log(`✅ Direct bot message sent to ${to}: ${message.substring(0, 50)}...`);
      return true;
    } catch (error) {
      console.error('❌ Error sending direct WhatsApp message:', error);
      return false;
    }
  }

  private async handleIncomingMessage(phoneNumber: string, messageText: string, senderName?: string) {
    try {
      console.log(`🔄 Processing message from +${phoneNumber}: "${messageText}"`);
      
      // Block WhatsApp support numbers only
      const blockedNumbers = [
        '15517868424', '+15517868424'
      ];
      
      if (blockedNumbers.some(blocked => phoneNumber.includes(blocked.replace('+', '')))) {
        console.log(`🚫 Blocked message from ${phoneNumber}`);
        return;
      }

      // Get or create user
      let user = await storage.getUserByWhatsAppNumber(`+${phoneNumber}`);
      
      if (!user) {
        // Auto-create user for new WhatsApp number - start name collection
        user = await storage.createUser({
          id: `wa_${phoneNumber}`,
          email: `${phoneNumber}@whatsapp.temp`,
          firstName: 'User',
          lastName: '',
          whatsappNumber: `+${phoneNumber}`,
          maritimeRank: 'other',
          experienceLevel: 1,
          isWhatsAppUser: true
        });
        
        console.log(`✅ Auto-created user for WhatsApp: +${phoneNumber}`);
        
        // Start name collection process
        await this.sendMessage(`+${phoneNumber}`, "Welcome to Qaaq GPT. I will need 5 simple details about you before I can start answering your maritime questions. Please let me know your name & surname (example Krish Kapoor)");
        await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_name');
        return;
      }

      // Check onboarding state for incomplete users - require all 5 profile fields
      const needsOnboarding = (user.firstName === 'User' || user.firstName === 'Marine' || user.firstName === '' || !user.firstName) ||
                              (user.maritimeRank === 'other' || !user.maritimeRank) ||
                              (!user.email || user.email.includes('@whatsapp.temp')) ||
                              (!user.lastShip) ||
                              (!user.lastCompany);
      
      if (needsOnboarding) {
        // Before answering any question, collect missing profile information
        const onboardingState = await storage.getUserOnboardingState(`+${phoneNumber}`);
        
        if (!onboardingState || onboardingState === 'needs_name') {
          await this.handleOnboardingFlow(user, messageText, phoneNumber);
          return;
        } else if (['collecting_name', 'collecting_rank', 'collecting_email', 'collecting_last_ship', 'collecting_last_company'].includes(onboardingState) || onboardingState.startsWith('confirming_name:')) {
          await this.handleOnboardingFlow(user, messageText, phoneNumber);
          return;
        }
      }

      // Normal message processing for complete users
      if (messageText.trim().endsWith('?')) {
        console.log(`✅ Processing question from +${phoneNumber}: "${messageText}"`);
        await this.processQuestion(user, messageText.trim(), phoneNumber);
      } else if (messageText.length < 10) {
        await this.sendMessage(`+${phoneNumber}`, "Need more details. End with '?' for proper help.");
      } else {
        await this.sendMessage(`+${phoneNumber}`, "End your maritime question with '?' for immediate technical help.");
      }

    } catch (error) {
      console.error('❌ Error processing direct WhatsApp message:', error);
      await this.sendMessage(`+${phoneNumber}`, "Technical difficulties. Try again later.");
    }
  }

  private async handleOnboardingFlow(user: any, messageText: string, phoneNumber: string) {
    try {
      const onboardingState = await storage.getUserOnboardingState(`+${phoneNumber}`);
      
      if (!onboardingState || onboardingState === 'needs_name') {
        // Ask for name
        await this.sendMessage(`+${phoneNumber}`, "Welcome to Qaaq GPT. I will need 5 simple details about you before I can start answering your maritime questions. Please let me know your name & surname (example Krish Kapoor)");
        await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_name');
        return;
      }
      
      // Handle name confirmation responses
      if (onboardingState && onboardingState.startsWith('confirming_name:')) {
        const pendingName = onboardingState.replace('confirming_name:', '');
        const response = messageText.trim().toLowerCase();
        
        if (response === 'yes' || response === 'y' || response === 'confirm' || response === 'correct') {
          // User confirmed the name
          const nameParts = pendingName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          await storage.updateUserProfile(user.id, { firstName, lastName });
          await this.sendMessage(`+${phoneNumber}`, `Thank you ${firstName}! What is your maritime rank?`);
          await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_rank');
          return;
        } else {
          // User provided a new name or said no
          await this.sendMessage(`+${phoneNumber}`, "Please provide your correct name & surname (example Krish Kapoor):");
          await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_name');
          return;
        }
      }
      
      if (onboardingState === 'collecting_name') {
        // Save name and ask for rank
        const name = messageText.trim();
        
        // Validate that this looks like a name, not a question or technical term
        if (name.length < 2) {
          await this.sendMessage(`+${phoneNumber}`, "Please provide your name & surname (example Krish Kapoor):");
          return;
        }
        
        // Enhanced validation to prevent technical terms from being saved as names
        const technicalTerms = ['function', 'omd', 'oil mist', 'detector', 'engine', 'ship', 'in ship', 'on ship',
                               'cargo', 'tank', 'system', 'vent', 'lifeboat', 'main engine', 'aux engine',
                               'pump', 'valve', 'boiler', 'generator', 'purifier', 'separator', 'compressor',
                               'cooler', 'heat exchanger', 'pipe', 'piping', 'machinery', 'equipment'];
        
        const questionWords = ['why', 'how', 'what', 'when', 'where', 'which'];
        
        const nameText = name.toLowerCase();
        const hasTechnicalTerms = technicalTerms.some(term => nameText.includes(term));
        const hasQuestionWords = questionWords.some(word => nameText.includes(word));
        
        if (name.includes('?') || hasTechnicalTerms || hasQuestionWords || name.split(' ').length > 8) {
          await this.sendMessage(`+${phoneNumber}`, "I need your name first before I can help with technical questions. Please provide your name & surname (example Krish Kapoor):");
          return;
        }
        
        try {
          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          // Additional validation for reasonable names
          if (firstName.length > 20 || lastName.length > 30) {
            await this.sendMessage(`+${phoneNumber}`, "Please provide your actual name (not a technical question). Name & surname (example Krish Kapoor):");
            return;
          }
          
          // Check for uncertain name patterns and ask for confirmation if needed
          const uncertainPatterns = [
            name.split(' ').length === 1 && name.length < 4, // Single short name like "K" or "Jo"
            /^[a-z\s]+$/.test(name), // All lowercase like "john smith"
            /^\d/.test(name), // Starts with number
            name.includes('.') && !name.includes('@'), // Has dots but not email
            name.split(' ').length === 1 && name.length > 10, // Single very long word might be unclear
            /^[a-z]/.test(name) && name.includes(' ') // Starts with lowercase letter
          ];
          
          if (uncertainPatterns.some(pattern => pattern)) {
            // Store the uncertain name temporarily and ask for confirmation
            await storage.setUserOnboardingState(`+${phoneNumber}`, `confirming_name:${name}`);
            await this.sendMessage(`+${phoneNumber}`, `Please confirm your name & surname (ex. Krish Kapoor):\n\n"${name}"\n\nReply "yes" to confirm or provide your correct full name.`);
            return;
          }
          
          await storage.updateUserProfile(user.id, { firstName, lastName });
          await this.sendMessage(`+${phoneNumber}`, `Thank you ${firstName}! What is your maritime rank?`);
          await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_rank');
          return;
        } catch (error) {
          console.error('❌ Error updating name:', error);
          await this.sendMessage(`+${phoneNumber}`, "I couldn't save that name. Please provide your name & surname again (example Krish Kapoor):");
          return;
        }
      }
      
      if (onboardingState === 'collecting_rank') {
        // Save rank and ask for email
        const rank = messageText.trim();
        if (rank.length < 2) {
          await this.sendMessage(`+${phoneNumber}`, "Please provide your maritime rank (e.g., Chief Engineer, 2nd Officer).");
          return;
        }
        
        try {
          // Normalize rank to match database enum
          const normalizedRank = this.normalizeRankToEnum(rank) as any;
          console.log(`🔧 Normalizing rank "${rank}" to "${normalizedRank}"`);
          
          await storage.updateUserProfile(user.id, { maritimeRank: normalizedRank });
          await this.sendMessage(`+${phoneNumber}`, `Great! What is your email address for updates?`);
          await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_email');
          return;
        } catch (error) {
          console.error('❌ Error updating rank:', error);
          await this.sendMessage(`+${phoneNumber}`, "I couldn't save that rank. Please provide your maritime rank (e.g., Chief Engineer, 2nd Officer, Captain).");
          return;
        }
      }
      
      if (onboardingState === 'collecting_email') {
        // Save email and ask for last ship
        const email = messageText.trim();
        if (email.length < 5 || !email.includes('@')) {
          await this.sendMessage(`+${phoneNumber}`, "Please provide a valid email address.");
          return;
        }
        
        await storage.updateUserProfile(user.id, { email: email });
        await this.sendMessage(`+${phoneNumber}`, `Perfect! What is your present/last ship name?`);
        await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_last_ship');
        return;
      }
      
      if (onboardingState === 'collecting_last_ship') {
        // Save last ship and ask for last company
        const lastShip = messageText.trim();
        if (lastShip.length < 2) {
          await this.sendMessage(`+${phoneNumber}`, "Please provide your present/last ship name.");
          return;
        }
        
        await storage.updateUserProfile(user.id, { lastShip: lastShip });
        await this.sendMessage(`+${phoneNumber}`, `Excellent! What is your present/last company name?`);
        await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_last_company');
        return;
      }
      
      if (onboardingState === 'collecting_last_company') {
        // Save last company and complete onboarding
        const lastCompany = messageText.trim();
        if (lastCompany.length < 2) {
          await this.sendMessage(`+${phoneNumber}`, "Please provide your present/last company name.");
          return;
        }
        
        await storage.updateUserProfile(user.id, { lastCompany: lastCompany });
        await storage.setUserOnboardingState(`+${phoneNumber}`, 'completed');
        
        await this.sendMessage(`+${phoneNumber}`, `Perfect! Profile complete. Welcome aboard ${user.firstName}! I'm ready to help with your maritime engineering questions.`);
        return;
      }
      
    } catch (error) {
      console.error('❌ Error in onboarding flow:', error);
      await this.sendMessage(`+${phoneNumber}`, "Let me help you get started. May I know your good name?");
      await storage.setUserOnboardingState(`+${phoneNumber}`, 'collecting_name');
    }
  }

  private normalizeRankToEnum(userInput: string): string {
    const input = userInput.toLowerCase().trim();
    
    // Comprehensive rank mappings to database enum values
    const rankMappings: Record<string, string> = {
      // Chief Engineer variations
      'chief engineer': 'chief_engineer',
      'chief eng': 'chief_engineer',
      'ce': 'chief_engineer',
      'chief': 'chief_engineer',
      'c/e': 'chief_engineer',
      'c.e': 'chief_engineer',
      
      // Second Engineer variations
      'second engineer': 'second_engineer',
      '2nd engineer': 'second_engineer',
      'second eng': 'second_engineer',
      '2nd eng': 'second_engineer',
      '2e': 'second_engineer',
      '2/e': 'second_engineer',
      '2.e': 'second_engineer',
      '2nd': 'second_engineer',
      'second': 'second_engineer',
      
      // Third Engineer variations
      'third engineer': 'third_engineer',
      '3rd engineer': 'third_engineer', 
      'third eng': 'third_engineer',
      '3rd eng': 'third_engineer',
      '3e': 'third_engineer',
      '3/e': 'third_engineer',
      '3.e': 'third_engineer',
      
      // Fourth Engineer variations
      'fourth engineer': 'fourth_engineer',
      '4th engineer': 'fourth_engineer',
      'fourth eng': 'fourth_engineer',
      '4th eng': 'fourth_engineer',
      '4e': 'fourth_engineer',
      '4/e': 'fourth_engineer',
      '4.e': 'fourth_engineer',
      
      // Engine Cadet variations
      'engine cadet': 'engine_cadet',
      'trainee marine engineer': 'engine_cadet',
      'tme': 'engine_cadet',
      'trainee': 'engine_cadet',
      'cadet': 'engine_cadet',
      'junior engineer': 'engine_cadet',
      'je': 'engine_cadet',
      
      // Master/Captain variations
      'master': 'master',
      'captain': 'master',
      'capt': 'master',
      
      // Officers
      'chief officer': 'chief_officer',
      'chief mate': 'chief_officer',
      'c/o': 'chief_officer',
      'c.o': 'chief_officer',
      'first officer': 'chief_officer',
      '1st officer': 'chief_officer',
      
      'second officer': 'second_officer',
      '2nd officer': 'second_officer',
      '2/o': 'second_officer',
      '2.o': 'second_officer',
      
      'third officer': 'third_officer',
      '3rd officer': 'third_officer',
      '3/o': 'third_officer',
      '3.o': 'third_officer',
      
      'deck cadet': 'deck_cadet',
      'deck trainee': 'deck_cadet',
      
      // Shore positions
      'ship manager': 'ship_manager',
      'superintendent': 'marine_superintendent_msi',
      'marine superintendent': 'marine_superintendent_msi',
      'msi': 'marine_superintendent_msi',
      'technical superintendent': 'marine_superintendent_msi'
    };
    
    // Check for exact matches first
    if (rankMappings[input]) {
      return rankMappings[input];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(rankMappings)) {
      if (input.includes(key) || key.includes(input)) {
        return value;
      }
    }
    
    console.log(`⚠️ Unknown rank: "${userInput}", defaulting to 'other'`);
    return 'other';
  }

  private assignQuestionCategory(questionText: string): number {
    const text = questionText.toLowerCase();
    
    // Category mappings based on keywords
    const categoryMappings = {
      // 1. Propulsion - Main engines, reduction gearboxes, shafting systems, propellers
      1: ['main engine', 'propulsion', 'propeller', 'gearbox', 'reduction gear', 'shaft', 'shafting', 'thrust bearing', 'rpm', 'power', 'horsepower', 'kw', 'torque'],
      
      // 3. FWG and SW - Fresh water generators, hydrophore, cooling water
      3: ['fwg', 'fresh water generator', 'hydrophore', 'cooling water', 'fresh water', 'water maker', 'evaporator', 'distillation'],
      
      // 4. Pumps & Coolers - Piping, Central cooling, jacket cooling, charge air coolers
      4: ['pump', 'cooling', 'cooler', 'piping', 'jacket cooling', 'charge air cooler', 'central cooling', 'heat exchanger'],
      
      // 5. Compressed Air - Air compressors, starting air, service air
      5: ['air compressor', 'starting air', 'service air', 'compressed air', 'air system', 'air bottle', 'air receiver'],
      
      // 6. Purification - Fuel transfer, Purifiers, booster pumps, lubrication
      6: ['purifier', 'separator', 'fuel', 'oil', 'purification', 'centrifuge', 'fuel transfer', 'lubrication', 'lube oil', 'fuel system'],
      
      // 7. Boiler - Auxiliary boilers, exhaust gas boilers, steam
      7: ['boiler', 'steam', 'exhaust gas boiler', 'auxiliary boiler', 'steam system', 'steam generation'],
      
      // 8. Cargo - Cargo pumps, FRAMO, MARFLEX, VRCS, tank radar
      8: ['cargo', 'framo', 'marflex', 'vrcs', 'cargo pump', 'tank', 'loadicator', 'radar', 'deck', 'ccr'],
      
      // 9. LSA FFA - Fire fighting, detection systems, breathing apparatus, SOLAS safety conventions
      9: ['fire', 'lsa', 'ffa', 'fire fighting', 'fire detection', 'breathing apparatus', 'safety', 'emergency', 'eba', 'scba',
          'solas', 'life saving', 'fire fighting apparatus', 'safety convention', 'emergency equipment'],
      
      // 10. Crane - Midship, Deck, Provision Cranes
      10: ['crane', 'winch', 'lifting', 'midship crane', 'deck crane', 'provision crane', 'gantry crane'],
      
      // 40. Pollution Control - MARPOL, BWMS, HPSCR, Scrubbers
      40: ['marpol', 'pollution', 'ballast water', 'bwms', 'scrubber', 'hpscr', 'sox', 'nox', 'emission', 
           'exhaust gas', 'marine pollution', 'oily water', 'sewage', 'garbage', 'air pollution', 
           'pollution prevention', 'environmental', 'discharge', 'annex'],
      
      // 2. Miscellaneous - Certifications, documentation, general maritime (non-safety), general IMO
      2: ['certificate', 'inspection', 'audit', 'port state', 'flag state', 'classification', 'survey', 
          'compliance', 'documentation', 'permit', 'license', 'authority', 'administration',
          'safety management', 'ism', 'isps', 'mlc', 'regulation', 'rules', 'stcw', 'imo', 'convention',
          'maritime law', 'international convention', 'imo convention']
    };
    
    // Check each category for keyword matches (specific categories first)
    // Priority order: Pollution Control (40) > LSA FFA (9) > others > Miscellaneous (2)
    const priorityOrder = [40, 9, 1, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 38, 41, 42, 43, 2];
    
    for (const categoryId of priorityOrder) {
      const keywords = categoryMappings[categoryId];
      if (keywords) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            console.log(`🎯 Question categorized as ${categoryId} based on keyword: "${keyword}"`);
            return parseInt(categoryId);
          }
        }
      }
    }
    
    // Default to Miscellaneous if no specific category found
    console.log(`📋 Question assigned to Miscellaneous (category 2) - no specific keywords found`);
    return 2;
  }

  private async processQuestion(user: any, questionText: string, phoneNumber: string) {
    try {
      // Create question in database with intelligent category assignment
      const categoryId = this.assignQuestionCategory(questionText);
      const question = await storage.createQuestion({
        content: questionText,
        userId: user.id,
        categoryId: categoryId,
        machineId: null,
        isFromWhatsApp: true,
        whatsappNumber: `+${phoneNumber}`
      });

      console.log(`✅ Question created: ${question.id} from +${phoneNumber}`);

      // Generate short direct response (70 words max, no links)
      const aiResponse = await this.generateShortDirectAnswer(questionText);
      
      // Create bot answer
      const botAnswer = await storage.createAnswer({
        content: aiResponse,
        questionId: question.id,
        userId: 'bot_qaaq_001' // Bot user ID
      });

      // Send short, direct response without links
      await this.sendMessage(`+${phoneNumber}`, aiResponse);

      console.log(`✅ AI response sent to +${phoneNumber} for question ${question.id}`);

    } catch (error) {
      console.error('❌ Error processing question:', error);
      await this.sendMessage(`+${phoneNumber}`, "Processing error. Try again later.");
    }
  }

  public getBotProgramming(): any {
    return this.botProgramming || {
      identity: "QAAQ GPT Direct Bot",
      messageProcessing: {
        questionMarkRequired: true,
        minimumLength: 10
      },
      dailyLimits: {
        incompleteProfile: 3,
        completeProfile: 10
      }
    };
  }

  public applyProgrammingUpdates(programming: any): void {
    try {
      console.log('🔧 Applying programming updates to Direct WhatsApp bot:', programming);
      this.botProgramming = { ...this.botProgramming, ...programming };
      console.log('✅ Direct bot programming updated successfully');
    } catch (error) {
      console.error('❌ Error applying bot programming updates:', error);
    }
  }

  private async generateShortDirectAnswer(questionText: string): Promise<string> {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_WHATSAPP_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Marine Chief Engineer with 20+ years experience. 

CRITICAL RESPONSE REQUIREMENTS:
- Maximum 70 words TOTAL
- Be direct and practical 
- NO links, URLs, or clickbait
- NO "visit our website" or "check platform"
- Just answer the question directly
- Include specific technical details (pressures, temperatures, procedures)
- Use maritime engineering terminology

Example: "Check purifier bowl closing water pressure should be 2-3 bar. Verify gravity disc size matches fuel viscosity. Clean bowl and replace if cracked. Ensure proper temperature 85-95°C before separating. Monitor discharge for water content."`
          },
          {
            role: 'user',
            content: questionText
          }
        ],
        max_tokens: 80,
        temperature: 0.7,
        store: true
      });

      let answer = response.choices[0]?.message?.content || 'Check your equipment manuals and follow standard procedures.';
      
      // Ensure answer is within 70 words
      const words = answer.split(' ');
      if (words.length > 70) {
        answer = words.slice(0, 70).join(' ');
      }

      return answer;
    } catch (error) {
      console.error('Error generating short direct answer:', error);
      return 'Check equipment manuals and follow standard maritime procedures for this issue.';
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  // Public method to send correction messages
  public async sendCorrectionMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        console.error('❌ WhatsApp bot not connected');
        return false;
      }
      
      const correctionSent = await this.sendMessage(phoneNumber, message);
      console.log(`✅ Correction message sent to ${phoneNumber}`);
      return correctionSent;
    } catch (error) {
      console.error('❌ Error sending correction message:', error);
      return false;
    }
  }

  async destroy() {
    try {
      if (this.client) {
        await this.client.destroy();
        console.log('🔌 Direct WhatsApp Bot disconnected');
      }
    } catch (error) {
      console.error('❌ Error destroying Direct WhatsApp Bot:', error);
    }
  }

  // RULE: Bot sends messages ONLY as replies to user messages - NO BULK BROADCASTING
  // This method is disabled to enforce reply-only messaging policy
  async initiateOnboardingForIncompleteUsers(): Promise<void> {
    console.log('🚫 BULK MESSAGING DISABLED: Bot only sends messages as replies to user messages');
    console.log('📋 Rule enforced: No broadcasting, no bulk messages, only reactive responses');
    return;
  }
}

// Create and export the direct bot instance
export const directWhatsAppBot = new DirectWhatsAppBot();