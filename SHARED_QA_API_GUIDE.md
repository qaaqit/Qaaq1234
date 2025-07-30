# Shared Q&A System API Guide

## Overview

The shared Q&A system allows all sister apps (QAAQ, QaaqConnect, WhatsApp bots, etc.) to store and access the same question and answer content through a centralized PostgreSQL database.

## Database Tables

### `qaaq_questions`
Stores all questions from all sister apps with full text content.

### `qaaq_answers` 
Stores all answers linked to questions with full text content.

## API Endpoints for Sister Apps

### 1. Store a Question
**POST** `/api/shared/questions`

Store a question from any sister app (WhatsApp bot, web interface, mobile app).

```json
{
  "questionId": "unique_question_id",
  "userId": "user_identifier", 
  "userName": "User Display Name",
  "questionText": "Full question content here...",
  "source": "whatsapp|web|api",
  "category": "Engine Operations",
  "tags": ["engine", "troubleshooting"],
  "location": "Port of Singapore",
  "askedDate": "2025-01-30T10:00:00Z"
}
```

### 2. Store an Answer
**POST** `/api/shared/answers`

Store an answer to any question.

```json
{
  "answerId": "unique_answer_id",
  "questionId": "question_id_being_answered", 
  "userId": "answerer_user_id",
  "userName": "Answerer Name",
  "answerText": "Full answer content here...",
  "source": "whatsapp|web|api",
  "answeredDate": "2025-01-30T11:00:00Z",
  "isAccepted": false
}
```

### 3. Get All Questions
**GET** `/api/shared/questions`

Retrieve all questions from the shared database.

### 4. Search Questions
**GET** `/api/questions/search?q=keyword`

Search questions by keyword across text, category, tags, or user names.

### 5. Get Answers for Question
**GET** `/api/shared/questions/{questionId}/answers`

Get all answers for a specific question.

## Integration Examples

### WhatsApp Bot Integration

```javascript
// When user asks a question via WhatsApp
async function handleWhatsAppQuestion(userMessage, userId, userName) {
  const questionId = `wa_${Date.now()}_${userId}`;
  
  const questionData = {
    questionId,
    userId,
    userName,
    questionText: userMessage,
    source: 'whatsapp',
    askedDate: new Date()
  };
  
  // Store in shared database
  const response = await fetch('/api/shared/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData)
  });
  
  if (response.ok) {
    console.log('Question stored in shared database');
    // Now all sister apps can access this question
  }
}
```

### Web Interface Integration

```javascript
// When user submits question via web form
async function submitQuestion(questionText, category, tags) {
  const questionId = `web_${Date.now()}_${currentUserId}`;
  
  const questionData = {
    questionId,
    userId: currentUserId,
    userName: currentUserName,
    questionText,
    source: 'web',
    category,
    tags,
    askedDate: new Date()
  };
  
  const response = await fetch('/api/shared/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData)
  });
}
```

### Mobile App Integration

```javascript
// Mobile app can access all questions
async function loadQuestionsForUser(userId) {
  // Get user's questions
  const userQuestionsResponse = await fetch(`/api/users/${userId}/profile`);
  const userData = await userQuestionsResponse.json();
  
  // Get all questions for browsing
  const allQuestionsResponse = await fetch('/api/shared/questions');
  const allQuestions = await allQuestionsResponse.json();
  
  return {
    userQuestions: userData.questions,
    allQuestions: allQuestions.questions
  };
}
```

## Benefits

1. **Unified Data**: All apps share the same question/answer content
2. **Real-time Sync**: Questions asked in WhatsApp appear immediately in web interface
3. **Cross-platform Search**: Search works across all sources
4. **Consistent Experience**: Users see same content regardless of access method
5. **Analytics**: Track question patterns across all platforms

## Data Flow

```
WhatsApp Bot ──┐
              │
Web Interface ─┼──► Shared Database ──► All Sister Apps
              │
Mobile App ────┘
```

## Security

- All endpoints require authentication
- User data is validated before storage
- SQL injection prevention with parameterized queries
- Rate limiting on question submission

## Usage Statistics

The system tracks:
- Question source (WhatsApp, Web, API)
- User engagement across platforms
- Popular categories and tags
- Answer acceptance rates

This shared system ensures that maritime professionals get consistent, comprehensive access to Q&A content regardless of which QAAQ platform they're using.