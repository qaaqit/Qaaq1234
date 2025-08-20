export interface AIResponse {
  content: string;
  model: 'openai' | 'gemini';
  tokens?: number;
  responseTime?: number;
}

export class AIService {
  private openai: any;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.initOpenAI();
    }
  }

  private async initOpenAI() {
    const { OpenAI } = await import('openai');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateOpenAIResponse(message: string, category: string, user: any, activeRules?: string): Promise<AIResponse> {
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
      
      CRITICAL RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 30-50 words maximum
      - Each bullet point should be 6-12 words maximum
      - Use concise, technical language
      - Prioritize safety and maritime regulations (SOLAS, MARPOL, STCW)
      - Example format:
        • [Action/Solution in 6-12 words]
        • [Technical detail in 6-12 words]  
        • [Safety consideration in 6-12 words]
        • [Regulation reference if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 OpenAI: Making API request...');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ OpenAI: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 OpenAI: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Apply free user limits if user is not premium
      const finalContent = await this.applyFreeUserLimits(content, user);

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

  async generateGeminiResponse(message: string, category: string, user: any, activeRules?: string): Promise<AIResponse> {
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
      
      CRITICAL RESPONSE FORMAT:
      - ALWAYS respond in bullet point format with exactly 3-5 bullet points
      - Keep total response between 30-50 words maximum
      - Each bullet point should be 6-12 words maximum
      - Use concise, technical language
      - Prioritize safety and maritime regulations (SOLAS, MARPOL, STCW)
      - Example format:
        • [Action/Solution in 6-12 words]
        • [Technical detail in 6-12 words]  
        • [Safety consideration in 6-12 words]
        • [Regulation reference if applicable]`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      // Direct API call to Gemini
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
          maxOutputTokens: 150,
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

      // Apply free user limits if user is not premium
      const finalContent = await this.applyFreeUserLimits(content, user);

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

  async generateDualResponse(message: string, category: string, user: any, activeRules?: string, preferredModel?: 'openai' | 'gemini'): Promise<AIResponse> {
    // Date-based model selection: Gemini on odd dates, OpenAI on even dates
    const currentDate = new Date().getDate();
    const isOddDate = currentDate % 2 === 1;
    const dateBasedModel = isOddDate ? 'gemini' : 'openai';
    const useModel = preferredModel || dateBasedModel;
    
    console.log(`📅 Date: ${currentDate}th (${isOddDate ? 'odd' : 'even'}) - Using ${useModel} model`);
    
    try {
      if (useModel === 'gemini' && process.env.GEMINI_API_KEY) {
        return await this.generateGeminiResponse(message, category, user, activeRules);
      } else if (useModel === 'openai' && process.env.OPENAI_API_KEY) {
        return await this.generateOpenAIResponse(message, category, user, activeRules);
      }
      
      // Fallback to available model
      if (process.env.OPENAI_API_KEY) {
        console.log('Falling back to OpenAI (primary model not available)');
        return await this.generateOpenAIResponse(message, category, user, activeRules);
      } else if (process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini (primary model not available)');
        return await this.generateGeminiResponse(message, category, user, activeRules);
      }
      
      throw new Error('No AI models available');
      
    } catch (error) {
      console.error(`AI generation error with ${useModel}:`, error);
      
      // Try fallback model
      const fallbackModel = useModel === 'openai' ? 'gemini' : 'openai';
      
      try {
        if (fallbackModel === 'gemini' && process.env.GEMINI_API_KEY) {
          console.log(`Trying fallback to Gemini after ${useModel} failed`);
          return await this.generateGeminiResponse(message, category, user, activeRules);
        } else if (fallbackModel === 'openai' && process.env.OPENAI_API_KEY) {
          console.log(`Trying fallback to OpenAI after ${useModel} failed`);
          return await this.generateOpenAIResponse(message, category, user, activeRules);
        }
      } catch (fallbackError) {
        console.error(`Fallback AI generation also failed:`, fallbackError);
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
        return { min: 10, max: 20 };
      }

      const result = await pool.query(`
        SELECT config_key, config_value 
        FROM system_configs 
        WHERE config_key IN ('free_user_min_tokens', 'free_user_max_tokens')
      `);

      let minTokens = 10;
      let maxTokens = 20;

      result.rows.forEach((row: any) => {
        if (row.config_key === 'free_user_min_tokens') {
          minTokens = parseInt(row.config_value) || 10;
        } else if (row.config_key === 'free_user_max_tokens') {
          maxTokens = parseInt(row.config_value) || 20;
        }
      });

      console.log(`⚙️ Token limits from config: ${minTokens}-${maxTokens} words`);
      return { min: minTokens, max: maxTokens };
    } catch (error) {
      console.error('Error fetching token limits from config:', error);
      return { min: 10, max: 20 }; // Fallback to defaults
    }
  }

  // Apply free user limits - truncate based on configurable token limits for non-premium users
  private async applyFreeUserLimits(content: string, user: any): Promise<string> {
    // Check if user is premium (assuming userType field exists)
    const userType = user?.userType || 'Free';
    const subscriptionStatus = user?.subscriptionStatus || 'inactive';
    
    // If user is premium or has active subscription, return full content
    if (userType === 'Premium' || subscriptionStatus === 'active') {
      console.log(`✅ Premium user - returning full response (${content.split(' ').length} words)`);
      return content;
    }
    
    // Get configurable token limits
    const tokenLimits = await this.getTokenLimits();
    
    // For free users, limit to configured word count with upgrade prompt
    const words = content.split(' ');
    const wordCount = words.length;
    
    // Use average of min and max for target word count
    const targetWordCount = Math.round((tokenLimits.min + tokenLimits.max) / 2);
    
    console.log(`🆓 Free user - limiting response from ${wordCount} words to ~${targetWordCount} words (${tokenLimits.min}-${tokenLimits.max} range)`);
    
    // Take configured number of words and add upgrade prompt
    const limitedWords = words.slice(0, targetWordCount);
    const limitedContent = limitedWords.join(' ');
    
    // Ensure it ends with ... and add upgrade prompt
    const truncatedContent = limitedContent.endsWith('.') 
      ? limitedContent.slice(0, -1) + '...'
      : limitedContent + '...';
    
    return `${truncatedContent} (For detailed unlimited answers & whatsapp chat support, please upgrade to premium)`;
  }

  // Get available models
  getAvailableModels(): string[] {
    const models = [];
    if (process.env.OPENAI_API_KEY) models.push('openai');
    if (process.env.GEMINI_API_KEY) models.push('gemini');
    return models;
  }
}

// Singleton instance
export const aiService = new AIService();