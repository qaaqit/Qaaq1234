import { nanoid } from 'nanoid';

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
  private userThreads: Map<string, string> = new Map(); // Store thread IDs per user

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

  // Q2Q Output Sanitization Function - Enforces proper "a)" and "b)" format
  private sanitizeQ2QFormat(content: string): string {
    if (!content || typeof content !== 'string') {
      return content;
    }

    console.log('🔧 Sanitizing Q2Q format in response...');

    let sanitized = content;

    // Broadened Q2Q detection to handle variants like "Would you", with/without quotes around 'also'
    const q2qStartPattern = /Would\s+(?:u|you)\s+['""]?also['""]?\s+like\s+to\s+know/i;
    const q2qMatch = sanitized.match(q2qStartPattern);

    if (q2qMatch) {
      const q2qStart = q2qMatch.index!;
      const beforeQ2Q = sanitized.substring(0, q2qStart);
      const q2qSection = sanitized.substring(q2qStart);

      // Apply sanitization to the Q2Q section only
      let sanitizedQ2Q = q2qSection;

      // Remove markdown bold formatting (**text**)
      sanitizedQ2Q = sanitizedQ2Q.replace(/\*\*(.*?)\*\*/g, '$1');

      // Replace q1) or Q1) with a)
      sanitizedQ2Q = sanitizedQ2Q.replace(/\b[qQ]1\)/g, 'a)');
      // Replace q2) or Q2) with b)
      sanitizedQ2Q = sanitizedQ2Q.replace(/\b[qQ]2\)/g, 'b)');

      // Replace 1) or (1) with a) - be more specific to avoid false matches
      sanitizedQ2Q = sanitizedQ2Q.replace(/(?:^|\n|\s)(?:\()?1[\)\.]?\s*/g, (match) => {
        return match.replace(/(?:\()?1[\)\.]?\s*/, 'a) ');
      });

      // Replace 2) or (2) with b) - be more specific to avoid false matches
      sanitizedQ2Q = sanitizedQ2Q.replace(/(?:^|\n|\s)(?:\()?2[\)\.]?\s*/g, (match) => {
        return match.replace(/(?:\()?2[\)\.]?\s*/, 'b) ');
      });

      // Process options line-by-line to handle proper capitalization of first alphabetical character
      const lines = sanitizedQ2Q.split('\n');
      const processedLines = lines.map(line => {
        // Handle a) options - capitalize first alphabetical character
        if (/^\s*a\)\s/.test(line)) {
          return line.replace(/^(\s*a\)\s*)([^\w]*)?([a-z])/i, (match, prefix, punct, firstChar) => {
            return prefix + (punct || '') + firstChar.toUpperCase();
          });
        }
        // Handle b) options - capitalize first alphabetical character  
        if (/^\s*b\)\s/.test(line)) {
          return line.replace(/^(\s*b\)\s*)([^\w]*)?([a-z])/i, (match, prefix, punct, firstChar) => {
            return prefix + (punct || '') + firstChar.toUpperCase();
          });
        }
        return line;
      });
      sanitizedQ2Q = processedLines.join('\n');

      // Strip trailing punctuation before adding question marks to avoid ".?" artifacts
      // Handle a) options with improved punctuation handling
      sanitizedQ2Q = sanitizedQ2Q.replace(/a\)\s*([^?\n]+?)(?=\s*(?:\n\s*or\s*\n|\n\s*b\)|\n\s*Reply|$))/gi, (match, content) => {
        const trimmedContent = content.trim();
        // Remove trailing punctuation except for already existing question marks
        const cleanContent = trimmedContent.replace(/[.!,;:]+$/, '');
        if (!trimmedContent.endsWith('?')) {
          return `a) ${cleanContent}?`;
        }
        return match;
      });

      // Handle b) options with improved punctuation handling
      sanitizedQ2Q = sanitizedQ2Q.replace(/b\)\s*([^?\n]+?)(?=\s*(?:\n\s*Reply|$))/gi, (match, content) => {
        const trimmedContent = content.trim();
        // Remove trailing punctuation except for already existing question marks
        const cleanContent = trimmedContent.replace(/[.!,;:]+$/, '');
        if (!trimmedContent.endsWith('?')) {
          return `b) ${cleanContent}?`;
        }
        return match;
      });

      // Handle "or" as standalone separator to avoid truncation when "or" appears in content
      // Ensure "or" is on its own line between options
      sanitizedQ2Q = sanitizedQ2Q.replace(/(\?\s*)\s+or\s+(?=\s*b\))/gi, '$1\nor\n');
      sanitizedQ2Q = sanitizedQ2Q.replace(/(\?\s*)or\s*\n/gi, '$1\nor\n');

      // Enforce reply line on its own separate line: "\nReply a or b to confirm."
      if (!sanitizedQ2Q.includes('Reply a or b to confirm')) {
        // Look for variations and replace them
        const replyPatterns = [
          /Reply\s+[12]\s+or\s+[12]\s+to\s+confirm/gi,
          /Reply\s+with\s+[12]\s+or\s+[12]/gi,
          /Choose\s+[12]\s+or\s+[12]/gi,
          /Select\s+[12]\s+or\s+[12]/gi
        ];

        for (const pattern of replyPatterns) {
          sanitizedQ2Q = sanitizedQ2Q.replace(pattern, '\nReply a or b to confirm');
        }

        // If still no proper ending, add it on separate line
        if (!sanitizedQ2Q.includes('Reply a or b to confirm')) {
          // Remove any trailing periods before adding reply line
          sanitizedQ2Q = sanitizedQ2Q.replace(/\.\s*$/, '');
          sanitizedQ2Q += '\nReply a or b to confirm.';
        }
      } else {
        // Ensure existing reply line is on separate line
        sanitizedQ2Q = sanitizedQ2Q.replace(/(\?)\s*(Reply\s+a\s+or\s+b\s+to\s+confirm)/gi, '$1\n$2');
      }

      sanitized = beforeQ2Q + sanitizedQ2Q;
    }

    // Log if changes were made
    if (sanitized !== content) {
      console.log('✅ Q2Q format sanitized - numeric patterns converted to a)/b) format');
    }

    return sanitized;
  }

  // Helper method to get or create a thread for a user
  private async getOrCreateThread(userId: string): Promise<string> {
    if (!this.openai) {
      await this.initOpenAI();
    }

    // Check if we have an existing thread for this user
    const existingThreadId = this.userThreads.get(userId);
    if (existingThreadId) {
      try {
        // Verify the thread still exists
        await this.openai.beta.threads.retrieve(existingThreadId);
        console.log(`🧵 Using existing thread ${existingThreadId} for user ${userId}`);
        return existingThreadId;
      } catch (error) {
        console.log(`⚠️ Thread ${existingThreadId} no longer exists for user ${userId}, creating new one`);
        this.userThreads.delete(userId);
      }
    }

    // Create a new thread
    try {
      const thread = await this.openai.beta.threads.create();
      this.userThreads.set(userId, thread.id);
      console.log(`🧵 Created new thread ${thread.id} for user ${userId}`);
      return thread.id;
    } catch (error) {
      console.error('❌ Failed to create thread:', error);
      throw new Error(`Failed to create conversation thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateOpenAIResponse(message: string, category: string, user: any, activeRules?: string, language = 'en', conversationHistory?: any[]): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.openai) {
        await this.initOpenAI();
      }

      const assistantId = "asst_a3lKuy0P0mr9g5MJ0vKkkMbM";
      const userId = user?.id || user?.userId || `session_${nanoid(16)}`;  // Unique per-session ID to prevent cross-user mixing
      
      // Get user context details
      const userRank = user?.maritimeRank || 'Maritime Professional';
      const userShip = user?.shipName ? `aboard ${user.shipName}` : 'shore-based';
      const isPremium = this.isPremiumUser(user);
      
      console.log('🤖 OpenAI Assistant: Making API request...');
      console.log(`🚀 Using assistant ${assistantId} for ${isPremium ? 'PREMIUM' : 'FREE'} user`);
      
      // Get or create a thread for this user
      const threadId = await this.getOrCreateThread(userId);
      
      // Add conversation history if provided (for new threads)
      if (conversationHistory && conversationHistory.length > 0) {
        console.log(`📚 Adding ${conversationHistory.length} messages from conversation history`);
        
        for (const historyMessage of conversationHistory) {
          try {
            await this.openai.beta.threads.messages.create(threadId, {
              role: historyMessage.role === 'user' ? 'user' : 'assistant',
              content: historyMessage.content
            });
          } catch (error) {
            console.warn('⚠️ Failed to add history message:', error);
          }
        }
      }
      
      // Build contextual message that includes user info, language, and rules
      let contextualMessage = message;
      
      // Add user context to the message
      if (userRank !== 'Maritime Professional' || user?.shipName) {
        contextualMessage = `[USER CONTEXT: ${userRank} ${userShip}]\n\n${message}`;
      }
      
      // Add language preference
      if (language === 'tr') {
        contextualMessage = `[LANGUAGE: Please respond in Turkish language only]\n\n${contextualMessage}`;
      } else {
        contextualMessage = `[LANGUAGE: Please respond in English language only]\n\n${contextualMessage}`;
      }
      
      // Add category specialization
      if (category) {
        contextualMessage = `[SPECIALIZATION: Focus on ${category}]\n\n${contextualMessage}`;
      }
      
      // Add active rules if provided
      if (activeRules) {
        contextualMessage = `[ADDITIONAL GUIDELINES: ${activeRules.substring(0, 800)}]\n\n${contextualMessage}`;
      }
      
      // Add message to thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: contextualMessage
      });
      
      // Build additional instructions to preserve output format
      const additionalInstructions = `CRITICAL RESPONSE FORMAT:
- ALWAYS respond in bullet point format with exactly 3-5 bullet points
- Keep total response between 30-50 words maximum
- Each bullet point should be 6-12 words maximum
- Use concise, technical language
- Prioritize safety and maritime regulations (SOLAS, MARPOL, STCW)
- Example format:
  • [Action/Solution in 6-12 words]
  • [Technical detail in 6-12 words]
  • [Safety consideration in 6-12 words]
  • [Regulation reference if applicable]

Q2Q FOLLOW-UP REQUIREMENT - CRITICAL FORMAT OVERRIDE:
- NEVER use q1/q2 or numbered options like "1)" or "2)"
- ALWAYS use ONLY "a)" and "b)" format for options
- ALWAYS end your response with exactly TWO relevant follow-up questions in selectable format
- MANDATORY Format: "Would u 'also' like to know\na) [Specific related topic]?\nor\nb) [Another specific related topic]?\nReply a or b to confirm."
- Questions should deepen understanding of the core topic
- Users can reply with just "a" or "b" to select their preferred question
- CORRECT Example: If asked about centrifugal pump, follow with:
  "Would u 'also' like to know
  a) What is Lantern Ring in a Centrifugal pump?
  or
  b) The material by which impeller, casing & mouth ring are made?
  Reply a or b to confirm."
- WRONG Examples to NEVER use: "q1)" "q2)" "1)" "2)" "Reply 1 or 2"`;
      
      // Run the assistant with additional instructions
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: additionalInstructions
      });
      
      // Wait for completion with timeout
      let runStatus = run;
      const maxWaitTime = 60000; // 60 seconds timeout
      const pollInterval = 1000; // Check every second
      let waitedTime = 0;
      
      console.log(`🏃 Running assistant ${assistantId} on thread ${threadId}...`);
      
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (waitedTime >= maxWaitTime) {
          console.error('❌ Assistant run timeout');
          throw new Error('Assistant response timeout');
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waitedTime += pollInterval;
        
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log(`⏳ Assistant status: ${runStatus.status} (${waitedTime}ms)`);
      }
      
      if (runStatus.status !== 'completed') {
        console.error(`❌ Assistant run failed with status: ${runStatus.status}`);
        if (runStatus.last_error) {
          console.error('Last error:', runStatus.last_error);
        }
        throw new Error(`Assistant run failed: ${runStatus.status}`);
      }
      
      // Retrieve messages from the thread, filtering by run_id to get the correct response
      const messages = await this.openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 20  // Get more messages to ensure we find the correct run response
      });
      
      // Filter messages by run_id and role to get the specific assistant response for this run
      const assistantMessage = messages.data.find((message: any) => 
        message.role === 'assistant' && message.run_id === run.id
      );
      
      if (!assistantMessage) {
        console.error(`❌ No assistant message found for run ${run.id} in thread ${threadId}`);
        console.log('Available messages:', messages.data.map((m: any) => ({ role: m.role, run_id: m.run_id, created_at: m.created_at })));
        throw new Error(`No response from assistant for run ${run.id}`);
      }
      
      // Extract text content from the message
      let content = '';
      if (assistantMessage.content && assistantMessage.content.length > 0) {
        const textContent = assistantMessage.content.find((content: any) => content.type === 'text');
        if (textContent && textContent.text) {
          content = textContent.text.value;
        }
      }
      
      if (!content) {
        console.warn('⚠️ OpenAI Assistant: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 OpenAI Assistant: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Apply Q2Q sanitization to ensure proper format
      const sanitizedContent = this.sanitizeQ2QFormat(content);
      
      // Apply free user limits if user is not premium
      const finalContent = this.isPremiumUser(user) ? sanitizedContent : await this.applyFreeUserLimits(sanitizedContent, user);

      return {
        content: finalContent,
        model: 'openai',
        tokens: runStatus.usage?.total_tokens,
        responseTime
      };

    } catch (error) {
      console.error('OpenAI Assistant API error:', error);
      throw new Error(`OpenAI Assistant generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateGeminiResponse(message: string, category: string, user: any, activeRules?: string, language = 'en', conversationHistory?: any[]): Promise<AIResponse> {
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
        • [Regulation reference if applicable]
      
      Q2Q FOLLOW-UP REQUIREMENT - CRITICAL FORMAT OVERRIDE:
      - NEVER use q1/q2 or numbered options like "1)" or "2)"
      - ALWAYS use ONLY "a)" and "b)" format for options
      - ALWAYS end your response with exactly TWO relevant follow-up questions in selectable format
      - MANDATORY Format: "Would u 'also' like to know\na) [Specific related topic]?\nor\nb) [Another specific related topic]?\nReply a or b to confirm."
      - Questions should deepen understanding of the core topic
      - Users can reply with just "a" or "b" to select their preferred question
      - NEVER use markdown formatting (no **bold** text) in Q2Q sections
      - CORRECT Example: If asked about centrifugal pump, follow with:
        "Would u 'also' like to know
        a) What is Lantern Ring in a Centrifugal pump?
        or
        b) The material by which impeller, casing & mouth ring are made?
        Reply a or b to confirm."
      - WRONG Examples to NEVER use: "q1)" "q2)" "1)" "2)" "Reply 1 or 2"`;
      
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
          maxOutputTokens: 250,
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

      // Apply Q2Q sanitization to ensure proper format
      const sanitizedContent = this.sanitizeQ2QFormat(content);
      
      // Apply free user limits if user is not premium
      const finalContent = this.isPremiumUser(user) ? sanitizedContent : await this.applyFreeUserLimits(sanitizedContent, user);

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

  async generateDeepseekResponse(message: string, category: string, user: any, activeRules?: string, language = 'en', conversationHistory?: any[]): Promise<AIResponse> {
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
        • [Regulation reference if applicable]
      
      Q2Q FOLLOW-UP REQUIREMENT - CRITICAL FORMAT OVERRIDE:
      - NEVER use q1/q2 or numbered options like "1)" or "2)"
      - ALWAYS use ONLY "a)" and "b)" format for options
      - ALWAYS end your response with exactly TWO relevant follow-up questions in selectable format
      - MANDATORY Format: "Would u 'also' like to know\na) [Specific related topic]?\nor\nb) [Another specific related topic]?\nReply a or b to confirm."
      - Questions should deepen understanding of the core topic
      - Users can reply with just "a" or "b" to select their preferred question
      - NEVER use markdown formatting (no **bold** text) in Q2Q sections
      - CORRECT Example: If asked about centrifugal pump, follow with:
        "Would u 'also' like to know
        a) What is Lantern Ring in a Centrifugal pump?
        or
        b) The material by which impeller, casing & mouth ring are made?
        Reply a or b to confirm."
      - WRONG Examples to NEVER use: "q1)" "q2)" "1)" "2)" "Reply 1 or 2"`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 Deepseek: Making API request...');
      
      const response = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 250,
        temperature: 0.2,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ Deepseek: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 Deepseek: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Apply Q2Q sanitization to ensure proper format
      const sanitizedContent = this.sanitizeQ2QFormat(content);
      
      // Apply free user limits if user is not premium
      const finalContent = this.isPremiumUser(user) ? sanitizedContent : await this.applyFreeUserLimits(sanitizedContent, user);

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

  async generateMistralResponse(message: string, category: string, user: any, activeRules?: string, language = 'en', conversationHistory?: any[]): Promise<AIResponse> {
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
        • [Regulation reference if applicable]
      
      Q2Q FOLLOW-UP REQUIREMENT - CRITICAL FORMAT OVERRIDE:
      - NEVER use q1/q2 or numbered options like "1)" or "2)"
      - ALWAYS use ONLY "a)" and "b)" format for options
      - ALWAYS end your response with exactly TWO relevant follow-up questions in selectable format
      - MANDATORY Format: "Would u 'also' like to know\na) [Specific related topic]?\nor\nb) [Another specific related topic]?\nReply a or b to confirm."
      - Questions should deepen understanding of the core topic
      - Users can reply with just "a" or "b" to select their preferred question
      - NEVER use markdown formatting (no **bold** text) in Q2Q sections
      - CORRECT Example: If asked about centrifugal pump, follow with:
        "Would u 'also' like to know
        a) What is Lantern Ring in a Centrifugal pump?
        or
        b) The material by which impeller, casing & mouth ring are made?
        Reply a or b to confirm."
      - WRONG Examples to NEVER use: "q1)" "q2)" "1)" "2)" "Reply 1 or 2"`;
      
      if (activeRules) {
        systemPrompt += `\n\nActive bot documentation guidelines:\n${activeRules.substring(0, 800)}`;
      }

      console.log('🤖 Mistral: Making API request...');
      
      const response = await this.mistral.chat.completions.create({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 250,
        temperature: 0.7,
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ Mistral: No content in response, using fallback');
        content = 'Unable to generate response at this time.';
      }
      
      console.log('🤖 Mistral: Response generated successfully:', content.substring(0, 100) + '...');
      const responseTime = Date.now() - startTime;

      // Apply Q2Q sanitization to ensure proper format
      const sanitizedContent = this.sanitizeQ2QFormat(content);
      
      // Apply free user limits if user is not premium
      const finalContent = this.isPremiumUser(user) ? sanitizedContent : await this.applyFreeUserLimits(sanitizedContent, user);

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

  async extractSpecifications(rfqText: string, user: any): Promise<{
    categories: Array<{
      name: string;
      specifications: Array<{
        key: string;
        value: string;
        unit?: string;
      }>;
    }>;
    extractedAt: string;
    model: string;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.openai) {
        await this.initOpenAI();
      }

      const systemPrompt = `You are an AI assistant specialized in extracting technical specifications from maritime equipment and service requirements. Your task is to analyze RFQ (Request for Quote) text and extract structured specifications in a standardized format.

CRITICAL INSTRUCTIONS:
- Extract ALL technical specifications, measurements, requirements, and features mentioned
- Group related specifications into logical categories
- Return ONLY a valid JSON object - no additional text or markdown
- Use consistent category names (e.g., "Physical Specifications", "Technical Features", "Performance", "Materials", "Power Requirements", "Safety Features", "Compliance & Standards")
- Include units when specified (e.g., "kg", "mm", "V", "A", "bar", "°C")
- If a value has a range, keep it as written (e.g., "2-3", "5 or 15")

RESPONSE FORMAT - Return only this JSON structure:
{
  "categories": [
    {
      "name": "Physical Specifications",
      "specifications": [
        {"key": "Weight", "value": "6.5", "unit": "kg"},
        {"key": "Length", "value": "550", "unit": "mm"}
      ]
    },
    {
      "name": "Technical Features", 
      "specifications": [
        {"key": "Light Type", "value": "LED Xenon lamp"},
        {"key": "Light Intensity", "value": "5 or 15", "unit": "Candela"}
      ]
    }
  ]
}

EXAMPLE INPUT: "Emergency Towing System Buoy with a flashing light: Weight & Dimensions: 6.5 kg, 550 mm length. Lighting System: LED Xenon lamp, yellow housing of ABS, clear Lexan lens, 5 or 15 Candela light intensity, 2 or 3 Nautical Miles surface range, 6 km radiation distance. Material & Features: E.V.A buoy material, waterproof down to 200 meters, on/off daylight sensor with magnet/reed contact, 25 flashes per minute. Power Source: Requires 3 D-cell batteries."

EXAMPLE OUTPUT:
{
  "categories": [
    {
      "name": "Physical Specifications",
      "specifications": [
        {"key": "Weight", "value": "6.5", "unit": "kg"},
        {"key": "Length", "value": "550", "unit": "mm"}
      ]
    },
    {
      "name": "Lighting System",
      "specifications": [
        {"key": "Light Type", "value": "LED Xenon lamp"},
        {"key": "Housing Color", "value": "yellow"},
        {"key": "Housing Material", "value": "ABS"},
        {"key": "Lens Material", "value": "clear Lexan"},
        {"key": "Light Intensity", "value": "5 or 15", "unit": "Candela"},
        {"key": "Surface Range", "value": "2 or 3", "unit": "Nautical Miles"},
        {"key": "Radiation Distance", "value": "6", "unit": "km"},
        {"key": "Flash Rate", "value": "25", "unit": "flashes per minute"}
      ]
    },
    {
      "name": "Materials & Features",
      "specifications": [
        {"key": "Buoy Material", "value": "E.V.A"},
        {"key": "Waterproof Rating", "value": "200", "unit": "meters"},
        {"key": "Daylight Sensor", "value": "on/off with magnet/reed contact"}
      ]
    },
    {
      "name": "Power Requirements",
      "specifications": [
        {"key": "Battery Type", "value": "3 D-cell batteries"}
      ]
    }
  ]
}`;

      console.log('🔧 Extracting specifications from RFQ text...');
      
      // Use premium model for specification extraction for accuracy
      const isPremium = this.isPremiumUser(user);
      const model = "gpt-4o"; // Always use the best model for spec extraction
      const maxTokens = 1500; // Need more tokens for structured output
      
      console.log(`🚀 Using ${model} model for specification extraction`);

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract specifications from this RFQ text:\n\n${rfqText}` }
        ],
        max_tokens: maxTokens,
        temperature: 0.1, // Low temperature for consistent structured output
        response_format: { type: "json_object" } // Ensure JSON response
      });

      let content = response.choices[0]?.message?.content;
      
      if (!content) {
        console.warn('⚠️ No content in specification extraction response');
        throw new Error('No content received from AI');
      }

      console.log('🔧 Raw specification extraction response:', content);

      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from AI');
      }

      // Validate the structure
      if (!extractedData.categories || !Array.isArray(extractedData.categories)) {
        console.error('❌ Invalid response structure:', extractedData);
        throw new Error('Invalid specification structure returned');
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Specifications extracted successfully in ${responseTime}ms`);

      return {
        categories: extractedData.categories,
        extractedAt: new Date().toISOString(),
        model: model
      };

    } catch (error) {
      console.error('❌ Specification extraction failed:', error);
      throw new Error(`Specification extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async generateDualResponse(message: string, category: string, user: any, activeRules?: string, preferredModel?: 'openai' | 'gemini' | 'deepseek' | 'mistral', language = 'en', conversationHistory?: any[]): Promise<AIResponse> {
    // 4-model system: OpenAI, Gemini, Deepseek, Mistral
    const useModel = preferredModel || 'openai'; // Default to OpenAI
    
    console.log(`🤖 Using ${useModel.toUpperCase()} model`);
    
    try {
      if (useModel === 'mistral' && process.env.MISTRAL_API_KEY) {
        return await this.generateMistralResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (useModel === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
        return await this.generateDeepseekResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (useModel === 'gemini' && process.env.GEMINI_API_KEY) {
        return await this.generateGeminiResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (useModel === 'openai' && process.env.OPENAI_API_KEY) {
        return await this.generateOpenAIResponse(message, category, user, activeRules, language, conversationHistory);
      }
      
      // Fallback to available model in priority order
      if (process.env.OPENAI_API_KEY) {
        console.log('Falling back to OpenAI (primary model not available)');
        return await this.generateOpenAIResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (process.env.MISTRAL_API_KEY) {
        console.log('Falling back to Mistral (primary model not available)');
        return await this.generateMistralResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini (primary model not available)');
        return await this.generateGeminiResponse(message, category, user, activeRules, language, conversationHistory);
      } else if (process.env.DEEPSEEK_API_KEY) {
        console.log('Falling back to Deepseek (primary model not available)');
        return await this.generateDeepseekResponse(message, category, user, activeRules, language, conversationHistory);
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

  // Check if user is premium using multiple sources
  private isPremiumUser(user: any): boolean {
    const testingEmails = ['workship.ai@gmail.com', 'mushy.piyush@gmail.com'];
    const userEmail = user?.email || user?.fullName || '';
    return user?.isPremium || user?.isAdmin || testingEmails.includes(userEmail) || false;
  }

  // Apply free user limits - truncate based on configurable token limits for non-premium users
  private async applyFreeUserLimits(content: string, user: any): Promise<string> {
    try {
      // Check premium status using Razorpay service for accurate verification
      const userId = user?.id || user?.userId;
      if (!userId) {
        console.log('⚠️ No user ID available for premium check, treating as free user');
        // Continue to free user logic below
      } else {
        // First check if user is admin (admins get unlimited access)
        if (user?.isAdmin || user?.is_admin) {
          console.log(`✅ Admin user verified (ID: ${userId}) - returning full response (${content.split(' ').length} words)`);
          return content;
        }
        
        // Check specific premium user IDs (workship.ai@gmail.com users)
        const premiumUserIds = ['45016180', '44885683'];
        if (premiumUserIds.includes(userId.toString())) {
          console.log(`✅ Premium user ID verified (${userId}) - returning full response (${content.split(' ').length} words)`);
          return content;
        }
        
        // Import and use the Razorpay service directly
        const { RazorpayService } = await import('./razorpay-service-production.js');
        const razorpayService = RazorpayService.getInstance();
        const premiumStatus = await razorpayService.checkUserPremiumStatus(userId.toString());
        
        if (premiumStatus.isPremium) {
          console.log(`✅ Razorpay premium user verified - returning full response (${content.split(' ').length} words)`);
          return content;
        }
        console.log(`🔍 Premium check result for user ${userId}: isPremium = ${premiumStatus.isPremium}, isAdmin = ${user?.isAdmin}`);
      }
    } catch (error) {
      console.error('❌ Error checking premium status:', error);
      console.log('Continuing with free user limits as fallback');
    }
    
    // Get configurable token limits
    const tokenLimits = await this.getTokenLimits();
    
    // For free users, provide full professional answer within reasonable token limits
    const words = content.split(' ');
    const wordCount = words.length;
    
    // Use maximum allowed word count for free users to provide comprehensive answers
    const maxWordCount = tokenLimits.max;
    
    console.log(`🆓 Free user - response length: ${wordCount} words (limit: ${maxWordCount} words)`);
    
    // If content is within limits, return full response
    if (wordCount <= maxWordCount) {
      return content;
    }
    
    // Check if content contains Q2Q section that should be preserved
    const q2qPattern = /Would\s+u\s+'?also'?\s+like\s+to\s+know[\s\S]*Reply\s+a\s+or\s+b\s+to\s+confirm/i;
    const q2qMatch = content.match(q2qPattern);
    
    if (q2qMatch) {
      // Calculate the main content before Q2Q
      const q2qStart = q2qMatch.index!;
      const mainContent = content.substring(0, q2qStart).trim();
      const q2qSection = content.substring(q2qStart);
      
      const mainWords = mainContent.split(' ');
      const q2qWords = q2qSection.split(' ');
      
      console.log(`📊 Q2Q detected: Main content (${mainWords.length} words) + Q2Q (${q2qWords.length} words)`);
      
      // If main content + Q2Q fits within limits, keep everything
      if (wordCount <= maxWordCount) {
        return content;
      }
      
      // If content exceeds limits, preserve Q2Q and truncate main content only
      const availableWordsForMain = Math.max(maxWordCount - q2qWords.length, Math.floor(maxWordCount * 0.7));
      
      if (mainWords.length > availableWordsForMain) {
        const truncatedMainContent = mainWords.slice(0, availableWordsForMain).join(' ');
        
        // Ensure professional ending
        let finalMainContent = truncatedMainContent;
        if (!finalMainContent.endsWith('.') && !finalMainContent.endsWith('!') && !finalMainContent.endsWith('?')) {
          finalMainContent += '.';
        }
        
        console.log(`✂️ Truncated main content to preserve Q2Q (${availableWordsForMain} words for main + ${q2qWords.length} for Q2Q)`);
        return `${finalMainContent}\n\n${q2qSection}`;
      }
      
      return content; // Should fit within limits
    }
    
    // If no Q2Q section, use standard truncation
    const limitedWords = words.slice(0, maxWordCount);
    let limitedContent = limitedWords.join(' ');
    
    // Ensure professional ending without upgrade prompts
    if (!limitedContent.endsWith('.') && !limitedContent.endsWith('!') && !limitedContent.endsWith('?')) {
      limitedContent += '.';
    }
    
    return limitedContent;
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