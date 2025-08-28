#!/bin/bash

echo "🚢 QAAQ Daughter App - Direct WhatsApp Bot Startup"
echo "=================================================="
echo ""
echo "🚀 Starting WhatsApp Bot (+905363694997)..."
echo ""
echo "📋 Bot Configuration:"
echo "- Bot Number: +905363694997"
echo "- Client ID: qaaq-direct-bot-905363694997" 
echo "- Session Type: Auto-restore LocalAuth"
echo "- All 15 QBOT Commandments: ACTIVE"
echo ""

# Check if session exists
if [ -d "./whatsapp-session" ]; then
    echo "✅ Session found - Auto-restore mode enabled"
    echo "🔄 Bot will connect automatically without QR scan"
else
    echo "⚠️  First time setup - QR code will be displayed"
    echo "📱 Please prepare WhatsApp +905363694997 for QR code scanning"
    echo ""
    echo "📋 Setup Instructions:"
    echo "1. Open WhatsApp on phone +905363694997"
    echo "2. Go to Settings > Linked Devices"
    echo "3. Tap 'Link a Device'"
    echo "4. Scan the QR code that will appear below"
    echo "5. Session will be saved for future auto-restore"
fi

echo ""
echo "🔥 QBOT 15 Commandments Status:"
echo "✅ I - AI Intelligence Processing"
echo "✅ II - Never Repeat Messages" 
echo "✅ III - Direct Technical Responses"
echo "✅ IV - Preserve Ship Names Exactly"
echo "✅ V - 24/7 Availability"
echo "✅ VI - Location Collection Precision"
echo "✅ VII - Reply Only, Never Broadcast"
echo "✅ VIII - Intelligent Image Processing"
echo "✅ IX - Unlimited Assistance"
echo "✅ X - Intelligent Response to All Input"
echo "✅ XI - Never Delay Response"
echo "✅ XII - WhatsApp Profile Intelligence"
echo "✅ XIII - Technical Camouflage Mastery"
echo "✅ XIV - Standard Introduction"
echo "✅ XV - Maritime Rank Recognition"
echo ""

if [ ! -d "./whatsapp-session" ]; then
    echo "📱 Scan QR with WhatsApp +905363694997"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "- Make sure WhatsApp +905363694997 is active"
    echo "- Check internet connection"
    echo "- QR code expires in 20 seconds, will regenerate automatically"
fi

echo ""
echo "🚀 Starting QAAQ Direct WhatsApp Bot..."
echo ""

# Start the bot
NODE_ENV=development npm run dev