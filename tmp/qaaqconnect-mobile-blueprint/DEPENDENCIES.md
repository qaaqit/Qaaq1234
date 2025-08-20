# 📦 Required Dependencies

## Mobile App Dependencies

Add these to your `mobile-app/package.json`:

```json
{
  "dependencies": {
    "@expo/vector-icons": "^14.0.4",
    "@react-navigation/bottom-tabs": "^7.1.6", 
    "@react-navigation/native": "^7.0.15",
    "@react-navigation/stack": "^7.1.2",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@tanstack/react-query": "^5.61.3",
    "expo": "~53.0.27",
    "expo-location": "~18.0.3",
    "expo-linear-gradient": "~13.0.2",
    "expo-camera": "~15.0.16",
    "expo-image-picker": "~15.0.7",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-maps": "1.18.0",
    "react-native-paper": "^5.13.0",
    "react-native-reanimated": "~3.16.3",
    "react-native-safe-area-context": "~4.12.0",
    "react-native-screens": "~4.1.0",
    "react-native-svg": "~15.8.0",
    "react-native-vector-icons": "^10.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.26.0",
    "@types/react": "~18.3.12",
    "@types/react-native": "^0.76.0",
    "typescript": "^5.7.2"
  }
}
```

## Installation Commands

```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install --legacy-peer-deps

# For iOS (if needed)
cd ios && pod install && cd ..

# Start development server
expo start
```

## Production API Configuration

Update your API configuration in `mobile-app/src/config/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' 
  : 'https://mushypiyush-workspace.replit.app';

export { API_BASE_URL };
```

## Android Permissions

Add to `mobile-app/app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION", 
        "CAMERA",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## iOS Permissions

Add to `mobile-app/app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "QaaqConnect uses location to help you find nearby sailors and maritime professionals.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "QaaqConnect uses location to help you find nearby sailors and maritime professionals.",
        "NSCameraUsageDescription": "QaaqConnect uses camera to take profile pictures and scan QR codes."
      }
    }
  }
}
```

## Google Maps Setup

For React Native Maps, you'll need to configure API keys:

1. **Android**: Add to `android/app/src/main/AndroidManifest.xml`
2. **iOS**: Add to `ios/YourApp/AppDelegate.m`

Follow React Native Maps documentation for detailed setup.