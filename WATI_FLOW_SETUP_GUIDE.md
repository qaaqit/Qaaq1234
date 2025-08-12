# WATI Flow Builder Setup for GrandMaster Maritime Bot

## Overview
This guide helps you set up the GrandMaster maritime bot rules in WATI Flow Builder. The system includes three main flows: Conversation, Technical Q&A, and Onboarding.

## Step 1: Basic Flow Structure Setup

### Main Entry Flow
1. **Flow Name**: "GrandMaster Maritime Bot"
2. **Trigger**: "Message Received"

### Flow Steps:

#### Step 1: Message Classification
**Condition Block**: Check message content
- **If message contains**: "hi", "hello", "namaste", "hey" → Go to **Greeting Flow**
- **If message ends with**: "?" AND length > 10 → Go to **Technical Flow**
- **If message contains**: "help", "/help" → Go to **Command Flow**
- **If message contains**: "koi hai", "nearby", "location" → Go to **Location Flow**
- **If message contains**: "emergency", "urgent", "accident" → Go to **Emergency Flow**
- **Else** → Go to **Unclear Message Flow**

## Step 2: Create Individual Flows

### A. Greeting Flow
```
Send Message:
"Hello {{contact.name}}! 👋

I'm QBOT, your maritime technical assistant. How can I help you today?

• Ask any marine engineering question ending with "?"
• Type "help" for available commands
• Say "koi hai" to find nearby maritime professionals"
```

### B. Technical Flow
```
Step 1: Check Daily Limit
Condition: If daily_questions < (profile_complete ? 10 : 3)
- True → Continue to Step 2
- False → Send limit message

Step 2: Check Question Type
Condition: If message contains ("what is", "purpose of", "how does") 
AND NOT contains ("broken", "not working", "problem")
- True → Send clarification request
- False → Send direct AI response

Clarification Message:
"I want to give you the most helpful answer. Please clarify:

🔍 Are you asking about:
A) Definition/Theory - How it works, purpose, explanation
B) Troubleshooting - Solving a problem or issue

Reply A for theory or B for problem-solving.

Your question: '{{message.text}}'"

Wait for Response (10 minutes):
- If "A" → Send definition response
- If "B" → Send troubleshooting response
- Timeout → Send general response
```

### C. Command Flow
```
Condition: Check command type
If contains "help":
Send Message:
"🚢 QBOT Commands:

📋 Available Commands:
• Ask questions ending with "?" for technical help
• "koi hai" - Find nearby maritime professionals
• "profile" - View your profile status

💡 Tips:
• End technical questions with "?" for detailed answers
• Update your profile for more daily questions"
```

### D. Location Flow
```
Send Message:
"🌊 Nearby Maritime Professionals:

I'm working on connecting you with nearby seafarers. This feature will show:
• Officers in nearby ports
• Crew members in your area
• Maritime professionals nearby

Stay tuned for updates! 🚢"
```

### E. Emergency Flow
```
Send Message:
"🚨 EMERGENCY SUPPORT

For immediate emergency assistance:

🆘 Maritime Emergency:
• Contact Coast Guard immediately
• Use VHF Channel 16 for distress calls
• Alert nearby vessels

📞 Technical Support:
• Contact QAAQ emergency line
• I'll provide immediate guidance

What specific emergency are you facing?"

Add Tag: "emergency_alert"
Notify Team: Yes
```

### F. Onboarding Flow (for new contacts)
```
Step 1: Welcome Message
"🚢 Welcome to QAAQ - Maritime Professional Network!
I'm QBOT, your 24/7 maritime technical assistant.

Please share your full name for professional verification:
Example: "John Smith" or "राज कुमार""

Step 2: Wait for Name (5 minutes)
Save response as {{user_name}}

Step 3: Collect Rank
"What's your current maritime rank/position?

⚓ DECK OFFICERS:
- Master/Captain
- Chief Officer  
- Second Officer
- Third Officer
- Deck Cadet

🔧 ENGINE OFFICERS:
- Chief Engineer
- Second Engineer
- Third Engineer
- Fourth Engineer
- Engine Cadet

🏢 SHORE-BASED:
- Marine Superintendent
- Ship Manager
- Other Professional"

Step 4: Wait for Rank
Save response as {{maritime_rank}}

Step 5: Collect Company
"Which ship/company are you currently with?
Example: "MV Ocean Pioneer" or "Maersk Line""

Step 6: Welcome Complete
"🎉 Welcome aboard, {{user_name}}!

Your QAAQ profile is ready. You can now:
✅ Ask technical maritime questions
✅ Connect with professionals worldwide
✅ Access 24/7 expert assistance

Send any marine engineering question ending with "?" to get started!"
```

## Step 3: Variables Setup

Create these custom attributes in WATI:
1. **daily_questions** (Number) - Default: 0
2. **profile_complete** (Boolean) - Default: false
3. **maritime_rank** (Text)
4. **user_name** (Text)
5. **ship_company** (Text)
6. **last_question_date** (Date)

## Step 4: Webhook Configuration

### Webhook URL
```
https://your-replit-app.replit.app/api/wati/webhook
```

### Events to Enable
- ✅ Message Received
- ✅ New Contact Added
- ✅ Template Message Sent
- ✅ Message Delivered
- ✅ Template Message Failed

## Step 5: AI Integration Setup

### For Technical Responses:
Use WATI's AI feature or webhook to external AI service.

**Definition Prompt Template:**
```
You are a Marine Chief Engineer with 20+ years experience.

INSTRUCTION: Provide educational explanation for: {{message.text}}

REQUIREMENTS:
- Clear technical explanation
- Include purpose and function
- Use maritime engineering terminology
- Educational tone (150-200 words)
- NO troubleshooting advice

Question: {{message.text}}
```

**Troubleshooting Prompt Template:**
```
You are a Marine Chief Engineer providing troubleshooting guidance.

INSTRUCTION: Provide problem-solving advice for: {{message.text}}

REQUIREMENTS:
- Detailed diagnostic steps
- Practical and technically accurate
- Include specific technical details
- Safety considerations
- Clear reasoning for each step

Question: {{message.text}}
```

## Step 6: Tags and Automations

### Create Tags:
- **new_user** - For onboarding tracking
- **technical_question** - For Q&A analytics  
- **emergency_alert** - For urgent issues
- **daily_limit_reached** - For question limits
- **profile_incomplete** - For users needing profile completion

### Automation Rules:
1. **Daily Reset**: At midnight, reset daily_questions to 0
2. **Profile Check**: If maritime_rank is empty, set profile_complete = false
3. **Emergency Alert**: If tagged "emergency_alert", notify admin team

## Step 7: Testing Protocol

### Test Messages:
1. **Greeting**: "Hello"
2. **Technical Question**: "What is a turbocharger?"
3. **Ambiguous Question**: "How does a pump work?"
4. **Problem**: "Engine not starting?"
5. **Emergency**: "Emergency! Engine overheating!"
6. **Location**: "koi hai"
7. **Command**: "help"

### Expected Responses:
- Appropriate flow activation
- Correct message classification
- Proper variable updates
- Tag assignments

## Step 8: Analytics Setup

### Metrics to Track:
- Total messages processed
- Technical questions asked
- Daily limit usage
- Emergency alerts
- Onboarding completions
- Response times

### Reports to Create:
- Daily question volume
- User engagement by maritime rank
- Most common technical topics
- Emergency response times

## Step 9: Advanced Features

### A/B Testing:
- Test different clarification messages
- Compare definition vs troubleshooting response quality
- Optimize onboarding conversion rates

### Personalization:
- Use {{maritime_rank}} in responses
- Customize technical depth based on user level
- Location-based features for "koi hai" requests

## Step 10: Maintenance

### Weekly Tasks:
- Review analytics
- Update technical knowledge base
- Check webhook performance
- Test all flows

### Monthly Tasks:
- Analyze user feedback
- Update AI prompts
- Review emergency procedures
- Optimize flow performance

---

## Quick Setup Checklist

- [ ] Create main classification flow
- [ ] Set up all sub-flows (Greeting, Technical, etc.)
- [ ] Configure custom variables
- [ ] Set webhook URL
- [ ] Enable required events
- [ ] Create tags and automations
- [ ] Test all message types
- [ ] Set up analytics
- [ ] Train team on emergency procedures

## Support

For technical issues with the GrandMaster bot:
- Check webhook logs in Replit
- Verify WATI API connection
- Test individual flow components
- Review error handling

---

*Last Updated: August 12, 2025*
*Compatible with: WATI Flow Builder v2024*