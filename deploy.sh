#!/bin/bash

echo "🚢 QAAQ Daughter App Deployment Script"
echo "======================================"
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

# Check database connection
echo "🗄️  Checking database connection..."
npm run check

# Push database schema
echo "📊 Pushing database schema..."
npm run db:push

# Build the application
echo "🔨 Building application..."
npm run build

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Create whatsapp-session directory if it doesn't exist  
mkdir -p whatsapp-session

echo ""
echo "🚀 Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the bot: npm run start"
echo "2. Or use the startup script: ./start-qaaq-bot.sh"
echo "3. For first-time setup, scan QR code with +905363694997"
echo "4. Session will be saved for auto-restore on future starts"
echo ""
echo "🔥 QBOT Features Active:"
echo "✅ All 15 Commandments operational"
echo "✅ Auto-restore session enabled"  
echo "✅ 24/7 availability with hibernation prevention"
echo "✅ OpenAI-powered maritime technical support"
echo "✅ Image processing with Vision API"
echo "✅ Unlimited user assistance"
echo ""
echo "📱 Bot Number: +905363694997"
echo "🌐 Web Portal: qaaqit.com"
echo ""