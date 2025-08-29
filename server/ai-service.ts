export interface AIResponse {
  content: string;
  model: 'openai' | 'gemini' | 'deepseek' | 'mistral';
  tokens?: number;
  responseTime?: number;
}

export class AIService {
  private openai: any;
  private deepseek: any;
  private mistral: any;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.initOpenAI();
    }
    // Initialize Deepseek
    if (process.env.DEEPSEEK_API_KEY) {
      this.initDeepseek();
    }
    // Initialize Mistral
    if (process.env.MISTRAL_API_KEY) {
      this.initMistral();
    }
  }

  private async initOpenAI() {
    const { OpenAI } = await import('openai');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async initDeepseek() {
    const { OpenAI } = await import('openai');
    this.deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  private async initMistral() {
    const { OpenAI } = await import('openai');
    this.mistral = new OpenAI({
      baseURL: "https://api.mistral.ai/v1",
      apiKey: process.env.MISTRAL_API_KEY,
    });
  }

  async generateOpenAIResponse(message: string, category: string, user: any, activeRules?: string, language = 'en'): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.openai) {
        await this.initOpenAI();
      }

      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      
      let systemPrompt = `You are QBOT, an advanced maritime AI assistant and the primary chat interface for QaaqConnect. 
      You specialize in ${category} and serve the global maritime community with expert knowledge on:
      - Maritime engineering, maintenance, and troubleshooting
      - Navigation, regulations, and safety procedures  
      - Ship operations, cargo handling, and port procedures
      - Career guidance for maritime professionals
      - Technical specifications for maritime equipment
      
      User context: ${userRank} ${userShip}
      
      LANGUAGE: ${language === 'tr' ? 'Respond in Turkish language only' : 'Respond in English language only'}
      
      RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 50-70 words
      - Each bullet point should be 10-16 words maximum
      - Use technical language with practical details
      - Include safety considerations and maritime regulations when relevant
      - Provide complete, actionable information within the word limit
      - Example format:
        • [Specific action/solution with technical detail]
        • [Safety consideration or regulation reference]  
        • [Additional guidance or best practice]
        • [Follow-up recommendation if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 OpenAI: Making API request...');
      
      // Use GPT-4o for all users with consistent token limits
      const model = "gpt-4o";
      const maxTokens = 200;  // Consistent token limit for 50-70 word responses
      
      console.log(`🚀 Using ${model} model with ${maxTokens} max tokens`);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ OpenAI: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 OpenAI: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Return content as-is since prompt already limits to 50-70 words
      const finalContent = content;

      return {
        content: finalContent,
        model: 'openai',
        tokens: response.usage?.total_tokens,
        responseTime
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateGeminiResponse(message: string, category: string, user: any, activeRules?: string, language = 'en'): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      
      let systemPrompt = `You are QBOT, an advanced maritime AI assistant and the primary chat interface for QaaqConnect. 
      You specialize in ${category} and serve the global maritime community with expert knowledge on:
      - Maritime engineering, maintenance, and troubleshooting
      - Navigation, regulations, and safety procedures  
      - Ship operations, cargo handling, and port procedures
      - Career guidance for maritime professionals
      - Technical specifications for maritime equipment
      
      User context: ${userRank} ${userShip}
      
      LANGUAGE: ${language === 'tr' ? 'Respond in Turkish language only' : 'Respond in English language only'}
      
      RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 50-70 words
      - Each bullet point should be 10-16 words maximum
      - Use technical language with practical details
      - Include safety considerations and maritime regulations when relevant
      - Provide complete, actionable information within the word limit
      - Example format:
        • [Specific action/solution with technical detail]
        • [Safety consideration or regulation reference]  
        • [Additional guidance or best practice]
        • [Follow-up recommendation if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      // Direct API call to Gemini with consistent token limits
      const maxOutputTokens = 200;
      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser message: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens,
          stopSequences: []
        },
        safetySettings: [{
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }]
      };

      console.log('🤖 Gemini: Making API request...');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🤖 Gemini: Response received successfully');
      
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content || content.trim() === '') {
        console.warn('⚠️ Gemini: No valid content in response, checking error details');
        console.log('Full response data:', JSON.stringify(data, null, 2));
        
        // Check for safety blocks or other issues
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          console.log('Response blocked by safety filters, using fallback');
        }
        
        // Use fallback response
        const fallbackResponses = [
          `• Check manufacturer's manual first\n• Follow proper safety protocols\n• Consult senior engineer if unsure`,
          `• Inspect for mechanical wear signs\n• Verify lubrication levels adequate\n• Test electrical connections thoroughly`,
          `• Monitor operating parameters closely\n• Check environmental factors impact\n• Document all readings properly`
        ];
        content = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        console.log('🔄 Using fallback response:', content);
      } else {
        console.log('✅ Gemini: Valid content received, length:', content.length);
      }
      const responseTime = Date.now() - startTime;

      // Return content as-is since prompt already limits to 50-70 words
      const finalContent = content;

      return {
        content: finalContent,
        model: 'gemini',
        responseTime
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDeepseekResponse(message: string, category: string, user: any, activeRules?: string, language = 'en'): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.deepseek) {
        await this.initDeepseek();
      }

      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      
      let systemPrompt = `You are QBOT, an advanced maritime AI assistant and the primary chat interface for QaaqConnect. 
      You specialize in ${category} and serve the global maritime community with expert knowledge on:
      - Maritime engineering, maintenance, and troubleshooting
      - Navigation, regulations, and safety procedures  
      - Ship operations, cargo handling, and port procedures
      - Career guidance for maritime professionals
      - Technical specifications for maritime equipment
      
      User context: ${userRank} ${userShip}
      
      LANGUAGE: ${language === 'tr' ? 'Respond in Turkish language only' : 'Respond in English language only'}
      
      RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 50-70 words
      - Each bullet point should be 10-16 words maximum
      - Use technical language with practical details
      - Include safety considerations and maritime regulations when relevant
      - Provide complete, actionable information within the word limit
      - Example format:
        • [Specific action/solution with technical detail]
        • [Safety consideration or regulation reference]  
        • [Additional guidance or best practice]
        • [Follow-up recommendation if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 Deepseek: Making API request...');
      
      const maxTokens = 200;
      const response = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ Deepseek: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 Deepseek: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Return content as-is since prompt already limits to 50-70 words
      const finalContent = content;

      return {
        content: finalContent,
        model: 'deepseek',
        tokens: response.usage?.total_tokens,
        responseTime
      };

    } catch (error) {
      console.error('Deepseek API error:', error);
      throw new Error(`Deepseek generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateMistralResponse(message: string, category: string, user: any, activeRules?: string, language = 'en'): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.mistral) {
        await this.initMistral();
      }

      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      
      let systemPrompt = `You are QBOT, an advanced maritime AI assistant and the primary chat interface for QaaqConnect. 
      You specialize in ${category} and serve the global maritime community with expert knowledge on:
      - Maritime engineering, maintenance, and troubleshooting
      - Navigation, regulations, and safety procedures  
      - Ship operations, cargo handling, and port procedures
      - Career guidance for maritime professionals
      - Technical specifications for maritime equipment
      
      User context: ${userRank} ${userShip}
      
      LANGUAGE: ${language === 'tr' ? 'Respond in Turkish language only' : 'Respond in English language only'}
      
      RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 50-70 words
      - Each bullet point should be 10-16 words maximum
      - Use technical language with practical details
      - Include safety considerations and maritime regulations when relevant
      - Provide complete, actionable information within the word limit
      - Example format:
        • [Specific action/solution with technical detail]
        • [Safety consideration or regulation reference]  
        • [Additional guidance or best practice]
        • [Follow-up recommendation if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 Mistral: Making API request...');
      
      const maxTokens = 200;
      const response = await this.mistral.chat.completions.create({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ Mistral: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 Mistral: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Return content as-is since prompt already limits to 50-70 words
      const finalContent = content;

      return {
        content: finalContent,
        model: 'mistral',
        tokens: response.usage?.total_tokens,
        responseTime
      };

    } catch (error) {
      console.error('Mistral API error:', error);
      throw new Error(`Mistral generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async generateDualResponse(message: string, category: string, user: any, activeRules?: string, preferredModel?: 'openai' | 'gemini' | 'deepseek' | 'mistral', language = 'en'): Promise<AIResponse> {
    // 4-model system: OpenAI, Gemini, Deepseek, Mistral
    const useModel = preferredModel || 'openai'; // Default to OpenAI
    
    console.log(`🤖 Using ${useModel.toUpperCase()} model`);
    
    try {
      if (useModel === 'mistral' && process.env.MISTRAL_API_KEY) {
        return await this.generateMistralResponse(message, category, user, activeRules, language);
      } else if (useModel === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
        return await this.generateDeepseekResponse(message, category, user, activeRules, language);
      } else if (useModel === 'gemini' && process.env.GEMINI_API_KEY) {
        return await this.generateGeminiResponse(message, category, user, activeRules, language);
      } else if (useModel === 'openai' && process.env.OPENAI_API_KEY) {
        return await this.generateOpenAIResponse(message, category, user, activeRules, language);
      }
      
      // Fallback to available model in priority order
      if (process.env.OPENAI_API_KEY) {
        console.log('Falling back to OpenAI (primary model not available)');
        return await this.generateOpenAIResponse(message, category, user, activeRules, language);
      } else if (process.env.MISTRAL_API_KEY) {
        console.log('Falling back to Mistral (primary model not available)');
        return await this.generateMistralResponse(message, category, user, activeRules, language);
      } else if (process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini (primary model not available)');
        return await this.generateGeminiResponse(message, category, user, activeRules, language);
      } else if (process.env.DEEPSEEK_API_KEY) {
        console.log('Falling back to Deepseek (primary model not available)');
        return await this.generateDeepseekResponse(message, category, user, activeRules, language);
      }
      
      throw new Error('No AI models available');
      
    } catch (error) {
      console.error(`AI generation error with ${useModel}:`, error);
      
      // Try fallback models in order of preference
      const fallbackModels = useModel === 'mistral' ? ['openai', 'gemini', 'deepseek'] :
                           useModel === 'deepseek' ? ['openai', 'mistral', 'gemini'] :
                           useModel === 'gemini' ? ['openai', 'mistral', 'deepseek'] : 
                           ['mistral', 'gemini', 'deepseek'];
      
      for (const fallbackModel of fallbackModels) {
        try {
          if (fallbackModel === 'mistral' && process.env.MISTRAL_API_KEY) {
            console.log(`Trying fallback to Mistral after ${useModel} failed`);
            return await this.generateMistralResponse(message, category, user, activeRules, language);
          } else if (fallbackModel === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
            console.log(`Trying fallback to Deepseek after ${useModel} failed`);
            return await this.generateDeepseekResponse(message, category, user, activeRules, language);
          } else if (fallbackModel === 'gemini' && process.env.GEMINI_API_KEY) {
            console.log(`Trying fallback to Gemini after ${useModel} failed`);
            return await this.generateGeminiResponse(message, category, user, activeRules, language);
          } else if (fallbackModel === 'openai' && process.env.OPENAI_API_KEY) {
            console.log(`Trying fallback to OpenAI after ${useModel} failed`);
            return await this.generateOpenAIResponse(message, category, user, activeRules, language);
          }
        } catch (fallbackError) {
          console.error(`Fallback ${fallbackModel} generation also failed:`, fallbackError);
          // Continue to next fallback model
        }
      }
      
      // Final fallback to predefined responses
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): AIResponse {
    const fallbackResponses = [
      `• Check manufacturer's manual first\n• Follow proper safety protocols\n• Consult senior engineer if unsure`,
      `• Inspect for mechanical wear signs\n• Verify lubrication levels adequate\n• Test electrical connections thoroughly`,
      `• Monitor operating parameters closely\n• Check environmental factors impact\n• Document all readings properly`,
      `• Review temperature and pressure readings\n• Analyze vibration patterns carefully\n• Schedule preventive maintenance checks`,
      `• Prioritize safety protocols always\n• Consult vessel maintenance schedule\n• Report findings to senior officer`
    ];
    
    return {
      content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      model: 'openai', // Default fallback attribution
      responseTime: 0
    };
  }

  // Get token limits from system configuration
  private async getTokenLimits(): Promise<{ min: number; max: number }> {
    try {
      const pool = (global as any).pool;
      if (!pool) {
        console.log('⚠️ Database pool not available, using default token limits');
        return { min: 97, max: 97 };
      }

      const result = await pool.query(`
        SELECT config_key, config_value 
        FROM system_configs 
        WHERE config_key IN ('free_user_min_tokens', 'free_user_max_tokens')
      `);

      let minTokens = 97;
      let maxTokens = 97;

      result.rows.forEach((row: any) => {
        if (row.config_key === 'free_user_min_tokens') {
          minTokens = parseInt(row.config_value) || 97;
        } else if (row.config_key === 'free_user_max_tokens') {
          maxTokens = parseInt(row.config_value) || 97;
        }
      });

      console.log(`⚙️ Token limits from config: ${minTokens}-${maxTokens} words`);
      return { min: minTokens, max: maxTokens };
    } catch (error) {
      console.error('Error fetching token limits from config:', error);
      return { min: 97, max: 97 }; // Fallback to defaults
    }
  }

  // Check if user has premium status using centralized logic
  private async checkPremiumStatus(user: any): Promise<boolean> {
    try {
      const userId = user?.id || user?.userId;
      if (!userId) {
        console.log('⚠️ No user ID available for premium check, treating as free user');
        return false;
      }
      
      // First check if user is admin (admins get unlimited access)
      if (user?.isAdmin || user?.is_admin) {
        console.log(`✅ Admin user verified (ID: ${userId}) - premium access granted`);
        return true;
      }
      
      // Check if user object already has premium status set (from frontend)
      if (user?.isPremium === true) {
        console.log(`✅ User object has premium status (ID: ${userId}) - premium access granted`);
        return true;
      }
      
      // Handle premium-fallback case specifically
      if (userId === 'premium-fallback') {
        console.log(`✅ Premium fallback user detected - premium access granted`);
        return true;
      }
      
      // Check specific premium user IDs (workship.ai@gmail.com users)
      const premiumUserIds = ['45016180', '44885683'];
      if (premiumUserIds.includes(userId.toString())) {
        console.log(`✅ Premium user ID verified (${userId}) - premium access granted`);
        return true;
      }
      
      // Import and use the Razorpay service directly
      const { RazorpayService } = await import('./razorpay-service-production.js');
      const razorpayService = RazorpayService.getInstance();
      const premiumStatus = await razorpayService.checkUserPremiumStatus(userId.toString());
      
      if (premiumStatus.isPremium) {
        console.log(`✅ Razorpay premium user verified - premium access granted`);
        return true;
      }
      
      console.log(`🔍 Premium check result for user ${userId}: isPremium = ${premiumStatus.isPremium}, isAdmin = ${user?.isAdmin}`);
      return false;
    } catch (error) {
      console.error('❌ Error checking premium status:', error);
      return false;
    }
  }

  // Legacy function - no longer needed since all users get consistent 50-70 word responses
  private async applyFreeUserLimits(content: string, user: any): Promise<string> {
    // Simply return content as-is since prompts now handle word limits consistently
    return content;
  }

  // Get available models
  getAvailableModels(): string[] {
    const models = [];
    if (process.env.OPENAI_API_KEY) models.push('openai');
    if (process.env.GEMINI_API_KEY) models.push('gemini');
    if (process.env.DEEPSEEK_API_KEY) models.push('deepseek');
    if (process.env.MISTRAL_API_KEY) models.push('mistral');
    if (process.env.XAI_API_KEY) models.push('grok');
    return models;
  }
}

// Singleton instance
export const aiService = new AIService();