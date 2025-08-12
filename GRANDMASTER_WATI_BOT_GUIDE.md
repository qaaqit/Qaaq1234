# GrandMaster WATI Bot Implementation Guide

## Overview
The GrandMaster WATI Bot is a comprehensive WhatsApp automation system for QAAQ Maritime Platform that implements advanced conversation flow management, technical question processing, and user onboarding according to the GrandMaster rules.

## Architecture

### Core Components

#### 1. GrandmasterWatiBot Class (`server/grandmaster-wati-bot.ts`)
The main bot engine that processes all incoming WhatsApp messages according to the three-flow system:
- **Conversation Flow**: General chat and interaction management
- **Technical Flow**: Maritime engineering question processing with AI
- **Onboarding Flow**: New user registration and profile completion

#### 2. Database Schema Extensions
New tables added to `shared/schema.ts`:
- `wati_conversation_state`: Tracks user conversation state and flow progress
- `wati_message_history`: Logs all messages and interactions
- `wati_technical_clarifications`: Manages A/B clarification system for technical questions

#### 3. Webhook Integration (`server/routes.ts`)
- `/api/wati/webhook`: Main webhook endpoint for WATI platform
- `/api/wati/test-grandmaster`: Admin testing endpoint

## Features

### Message Classification Engine
The bot automatically classifies incoming messages into categories:
- **Greetings**: "hi", "hello", "namaste", etc.
- **Questions**: Messages ending with "?" (10+ characters)
- **Commands**: "/help", "/profile", "/status", etc.
- **Location**: "koi hai", "nearby", "where"
- **Commercial**: "buy", "price", "store"
- **Emergency**: "urgent", "help", "accident"
- **Casual**: General maritime-related chat
- **Unclear**: Messages requiring clarification

### Technical Question Processing
Implements the complete GrandMaster Technical Flow:

#### 1. Daily Limits
- Complete profiles: 10 questions/day
- Incomplete profiles: 3 questions/day
- Automatic limit reset at midnight

#### 2. A/B Clarification System
For ambiguous questions, the bot sends:
```
🔍 Are you asking about:
A) Definition/Theory - How it works, purpose, technical explanation
B) Troubleshooting - Solving a problem or operational issue

Reply A for theory/explanation or B for problem-solving guidance.
```

#### 3. AI Integration (OpenAI o1-mini)
- **Definition Mode**: Educational explanations and technical specifications
- **Troubleshooting Mode**: Diagnostic steps and problem-solving guidance
- **Maritime-specific**: Tailored for marine engineering contexts

### Onboarding System
Implements the complete GrandMaster Onboarding Flow:

#### 1. New User Detection
- Automatically detects first-time users
- Initiates professional onboarding sequence

#### 2. Information Collection
- Full name with validation
- Maritime rank/position selection
- Ship/company information
- Profile completion scoring

#### 3. Welcome Integration
```
🚢 Welcome to QAAQ - Maritime Professional Network!
I'm QBOT, your 24/7 maritime technical assistant.
```

## API Endpoints

### Webhook Endpoint
```
POST /api/wati/webhook
```
Processes all WATI webhook events:
- `message`: Incoming user messages
- `newContactMessageReceived`: New user first contact
- `templateMessageSent`: Template delivery confirmation
- `sentMessageDELIVERED`: Message delivery status
- `templateMessageFailed`: Failed message notifications

### Test Endpoint
```
POST /api/wati/test-grandmaster
Authorization: Bearer {token}
Content-Type: application/json

{
  "whatsappNumber": "+1234567890",
  "message": "What is a marine engine?"
}
```

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
WATI_TOKEN=your_wati_api_token
WATI_API_ENDPOINT=https://live-server-XXXX.wati.io/api/v1
```

### WATI Platform Setup
1. Configure webhook URL: `https://your-domain.replit.app/api/wati/webhook`
2. Enable webhook events:
   - Message Received
   - Template Message Status
   - New Contact Message
3. Set up message templates for automated responses

## Database Tables

### wati_conversation_state
Tracks user conversation flow and progress:
```sql
CREATE TABLE wati_conversation_state (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT NOT NULL UNIQUE,
  current_flow TEXT NOT NULL, -- 'conversation', 'technical', 'onboarding'
  current_step TEXT NOT NULL, -- Current step in flow
  step_data JSONB DEFAULT '{}', -- Step-specific data
  pending_question TEXT, -- For technical clarifications
  daily_question_count INTEGER DEFAULT 0,
  last_question_date TIMESTAMP,
  onboarding_complete BOOLEAN DEFAULT false,
  profile_completeness INTEGER DEFAULT 0, -- 0-100%
  last_activity TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### wati_message_history
Comprehensive message logging:
```sql
CREATE TABLE wati_message_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'inbound', 'outbound'
  message_text TEXT NOT NULL,
  message_classification TEXT, -- Message category
  flow_context TEXT, -- Active flow
  step_context TEXT, -- Active step
  ai_response TEXT, -- AI-generated response
  processing_time INTEGER, -- Response time in ms
  wati_message_id TEXT, -- WATI API message ID
  created_at TIMESTAMP DEFAULT now()
);
```

### wati_technical_clarifications
A/B clarification system management:
```sql
CREATE TABLE wati_technical_clarifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT NOT NULL,
  original_question TEXT NOT NULL,
  clarification_type TEXT NOT NULL, -- 'definition', 'troubleshooting', 'pending'
  clarification_sent BOOLEAN DEFAULT false,
  user_response TEXT, -- 'A' or 'B' response
  final_answer_sent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL, -- 10 minute timeout
  created_at TIMESTAMP DEFAULT now()
);
```

## Usage Examples

### Basic Question Processing
User: "What is a turbocharger?"
Bot Response: 
1. Classifies as ambiguous technical question
2. Sends A/B clarification request
3. User responds "A"
4. Generates definition-focused AI response

### Emergency Handling
User: "Emergency! Engine overheating!"
Bot Response:
1. Classifies as emergency
2. Provides immediate emergency contact info
3. Logs for admin attention
4. Offers technical guidance

### Location Query
User: "koi hai"
Bot Response:
1. Classifies as location request
2. Shows nearby maritime professionals
3. Provides connection options

## Monitoring and Analytics

### Message Processing Metrics
- Response times logged in `wati_message_history`
- Daily question limits tracked per user
- Flow completion rates monitored
- Error rates and recovery tracked

### Admin Dashboard Integration
- Real-time message monitoring
- User onboarding progress tracking
- Technical question analytics
- Emergency alert notifications

## Security and Compliance

### Data Protection
- All messages encrypted in transit
- Personal data handling compliant with GDPR
- WhatsApp numbers stored securely
- Regular data cleanup policies

### Rate Limiting
- User-based daily question limits
- API call throttling for external services
- Webhook validation and security

## Future Enhancements

### Planned Features
- Multi-language support (Hindi, Malayalam, etc.)
- Voice message processing
- Image recognition for technical diagrams
- Integration with QAAQ knowledge base
- Advanced maritime terminology recognition
- Predictive question routing

### AI Model Upgrades
- Custom fine-tuned models for maritime domain
- Enhanced context understanding
- Multi-modal input processing (text + images)
- Real-time learning from user interactions

## Deployment Notes

### Production Requirements
- SSL certificate for webhook endpoint
- Database backup and recovery procedures
- Monitoring and alerting system
- Load balancing for high traffic
- CDN for static content delivery

### Testing Procedures
- Unit tests for message classification
- Integration tests for webhook processing
- End-to-end conversation flow testing
- Load testing for concurrent users
- Disaster recovery testing

---

*Last Updated: August 12, 2025*
*Version: 1.0 - GrandMaster Edition*
*Status: PRODUCTION READY*