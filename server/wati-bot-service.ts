import { pool } from './db';
import { FeedbackService } from './feedback-service';
import { AIService } from './ai-service';

interface WATIMessage {
  phone: string;
  name?: string;
  type: 'text' | 'image' | 'document';
  text?: string;
  mediaUrl?: string;
}

interface WATIResponse {
  phone: string;
  message: string;
  template?: boolean;
}

/**
 * WATI Bot Service for handling WhatsApp Business API integration
 * Provides feedback functionality for technical answers
 */
export class WatiBotService {
  private aiService: AIService;
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.aiService = new AIService();
    this.baseURL = process.env.WATI_API_URL || 'https://live-mt-server.wati.io/';
    this.apiKey = process.env.WATI_API_KEY || '';
  }

  /**
   * Process incoming WhatsApp message from WATI webhook
   */
  async processIncomingMessage(messageData: WATIMessage): Promise<void> {
    try {
      const userPhone = messageData.phone;
      console.log(`📱 WATI: Processing message from ${userPhone}`);

      // Check if this is feedback for a previous answer
      if (await this.isFeedbackMessage(messageData.text || '', userPhone)) {
        await this.processFeedbackMessage(messageData);
        return;
      }

      // Check if this is a technical question
      if (this.isTechnicalQuestion(messageData.text || '')) {
        await this.handleTechnicalQuestion(messageData);
      } else {
        await this.handleGeneralMessage(messageData);
      }

    } catch (error) {
      console.error('❌ WATI: Error processing message:', error);
      await this.sendErrorResponse(messageData.phone);
    }
  }

  /**
   * Handle technical maritime questions with AI response + feedback prompt
   */
  private async handleTechnicalQuestion(messageData: WATIMessage): Promise<void> {
    try {
      const userPhone = messageData.phone;
      const question = messageData.text || '';

      console.log(`🤖 WATI: Processing technical question from ${userPhone}`);

      // Get user info from database
      const user = await this.getUserInfo(userPhone);

      // Generate AI response
      const aiResponse = await this.aiService.generateDualResponse(
        question, 
        'Maritime Technical Support', 
        user
      );

      // Store Q&A in database for tracking
      const questionId = await this.storeQuestionAnswer(userPhone, question, aiResponse.content, user);

      // Generate feedback message
      const feedbackMessage = FeedbackService.generateCompactFeedbackMessage();
      
      // Combine technical answer with feedback prompt
      const fullResponse = `${aiResponse.content}\n\n---\n${feedbackMessage}`;

      // Send response via WATI
      await this.sendMessage({
        phone: userPhone,
        message: fullResponse
      });

      // Store that we're expecting feedback for this question
      await this.markAwaitingFeedback(userPhone, questionId);

      console.log(`✅ WATI: Sent technical answer with feedback prompt to ${userPhone}`);

    } catch (error) {
      console.error('❌ WATI: Error handling technical question:', error);
      await this.sendErrorResponse(messageData.phone);
    }
  }

  /**
   * Process user feedback responses
   */
  private async processFeedbackMessage(messageData: WATIMessage): Promise<void> {
    try {
      const userPhone = messageData.phone;
      const feedbackText = messageData.text || '';

      console.log(`📝 WATI: Processing feedback from ${userPhone}`);

      // Parse feedback rating
      const feedbackResult = FeedbackService.parseFeedbackRating(feedbackText);

      if (feedbackResult.rating !== null) {
        // Get the question ID this feedback relates to
        const questionId = await this.getLastQuestionId(userPhone);

        // Store feedback in database
        await FeedbackService.storeFeedback(
          userPhone,
          questionId,
          feedbackResult.rating.toString(),
          feedbackText
        );

        // Send thank you message
        const thankYouMessages = [
          "Thank you for the feedback! 🙏 Your input helps QBOT improve maritime assistance.",
          "Feedback received! 👍 This helps me provide better technical solutions.",
          "Thanks for rating! ⭐ Your feedback makes our maritime support smarter.",
          "Appreciated! 🌊 Your input improves our engineering guidance.",
          "Feedback noted! 🔧 This helps enhance technical accuracy for all sailors."
        ];

        const thankYou = thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)];

        await this.sendMessage({
          phone: userPhone,
          message: thankYou
        });

        // Clear feedback waiting status
        await this.clearAwaitingFeedback(userPhone);

        console.log(`✅ WATI: Processed feedback (${feedbackResult.rating}/5) from ${userPhone}`);

      } else {
        // Feedback format not recognized, ask for clarification
        await this.sendMessage({
          phone: userPhone,
          message: "Could you rate the previous answer? Use ⭐⭐⭐⭐⭐ (1-5 stars) or 'Excellent/Good/Poor'"
        });
      }

    } catch (error) {
      console.error('❌ WATI: Error processing feedback:', error);
    }
  }

  /**
   * Check if message is a technical question
   */
  private isTechnicalQuestion(message: string): boolean {
    const technicalKeywords = [
      'engine', 'pump', 'valve', 'boiler', 'generator', 'compressor',
      'hydraulic', 'mechanical', 'electrical', 'temperature', 'pressure',
      'maintenance', 'repair', 'troubleshoot', 'malfunction', 'error',
      'how to', 'what is', 'why does', 'explain', 'problem', 'issue'
    ];

    const lowerMessage = message.toLowerCase();
    return technicalKeywords.some(keyword => lowerMessage.includes(keyword)) || 
           message.includes('?');
  }

  /**
   * Check if message is feedback for previous answer
   */
  private async isFeedbackMessage(message: string, userPhone: string): Promise<boolean> {
    try {
      // Check if user is awaiting feedback
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM user_feedback_status 
        WHERE phone = $1 AND awaiting_feedback = true
      `, [userPhone]);

      if (result.rows[0].count > 0) {
        // Check if message looks like feedback
        const feedbackResult = FeedbackService.parseFeedbackRating(message);
        return feedbackResult.rating !== null || 
               /^(good|bad|excellent|poor|ok|thanks|thank you)$/i.test(message.trim());
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking feedback status:', error);
      return false;
    }
  }

  /**
   * Send message via WATI API
   */
  private async sendMessage(response: WATIResponse): Promise<void> {
    try {
      if (!this.apiKey) {
        console.log('📱 WATI: API key not configured, simulating message send');
        console.log(`📱 WATI: Would send to ${response.phone}: ${response.message.substring(0, 100)}...`);
        return;
      }

      const apiUrl = `${this.baseURL}/api/v1/sendSessionMessage/${response.phone}`;
      
      const requestBody = {
        messageText: response.message,
      };

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (apiResponse.ok) {
        console.log(`✅ WATI: Message sent successfully to ${response.phone}`);
      } else {
        console.error(`❌ WATI: Failed to send message to ${response.phone}:`, apiResponse.statusText);
      }

    } catch (error) {
      console.error('❌ WATI: Error sending message:', error);
    }
  }

  /**
   * Database helper functions
   */
  private async getUserInfo(phone: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT * FROM users WHERE whatsapp_number = $1 OR id = $1
      `, [phone]);
      
      let user = result.rows[0] || null;
      
      // If user exists but has poor name quality, try to enhance with WATI Contact API
      if (user && this.shouldEnhanceUserName(user)) {
        const watiContact = await this.fetchWATIContactInfo(phone);
        if (watiContact && watiContact.name && watiContact.name !== phone) {
          // Update user name from WATI contact data
          await this.updateUserNameFromWATI(user.id, watiContact.name, phone);
          user.full_name = watiContact.name;
          user.whatsapp_display_name = watiContact.name;
        }
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      return null;
    }
  }

  /**
   * Check if user name needs enhancement from WATI data
   */
  private shouldEnhanceUserName(user: any): boolean {
    const fullName = user.full_name || '';
    const displayName = user.whatsapp_display_name || '';
    
    return (
      fullName.includes('@') || // Email as name
      fullName.includes('whatsapp.temp') || // Temporary name
      /^\+?[0-9]+$/.test(fullName) || // Phone number as name
      fullName === displayName && displayName.includes('@') || // Both are email
      fullName.length < 3 // Very short names
    );
  }

  /**
   * Fetch contact information from WATI API
   */
  private async fetchWATIContactInfo(phone: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const cleanPhone = phone.replace(/\+/g, '');
      const response = await fetch(`${this.baseURL}api/v1/contacts/${cleanPhone}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contactData = await response.json();
        return {
          name: contactData.name || contactData.displayName,
          businessName: contactData.businessName,
          profilePicture: contactData.profilePictureUrl
        };
      }
    } catch (error) {
      console.error('❌ Error fetching WATI contact info:', error);
    }
    
    return null;
  }

  /**
   * Update user name from WATI contact data
   */
  private async updateUserNameFromWATI(userId: string, contactName: string, phone: string): Promise<void> {
    try {
      // Clean and standardize the contact name
      const cleanName = this.standardizeName(contactName);
      
      await pool.query(`
        UPDATE users 
        SET 
          full_name = $1,
          whatsapp_display_name = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [cleanName, contactName, userId]);
      
      console.log(`✅ Enhanced user name from WATI: ${phone} → ${cleanName}`);
    } catch (error) {
      console.error('❌ Error updating user name from WATI:', error);
    }
  }

  /**
   * Standardize and clean contact names
   */
  private standardizeName(name: string): string {
    if (!name || name.length < 2) return name;
    
    // Remove emojis and special characters commonly used in WhatsApp names
    let cleanName = name.replace(/[⚓🚢⛵🌊👨‍💼🔧⚙️🛠️]/g, '').trim();
    
    // Remove common maritime prefixes/suffixes that aren't part of actual names
    cleanName = cleanName.replace(/\b(Captain|Chief|Officer|Engineer|Capt|Ch|Eng)\s*$/gi, '').trim();
    
    // Proper case conversion
    cleanName = cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // If result is too short or still looks like a phone/email, return original
    if (cleanName.length < 3 || /^\+?[0-9]+$/.test(cleanName) || cleanName.includes('@')) {
      return name;
    }
    
    return cleanName;
  }

  private async storeQuestionAnswer(userPhone: string, question: string, answer: string, user: any): Promise<string> {
    try {
      // Generate a simple numeric ID that fits in integer range (max 2.1 billion)
      const questionId = Math.floor(Math.random() * 1000000) + Math.floor(Date.now() / 1000);
      
      // Store in whatsapp_messages table instead of questions table
      await pool.query(`
        INSERT INTO whatsapp_messages (
          id, user_id, phone_number, message_body, message_type, 
          direction, contact_name, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'text', 'incoming', $5, NOW(), NOW())
      `, [
        `wati_${questionId}`,
        userPhone,
        userPhone,
        `Q: ${question}\nA: ${answer}`,
        user?.name || 'WATI User'
      ]);

      console.log(`✅ WATI: Question-Answer stored for ${userPhone}`);
      return questionId.toString();
    } catch (error) {
      console.error('❌ Error storing Q&A:', error);
      return 'unknown';
    }
  }

  private async markAwaitingFeedback(userPhone: string, questionId: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO user_feedback_status (phone, question_id, awaiting_feedback, created_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (phone) DO UPDATE SET 
          question_id = EXCLUDED.question_id,
          awaiting_feedback = true,
          created_at = NOW()
      `, [userPhone, questionId]);
    } catch (error) {
      console.error('❌ Error marking awaiting feedback:', error);
    }
  }

  private async clearAwaitingFeedback(userPhone: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE user_feedback_status 
        SET awaiting_feedback = false 
        WHERE phone = $1
      `, [userPhone]);
    } catch (error) {
      console.error('❌ Error clearing feedback status:', error);
    }
  }

  private async getLastQuestionId(userPhone: string): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT question_id FROM user_feedback_status WHERE phone = $1
      `, [userPhone]);
      
      return result.rows[0]?.question_id || 'unknown';
    } catch (error) {
      console.error('❌ Error getting last question ID:', error);
      return 'unknown';
    }
  }

  private async handleGeneralMessage(messageData: WATIMessage): Promise<void> {
    const greetingResponse = `Hello! 🌊 I'm QBOT, your maritime technical assistant. 
    
Ask me any technical questions about:
• Ship engines & machinery ⚙️
• Pumps & hydraulic systems 🔧  
• Navigation equipment 📡
• Safety procedures ⚠️
• Maintenance issues 🛠️

Just type your question and I'll help you!`;

    await this.sendMessage({
      phone: messageData.phone,
      message: greetingResponse
    });
  }

  private async sendErrorResponse(userPhone: string): Promise<void> {
    await this.sendMessage({
      phone: userPhone,
      message: "Sorry, I'm experiencing technical difficulties. Please try again in a moment. 🔧"
    });
  }

  /**
   * Initialize required database tables
   */
  async initializeTables(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_feedback_status (
          phone VARCHAR PRIMARY KEY,
          question_id VARCHAR,
          awaiting_feedback BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_feedback_status_phone ON user_feedback_status(phone);
      `);
      
      console.log('✅ WATI: Database tables initialized');
    } catch (error) {
      console.error('❌ WATI: Error initializing tables:', error);
    }
  }
}

export default WatiBotService;