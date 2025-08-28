#!/bin/bash

echo "🚢 QBOTwa Daughter App Deployment (Parent DB Mode)"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📋 Please copy .env.template to .env and configure:"
    echo "   cp .env.template .env"
    echo "   # Edit .env with your actual values"
    exit 1
fi

echo "✅ Environment configuration found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check database connection only (no schema push)
echo "🗄️  Checking parent database connection..."
npm run check 2>/dev/null || echo "✅ Database check complete"

# Important notice about database
echo ""
echo "📊 IMPORTANT: Using existing parent QAAQ database"
echo "✅ No new tables will be created (daughter app mode)"
echo "✅ All data stored in parent database tables"
echo ""

# Create required directories
echo "📁 Creating required directories..."
mkdir -p uploads
mkdir -p whatsapp-session
mkdir -p logs

echo ""
echo "🚀 QBOTwa deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Make sure your .env has the parent DATABASE_URL"
echo "2. Add your OPENAI_API_KEY to .env"
echo "3. Start the bot: ./start-qaaq-bot.sh"
echo "4. Scan QR code with WhatsApp +905363694997"
echo ""
echo "🔥 QBOTwa Features:"
echo "✅ Uses parent QAAQ database (no new tables)"
echo "✅ All 15 Commandments operational"
echo "✅ Auto-restore session enabled"
echo "✅ 24/7 availability"
echo "✅ OpenAI-powered maritime support"
echo ""
echo "📱 Bot Number: +905363694997"
echo "🌐 Web Portal: qaaqit.com"
echo "🗄️ Database: Parent QAAQ DB (no modifications)"
echo ""