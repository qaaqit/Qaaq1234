#!/bin/bash

echo "🚀 QaaqConnect Mobile App Startup Script"
echo "========================================"

# Navigate to mobile app directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Check if expo is available
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI globally..."
    npm install -g @expo/cli@latest
fi

# Clear Metro cache
echo "🧹 Clearing Metro cache..."
npx expo start --clear

echo "🎯 Mobile app starting..."
echo "📱 Scan the QR code with Expo Go app on your phone"
echo "🌐 Or press 'w' to open in web browser"