import { db } from './db';
import { 
  users, 
  watiConversationState, 
  watiMessageHistory, 
  watiTechnicalClarifications 
} from '../shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';
import { WatiService } from './wati-service';
import OpenAI from 'openai';

interface MessageClassification {
  type: 'greeting' | 'question' | 'command' | 'location' | 'commercial' | 'emergency' | 'casual' | 'unclear';
  confidence: number;
  isAmbiguous?: boolean;
  needsClarification?: boolean;
}

interface ConversationState {
  id: string;
  whatsappNumber: string;
  currentFlow: 'conversation' | 'technical' | 'onboarding';
  currentStep: string;
  stepData: Record<string, any>;
  onboardingComplete: boolean;
  dailyQuestionCount: number;
}

export class GrandmasterWatiBot {
  private watiService: WatiService;
  private openai: OpenAI;

  constructor(watiService: WatiService) {
    this.watiService = watiService;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('🤖 QBOTchief (GrandMaster WATI Bot) initialized');
  }

  /**
   * MAIN ENTRY POINT: Process incoming message according to GrandMaster rules
   */
  async processMessage(whatsappNumber: string, messageText: string, senderName?: string): Promise<void> {
    const startTime = Date.now();
    console.log(`📨 [QBOTchief] Processing message from ${whatsappNumber}: "${messageText}"`);

    try {
      // 1. MESSAGE RECEPTION & RECOVERY (Flow Step 1-1.1)
      if (!messageText || messageText.trim().length === 0) {
        await this.handleMessageRecovery(whatsappNumber);
        return;
      }

      // 2. USER AUTHENTICATION CHECK (Flow Step 2-2.1)
      const userAuth = await this.checkUserAuthentication(whatsappNumber);
      if (!userAuth.exists && !userAuth.canRecover) {
        await this.redirectToOnboarding(whatsappNumber, messageText, senderName);
        return;
      }

      // 3. MESSAGE CLASSIFICATION (Flow Step 3)
      const classification = await this.classifyMessage(messageText);
      
      // Log message
      await this.logMessage(whatsappNumber, 'inbound', messageText, classification.type);

      // Route to appropriate flow based on classification
      await this.routeMessage(whatsappNumber, messageText, classification, userAuth.user);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [QBOTchief] Message processed in ${processingTime}ms`);

    } catch (error) {
      console.error('❌ [QBOTchief] Error processing message:', error);
      await this.handleCriticalError(whatsappNumber, error);
    }
  }

  /**
   * MESSAGE CLASSIFICATION ENGINE
   * Implements Step 3 of GrandMaster Conversation Flow
   */
  private async classifyMessage(messageText: string): Promise<MessageClassification> {
    const text = messageText.toLowerCase().trim();

    // 3.1 GREETING DETECTION
    const greetingPatterns = ['hi', 'hello', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hey', 'hola'];
    if (greetingPatterns.some(pattern => text.includes(pattern))) {
      return { type: 'greeting', confidence: 0.9 };
    }

    // 3.2 QUESTION MARK DETECTION
    if (text.endsWith('?') && text.length >= 10) {
      return { 
        type: 'question', 
        confidence: 0.95,
        isAmbiguous: this.isQuestionAmbiguous(text),
        needsClarification: this.needsClarification(text)
      };
    }

    // 3.3 COMMAND DETECTION
    const commands = ['/help', '/profile', '/status', '/location', 'help', 'profile', 'status'];
    if (commands.some(cmd => text.includes(cmd))) {
      return { type: 'command', confidence: 0.9 };
    }

    // 3.4 LOCATION REQUEST DETECTION
    const locationPatterns = ['koi hai', 'who is here', 'nearby', 'location', 'where', 'कोई है'];
    if (locationPatterns.some(pattern => text.includes(pattern))) {
      return { type: 'location', confidence: 0.85 };
    }

    // 3.5 COMMERCIAL DETECTION
    const commercialPatterns = ['buy', 'price', 'store', 'order', 'purchase', 'cost', 'payment'];
    if (commercialPatterns.some(pattern => text.includes(pattern))) {
      return { type: 'commercial', confidence: 0.8 };
    }

    // 3.6 EMERGENCY DETECTION
    const emergencyPatterns = ['emergency', 'urgent', 'help', 'accident', 'medical', 'mayday', 'distress'];
    if (emergencyPatterns.some(pattern => text.includes(pattern))) {
      return { type: 'emergency', confidence: 0.95 };
    }

    // 3.7 CASUAL CHAT DETECTION
    if (this.isMaritimeRelated(text)) {
      return { type: 'casual', confidence: 0.7 };
    }

    // 3.8 DEFAULT: UNCLEAR MESSAGE
    return { type: 'unclear', confidence: 0.5 };
  }

  /**
   * MESSAGE ROUTING based on classification
   */
  private async routeMessage(
    whatsappNumber: string, 
    messageText: string, 
    classification: MessageClassification,
    user: any
  ): Promise<void> {
    
    switch (classification.type) {
      case 'greeting':
        await this.handleGreeting(whatsappNumber, user);
        break;
        
      case 'question':
        if (classification.needsClarification || classification.isAmbiguous) {
          await this.handleTechnicalFlow(whatsappNumber, messageText, user);
        } else {
          await this.handleDirectTechnicalQuestion(whatsappNumber, messageText, user);
        }
        break;
        
      case 'command':
        await this.handleCommand(whatsappNumber, messageText, user);
        break;
        
      case 'location':
        await this.handleLocationQuery(whatsappNumber, user);
        break;
        
      case 'commercial':
        await this.handleCommercialQuery(whatsappNumber);
        break;
        
      case 'emergency':
        await this.handleEmergency(whatsappNumber, messageText);
        break;
        
      case 'casual':
        await this.handleCasualChat(whatsappNumber, messageText, user);
        break;
        
      case 'unclear':
      default:
        await this.handleUnclearMessage(whatsappNumber);
        break;
    }
  }

  /**
   * TECHNICAL FLOW HANDLER
   * Implements GrandMaster Technical Question Processing
   */
  async handleTechnicalFlow(whatsappNumber: string, question: string, user: any): Promise<void> {
    try {
      // Check daily limits
      const canAsk = await this.checkDailyLimits(whatsappNumber, user);
      if (!canAsk.allowed) {
        await this.watiService.sendSessionMessage(whatsappNumber, canAsk.message!);
        return;
      }

      // Check if question needs clarification
      if (this.needsClarification(question)) {
        await this.sendClarificationRequest(whatsappNumber, question);
      } else {
        await this.processDirectTechnicalQuestion(whatsappNumber, question, user);
      }

    } catch (error) {
      console.error('Error in technical flow:', error);
      await this.watiService.sendSessionMessage(
        whatsappNumber, 
        "I'm having technical difficulties processing your question. Please try again in a moment."
      );
    }
  }

  /**
   * SEND A/B CLARIFICATION REQUEST
   */
  private async sendClarificationRequest(whatsappNumber: string, question: string): Promise<void> {
    const topic = this.extractTopicFromQuestion(question);
    
    const clarificationText = `I want to give you the most helpful answer about ${topic}. Please clarify:

🔍 **Are you asking about:**
A) **Definition/Theory** - How it works, purpose, technical explanation
B) **Troubleshooting** - Solving a problem or operational issue

Reply **A** for theory/explanation or **B** for problem-solving guidance.

Your question: '${question}'`;

    await this.watiService.sendSessionMessage(whatsappNumber, clarificationText);

    // Store clarification in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute timeout

    await db.insert(watiTechnicalClarifications).values({
      whatsappNumber,
      originalQuestion: question,
      clarificationType: 'pending',
      clarificationSent: true,
      expiresAt
    });

    console.log(`🔍 Clarification request sent to ${whatsappNumber}`);
  }

  /**
   * PROCESS TECHNICAL QUESTION with O1-MINI
   */
  private async processDirectTechnicalQuestion(
    whatsappNumber: string, 
    question: string, 
    user: any
  ): Promise<void> {
    
    let prompt: string;
    
    if (this.isDefinitionQuestion(question)) {
      prompt = this.buildDefinitionPrompt(question);
    } else {
      prompt = this.buildTroubleshootingPrompt(question);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "o1-mini",
        messages: [{ role: "user", content: prompt }]
      });

      const aiAnswer = response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      
      await this.watiService.sendSessionMessage(whatsappNumber, aiAnswer);
      await this.incrementDailyQuestionCount(whatsappNumber);
      
      // Log the AI response
      await this.logMessage(whatsappNumber, 'outbound', aiAnswer, 'ai_technical_response');
      
      console.log(`🤖 Technical answer sent to ${whatsappNumber}`);
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      await this.watiService.sendSessionMessage(
        whatsappNumber,
        "I'm having trouble connecting to my AI system. Please try your question again in a few minutes."
      );
    }
  }

  /**
   * ONBOARDING FLOW
   * Implements GrandMaster Onboarding Process
   */
  async redirectToOnboarding(whatsappNumber: string, firstMessage: string, senderName?: string): Promise<void> {
    console.log(`🚀 Starting onboarding for ${whatsappNumber}`);

    const welcomeMessage = `🚢 Welcome to QAAQ - Maritime Professional Network!
I'm QBOT, your 24/7 maritime technical assistant.

Please share your full name for professional verification:
Example: "John Smith" or "राज कुमार"`;

    await this.watiService.sendSessionMessage(whatsappNumber, welcomeMessage);

    // Create conversation state
    await this.createConversationState(whatsappNumber, 'onboarding', 'name_collection', {
      firstMessage,
      senderName
    });
  }

  /**
   * CONVERSATION STATE MANAGEMENT
   */
  private async createConversationState(
    whatsappNumber: string,
    flow: 'conversation' | 'technical' | 'onboarding',
    step: string,
    stepData: Record<string, any> = {}
  ): Promise<void> {
    
    await db.insert(watiConversationState).values({
      whatsappNumber,
      currentFlow: flow,
      currentStep: step,
      stepData,
      lastActivity: new Date()
    }).onConflictDoUpdate({
      target: watiConversationState.whatsappNumber,
      set: {
        currentFlow: flow,
        currentStep: step,
        stepData,
        lastActivity: new Date(),
        updatedAt: new Date()
      }
    });
  }

  private async getConversationState(whatsappNumber: string): Promise<ConversationState | null> {
    const result = await db.select()
      .from(watiConversationState)
      .where(eq(watiConversationState.whatsappNumber, whatsappNumber))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * UTILITY FUNCTIONS
   */
  private async checkUserAuthentication(whatsappNumber: string): Promise<{
    exists: boolean;
    canRecover: boolean;
    user?: any;
  }> {
    const user = await db.select()
      .from(users)
      .where(eq(users.whatsAppNumber, whatsappNumber))
      .limit(1);

    return {
      exists: user.length > 0,
      canRecover: true, // Always allow recovery in this implementation
      user: user[0] || null
    };
  }

  private async checkDailyLimits(whatsappNumber: string, user: any): Promise<{
    allowed: boolean;
    message?: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const state = await this.getConversationState(whatsappNumber);
    const dailyCount = state?.dailyQuestionCount || 0;
    
    // Check if it's a new day
    const lastQuestionDate = new Date(state?.lastActivity || today);
    if (lastQuestionDate.toDateString() !== today.toDateString()) {
      await this.resetDailyQuestionCount(whatsappNumber);
      return { allowed: true };
    }

    const profileComplete = user && this.calculateProfileCompleteness(user) >= 50;
    const limit = profileComplete ? 10 : 3;
    
    if (dailyCount >= limit) {
      const message = profileComplete 
        ? "You've reached your daily limit of 10 technical questions. Your limit will reset at midnight. For urgent queries, contact our experts directly."
        : "You've reached your daily limit of 3 bot answers. Please update your profile on qaaq.app to ask more questions.";
      
      return { allowed: false, message };
    }

    return { allowed: true };
  }

  private isQuestionAmbiguous(question: string): boolean {
    const ambiguousPatterns = [
      'what is',
      'purpose of',
      'how does',
      'function of',
      'used for'
    ];
    
    return ambiguousPatterns.some(pattern => 
      question.toLowerCase().includes(pattern)
    );
  }

  private needsClarification(question: string): boolean {
    const text = question.toLowerCase();
    
    // Check for equipment without problem indicators
    const hasEquipment = /\b(engine|pump|compressor|valve|boiler|turbine|generator|motor)\b/.test(text);
    const hasProblemIndicators = /(not working|broken|failed|stopped|problem|issue|malfunction|error|fix|repair|troubleshoot)/i.test(text);
    
    return hasEquipment && !hasProblemIndicators && this.isQuestionAmbiguous(question);
  }

  private isDefinitionQuestion(question: string): boolean {
    const definitionPatterns = [
      'what is',
      'define',
      'meaning of',
      'explain',
      'purpose of',
      'function of',
      'used for',
      'why used'
    ];
    
    return definitionPatterns.some(pattern => 
      question.toLowerCase().includes(pattern)
    );
  }

  private isMaritimeRelated(text: string): boolean {
    const maritimeTerms = [
      'ship', 'vessel', 'boat', 'port', 'harbor', 'sea', 'ocean',
      'captain', 'officer', 'crew', 'sailor', 'marine', 'maritime',
      'engine', 'deck', 'cargo', 'navigation', 'anchor', 'sailing'
    ];
    
    return maritimeTerms.some(term => text.includes(term));
  }

  private extractTopicFromQuestion(question: string): string {
    // Simple topic extraction - could be enhanced with NLP
    const words = question.toLowerCase().split(' ');
    const maritimeTerms = ['engine', 'pump', 'compressor', 'valve', 'boiler', 'turbine'];
    
    for (const term of maritimeTerms) {
      if (words.includes(term)) {
        return term;
      }
    }
    
    return 'this topic';
  }

  private buildDefinitionPrompt(question: string): string {
    return `You are a Marine Chief Engineer with 20+ years experience providing educational explanations.

CRITICAL INSTRUCTION: The user is asking for a DEFINITION or EXPLANATION, NOT troubleshooting help.

RESPONSE REQUIREMENTS:
- Provide clear, educational explanations and definitions
- Explain PURPOSE and FUNCTION, not problems or solutions
- Include technical specifications when relevant
- Use proper maritime engineering terminology
- Explain HOW it works and WHY it's important
- NO troubleshooting advice unless specifically asked
- Be comprehensive but educational in tone (150-200 words)

User question: ${question}`;
  }

  private buildTroubleshootingPrompt(question: string): string {
    return `You are a Marine Chief Engineer with 20+ years experience providing troubleshooting guidance.

CRITICAL RESPONSE REQUIREMENTS:
- Provide comprehensive troubleshooting and problem-solving advice
- Include detailed diagnostic steps with proper reasoning
- Be practical and technically accurate
- NO links, URLs, or 'visit our website' messages
- Include specific technical details (pressures, temperatures, procedures)
- Use proper maritime engineering terminology
- Structure answers with clear diagnostic steps
- Consider safety implications and best practices
- Provide context and explain WHY, not just WHAT

User question: ${question}`;
  }

  /**
   * MESSAGE HANDLERS for different types
   */
  private async handleGreeting(whatsappNumber: string, user: any): Promise<void> {
    const name = user?.fullName || 'Seafarer';
    const message = `Hello ${name}! 👋

I'm QBOT, your maritime technical assistant. How can I help you today?

• Ask any marine engineering question ending with "?"
• Type "help" for available commands
• Say "koi hai" to find nearby maritime professionals`;

    await this.watiService.sendSessionMessage(whatsappNumber, message);
  }

  private async handleCommand(whatsappNumber: string, command: string, user: any): Promise<void> {
    const cmd = command.toLowerCase().trim();
    
    if (cmd.includes('help')) {
      const helpMessage = `🚢 QBOT Commands:

📋 **Available Commands:**
• Ask questions ending with "?" for technical help
• "koi hai" - Find nearby maritime professionals
• "profile" - View your profile status
• "status" - Check your daily question limits

💡 **Tips:**
• End technical questions with "?" for detailed answers
• Update your profile for more daily questions
• Connect with maritime professionals worldwide`;

      await this.watiService.sendSessionMessage(whatsappNumber, helpMessage);
    }
  }

  private async handleLocationQuery(whatsappNumber: string, user: any): Promise<void> {
    // Implementation for "koi hai" functionality
    const message = `🌊 Nearby Maritime Professionals:

I'm working on connecting you with nearby seafarers. This feature will show:
• Officers in nearby ports
• Crew members in your area
• Maritime professionals nearby

Stay tuned for updates! 🚢`;

    await this.watiService.sendSessionMessage(whatsappNumber, message);
  }

  private async handleCommercialQuery(whatsappNumber: string): Promise<void> {
    const message = `🏪 QAAQ Maritime Services:

For commercial inquiries and services, please:
• Visit our website: qaaq.app
• Contact our business team directly
• Check available maritime solutions

I'm specialized in technical assistance. For purchases and commercial services, please use our main platform.`;

    await this.watiService.sendSessionMessage(whatsappNumber, message);
  }

  private async handleEmergency(whatsappNumber: string, messageText: string): Promise<void> {
    const emergencyMessage = `🚨 EMERGENCY SUPPORT

I understand this may be urgent. For immediate emergency assistance:

🆘 **Maritime Emergency:**
• Contact Coast Guard immediately
• Use VHF Channel 16 for distress calls
• Alert nearby vessels

📞 **Technical Support:**
• Contact QAAQ emergency line: [Emergency Number]
• I'll also try to provide immediate guidance

What specific emergency are you facing?`;

    await this.watiService.sendSessionMessage(whatsappNumber, emergencyMessage);
    
    // Log emergency for immediate admin attention
    console.error(`🚨 EMERGENCY MESSAGE from ${whatsappNumber}: ${messageText}`);
  }

  private async handleCasualChat(whatsappNumber: string, messageText: string, user: any): Promise<void> {
    if (this.isMaritimeRelated(messageText)) {
      const message = `That's interesting! 🌊

I'm here primarily for technical maritime questions. If you have any marine engineering questions, feel free to ask them ending with "?"

For general maritime discussions, you might enjoy connecting with other professionals on our platform at qaaq.app`;

      await this.watiService.sendSessionMessage(whatsappNumber, message);
    } else {
      await this.handleUnclearMessage(whatsappNumber);
    }
  }

  private async handleUnclearMessage(whatsappNumber: string): Promise<void> {
    const message = `I didn't quite understand that. 🤔

Could you clarify your maritime question or end it with '?' for technical help?

You can also:
• Type "help" for available commands
• Ask specific marine engineering questions
• Say "koi hai" to find nearby professionals`;

    await this.watiService.sendSessionMessage(whatsappNumber, message);
  }

  /**
   * ERROR HANDLING
   */
  private async handleMessageRecovery(whatsappNumber: string): Promise<void> {
    await this.watiService.sendSessionMessage(
      whatsappNumber,
      "I didn't receive your message clearly. Please try sending it again."
    );
  }

  private async handleCriticalError(whatsappNumber: string, error: any): Promise<void> {
    console.error('Critical bot error:', error);
    
    const errorMessage = `⚠️ We're experiencing technical difficulties. 
Our team has been notified. Please try again in a few minutes.

For urgent maritime assistance, contact our support team.`;

    try {
      await this.watiService.sendSessionMessage(whatsappNumber, errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }

  /**
   * UTILITY FUNCTIONS
   */
  private async logMessage(
    whatsappNumber: string,
    messageType: 'inbound' | 'outbound',
    messageText: string,
    classification?: string,
    aiResponse?: string
  ): Promise<void> {
    try {
      await db.insert(watiMessageHistory).values({
        whatsappNumber,
        messageType,
        messageText,
        messageClassification: classification,
        aiResponse
      });
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  private async incrementDailyQuestionCount(whatsappNumber: string): Promise<void> {
    await db.update(watiConversationState)
      .set({
        dailyQuestionCount: sql`${watiConversationState.dailyQuestionCount} + 1`,
        lastQuestionDate: new Date(),
        lastActivity: new Date()
      })
      .where(eq(watiConversationState.whatsappNumber, whatsappNumber));
  }

  private async resetDailyQuestionCount(whatsappNumber: string): Promise<void> {
    await db.update(watiConversationState)
      .set({
        dailyQuestionCount: 0,
        lastQuestionDate: new Date()
      })
      .where(eq(watiConversationState.whatsappNumber, whatsappNumber));
  }

  private calculateProfileCompleteness(user: any): number {
    if (!user) return 0;
    
    const fields = [
      user.fullName,
      user.rank,
      user.shipName,
      user.city,
      user.country,
      user.whatsAppNumber
    ];
    
    const filledFields = fields.filter(field => field && field.trim().length > 0).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  private async handleDirectTechnicalQuestion(whatsappNumber: string, question: string, user: any): Promise<void> {
    await this.processDirectTechnicalQuestion(whatsappNumber, question, user);
  }
}