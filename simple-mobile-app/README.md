# QaaqConnect Simple Mobile App

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the app:
```bash
npx expo start
```

3. Scan the QR code with Expo Go app on your phone

## Features

- Replit Authentication integration ready
- Multi-AI Chat (ChatGPT, Gemini, Deepseek)
- Maritime professional theme (orange/cream/white)
- Clean and simple UI

## Configuration

To connect to your backend:
1. Update the API URL in `src/ChatScreen.tsx`
2. Configure Replit OAuth in `src/AuthScreen.tsx`

## Project Structure

```
├── App.tsx              # Main app entry
├── src/
│   ├── AuthScreen.tsx   # Replit auth landing
│   └── ChatScreen.tsx   # Multi-AI chat interface
├── assets/              # App icons and splash
├── app.json            # Expo configuration
└── package.json        # Dependencies
```