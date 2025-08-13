# QaaqConnect Feedback System for QBOT & WATI Bot

## Overview
The QaaqConnect platform now features a comprehensive feedback system that automatically requests user feedback after every technical answer from both QBOT (web chat) and WATI bot (WhatsApp Business API). This system congratulates users for asking good questions and collects quality ratings to improve AI responses.

## 🎯 Key Features

### ✅ Smart Feedback Messages
- **Dynamic Congratulations**: Randomly selected appreciation messages like "Great question! 🌊", "Excellent technical question! ⚙️", "Brilliant maritime inquiry! 🚢"
- **Quality Assessment**: Asks users to rate answer quality with multiple format options
- **Call-to-Action**: Clear instructions for providing feedback (stars, ratings, text responses)

### ✅ Multi-Format Rating Support
Users can provide feedback in various formats:
- **Star Ratings**: ⭐⭐⭐⭐⭐ (1-5 stars)
- **Numeric Scale**: 1-5, 1-10, or fraction format (4/5)
- **Text Responses**: "Excellent", "Good", "Poor", "Perfect", etc.
- **Letter Grades**: A/B/C grading system
- **Thumbs**: 👍 (helpful) or 👎 (needs improvement)

### ✅ Intelligent Parsing
The system automatically recognizes and normalizes different feedback formats:
```javascript
// Examples of recognized feedback:
"⭐⭐⭐⭐⭐" → Rating: 5/5
"8/10" → Rating: 4/5 (normalized)
"Excellent" → Rating: 5/5
"B" → Rating: 4/5
"👍" → Rating: 5/5
```

## 🚢 Integration Points

### 1. QBOT Web Chat Integration
- **Location**: `/api/qbot/chat` endpoint in `server/routes.ts`
- **Behavior**: Appends feedback message after every AI response
- **Format**: Technical answer + separator + feedback prompt
- **Example Response**:
```
• Check fuel injector timing alignment
• Verify fuel pressure at 150-180 bar
• Inspect fuel filter contamination
• Review engine load distribution

---
Great question! 🌊 Rate the answer quality? Reply: ⭐⭐⭐⭐⭐ (1-5 stars)
```

### 2. WATI WhatsApp Bot Integration
- **Service**: `WatiBotService` class in `server/wati-bot-service.ts`
- **Webhook**: `/api/wati/webhook` for incoming messages
- **State Tracking**: Maintains feedback status per user
- **Auto-Detection**: Recognizes technical questions vs feedback responses

### 3. Feedback Processing
- **Endpoint**: `/api/qbot/feedback` for processing ratings
- **Database Storage**: Stores all feedback in `answer_feedback` table
- **Thank You Messages**: Random appreciation responses
- **Analytics Ready**: Feedback data available for analysis

## 📊 Database Schema

### Answer Feedback Table
```sql
CREATE TABLE answer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  question_id VARCHAR NOT NULL,
  rating VARCHAR NOT NULL,
  comment TEXT,
  feedback_source VARCHAR DEFAULT 'whatsapp',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);
```

### User Feedback Status (WATI)
```sql
CREATE TABLE user_feedback_status (
  phone VARCHAR PRIMARY KEY,
  question_id VARCHAR,
  awaiting_feedback BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🛠️ Implementation Details

### FeedbackService Class
Located in `server/feedback-service.ts`, provides:

#### Core Methods:
- `generateFeedbackMessage()`: Creates full feedback prompts
- `generateCompactFeedbackMessage()`: WhatsApp-optimized short messages
- `parseFeedbackRating()`: Intelligent rating extraction
- `storeFeedback()`: Database storage with conflict handling
- `getFeedbackStats()`: Analytics and reporting

#### Template System:
```javascript
const FEEDBACK_TEMPLATES = {
  appreciation: [
    "Great question! 🌊",
    "Excellent technical question! ⚙️",
    "Brilliant maritime inquiry! 🚢"
    // ... more variations
  ],
  feedbackRequest: [
    "How would you rate the quality of this answer?",
    "Was this answer helpful for your situation?"
    // ... more variations
  ],
  callToAction: [
    "Reply with: ⭐⭐⭐⭐⭐ (1-5 stars) or 'Excellent/Good/Poor'",
    "Send: 👍 (helpful) or 👎 (needs improvement)"
    // ... more variations
  ]
};
```

## 🔧 Usage Examples

### Testing QBOT Web Chat
```bash
curl -X POST http://localhost:5000/api/qbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I troubleshoot engine overheating?"}'
```

**Expected Response**:
```json
{
  "response": "• Check coolant level and circulation\n• Verify thermostat operation\n• Inspect radiator for blockages\n\n---\nSmart technical doubt! 💡 Rate this response: A/B/C (A=Perfect, B=Good, C=Poor)",
  "aiModel": "gpt-4o",
  "responseTime": 1234,
  "feedbackPrompt": true
}
```

### Testing WATI Bot (Development)
```bash
curl -X POST http://localhost:5000/api/wati/test-message \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919920027697", "message": "Engine temperature alarm keeps triggering?"}'
```

### Processing Feedback
```bash
curl -X POST http://localhost:5000/api/qbot/feedback \
  -H "Content-Type: application/json" \
  -d '{"message": "⭐⭐⭐⭐⭐", "questionId": "1755064123456"}'
```

## 📈 Analytics & Monitoring

### Feedback Statistics Endpoint
- **URL**: `/api/admin/feedback-stats`
- **Authentication**: Required (JWT token)
- **Returns**: Average ratings, feedback counts, trends

### Example Analytics Response:
```json
[
  {
    "average_rating": 4.2,
    "total_feedback": 156,
    "positive_feedback": 124,
    "negative_feedback": 12,
    "feedback_source": "whatsapp",
    "feedback_date": "2025-01-13"
  }
]
```

## 🚀 Deployment Configuration

### Required Environment Variables
```bash
# WATI Integration (Optional - will simulate if not provided)
WATI_API_URL=https://live-mt-server.wati.io/
WATI_API_KEY=your_wati_api_key_here

# Database (Already configured)
DATABASE_URL=postgresql://username:password@host:port/database

# AI Service (Already configured)
OPENAI_API_KEY=your_openai_key_here
```

### WATI Webhook Setup
1. Configure WATI webhook URL: `https://yourdomain.com/api/wati/webhook`
2. Initialize database tables: `POST /api/wati/initialize`
3. Test with development endpoint: `POST /api/wati/test-message`

## 📱 User Experience Flow

### For Technical Questions:
1. User asks technical question (QBOT or WhatsApp)
2. AI generates detailed technical answer
3. System appends congratulatory feedback message
4. User receives combined response with rating prompt
5. User provides rating in any supported format
6. System stores feedback and sends thank you message

### Sample Conversation:
```
User: "Why is my fuel pump pressure dropping?"

QBOT: "• Check fuel filter contamination levels
• Verify fuel line integrity for leaks
• Test pump motor current draw
• Inspect fuel tank pickup screen

---
Excellent maritime question! ⚙️ How helpful was this answer? Send: 👍 or 👎"

User: "👍"

QBOT: "Thank you for the feedback! 🙏 Your input helps QBOT improve maritime assistance."
```

## 🔍 Quality Control Features

### Duplicate Prevention
- Unique constraint on (user_id, question_id) prevents duplicate feedback
- UPSERT logic allows rating updates for same question

### Format Flexibility  
- Accepts multiple rating formats without user training
- Graceful handling of unrecognized feedback with clarification requests

### Context Awareness
- Tracks user state for WATI bot (awaiting feedback vs new question)
- Distinguishes between technical questions and general conversation

## 📚 Maintenance & Updates

### Adding New Feedback Templates
Edit `FEEDBACK_TEMPLATES` in `server/feedback-service.ts`:
```javascript
appreciation: [
  // Add new congratulatory messages here
  "Outstanding maritime thinking! ⚓"
],
```

### Monitoring Feedback Quality
Query the analytics endpoint regularly to track:
- Average satisfaction ratings
- Response rates to feedback requests
- Common feedback patterns

### Database Maintenance
The system includes automatic cleanup and indexing:
- Indexed by user_id, rating, and created_at for fast queries
- Automatic timestamp updates for feedback modifications

This comprehensive feedback system enhances user engagement while providing valuable data for improving AI response quality across both web and WhatsApp channels.