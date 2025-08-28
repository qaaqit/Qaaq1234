# 🚢 QBOTwa Installation Guide
## QAAQ Daughter App WhatsApp Bot (+905363694997)

### ✅ Installation Complete!

Your QBOTwa WhatsApp Bot has been successfully installed and configured. Here's how to get started:

---

## 🚀 Quick Start

### 1. Set Up Environment Variables
```bash
# Copy the template and configure
cp .env.template .env

# Edit .env file and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-actual-openai-key-here
```

### 2. Run Deployment Script
```bash
# Execute the automated deployment
./deploy.sh
```

### 3. Start QBOTwa
```bash
# Launch the WhatsApp Bot
./start-qaaq-bot.sh
```

---

## 📱 WhatsApp QR Code Setup

### First-Time Setup:
1. **When you run `./start-qaaq-bot.sh`, a QR code will appear in the console**
2. **Open WhatsApp on phone +905363694997**
3. **Go to Settings → Linked Devices → Link a Device**
4. **Scan the QR code displayed in the console**
5. **Session will be permanently saved in `./whatsapp-session`**

### Future Starts:
- No QR code needed - auto-connects using saved session
- If session expires, delete `./whatsapp-session` folder and scan again

---

## 🔥 All 15 QBOT Commandments Active

✅ **Commandment I** - AI Intelligence Processing
✅ **Commandment II** - Never Repeat Messages  
✅ **Commandment III** - Direct Technical Responses
✅ **Commandment IV** - Preserve Ship Names Exactly
✅ **Commandment V** - 24/7 Availability
✅ **Commandment VI** - Location Collection Precision
✅ **Commandment VII** - Reply Only, Never Broadcast
✅ **Commandment VIII** - Intelligent Image Processing
✅ **Commandment IX** - Unlimited Assistance
✅ **Commandment X** - Intelligent Response to All Input
✅ **Commandment XI** - Never Delay Response
✅ **Commandment XII** - WhatsApp Profile Intelligence
✅ **Commandment XIII** - Technical Camouflage Mastery
✅ **Commandment XIV** - Standard Introduction
✅ **Commandment XV** - Maritime Rank Recognition

---

## 🛠️ API Endpoints

### Check Bot Status
```bash
curl http://localhost:5000/api/qbotwa-status
```

### Start Bot Programmatically
```bash
curl -X POST http://localhost:5000/api/qbotwa-start
```

### Stop Bot
```bash
curl -X POST http://localhost:5000/api/qbotwa-stop
```

---

## 📋 Testing the Bot

### Test Message Flow:
1. **Send a test message to +905363694997**
2. **Bot will respond with onboarding if new user**
3. **Complete the 5-step profile:**
   - Name & Surname
   - Maritime Rank
   - Email Address
   - Last Ship Name
   - Last Company

### Test Question:
```
"What causes main engine turbocharger surging?"
```

Expected: AI-powered technical response about turbocharger issues

---

## 🔧 Troubleshooting

### QR Code Not Appearing:
```bash
# Clear session and restart
rm -rf ./whatsapp-session
./start-qaaq-bot.sh
```

### Bot Not Responding:
```bash
# Check bot status
curl http://localhost:5000/api/qbotwa-status

# Restart bot
./start-qaaq-bot.sh
```

### Session Expired:
```bash
# Remove old session
rm -rf ./whatsapp-session

# Start fresh with new QR scan
./start-qaaq-bot.sh
```

---

## 📊 Features Overview

### User Management:
- Auto-creates users from WhatsApp numbers
- Collects complete maritime profiles
- Stores conversation history

### AI Integration:
- OpenAI GPT-4 powered responses
- Maritime engineering expertise
- Image analysis with Vision API

### WhatsApp Features:
- Permanent session storage
- Auto-reconnect capability
- Message queue handling
- Error recovery

---

## 🌊 Maritime Professional Usage

Once active, maritime professionals can:
- **Ask technical questions** ending with '?'
- **Share equipment photos** for analysis
- **Get 24/7 support** without limits
- **Complete maritime profiles** automatically
- **Access QAAQ web portal** at qaaqit.com

---

## 📞 Contact Information

**Bot Number**: +905363694997  
**Web Portal**: https://qaaqit.com  
**Status Check**: Send "status" to bot  
**Test Message**: Send any question ending with '?'  

---

## ⚡ Important Notes

1. **OpenAI API Key Required** - Bot won't work without valid API key
2. **Database Connection** - Uses existing PostgreSQL database
3. **Port 5000** - Make sure port is available
4. **Session Persistence** - Never delete `./whatsapp-session` unless troubleshooting
5. **24/7 Operation** - Bot designed to run continuously

---

## 🎯 Next Steps

1. **Configure .env file** with your OpenAI API key
2. **Run `./deploy.sh`** to set up the environment
3. **Execute `./start-qaaq-bot.sh`** to start the bot
4. **Scan QR code** with WhatsApp +905363694997
5. **Test the bot** by sending a maritime question

---

**🚢 QBOTwa is ready to serve maritime professionals 24/7!**  
**📱 WhatsApp: +905363694997**  
**🔥 All 15 Commandments: ACTIVE**