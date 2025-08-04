# QaaqConnect Mobile App - Deployment Guide

## Development Deployment (Immediate Use)

### Option 1: Expo Go (Recommended for Testing)
```bash
cd mobile-app
npm install
npm start
```
- Scan QR code with Expo Go app
- Instant testing on your device
- Hot reload for development

### Option 2: Expo Development Build
```bash
npx create-expo-app --template
expo install expo-dev-client
expo run:android # or expo run:ios
```

## Production Deployment

### Prerequisites
1. **Expo Account**: Create at https://expo.dev
2. **EAS CLI**: `npm install -g eas-cli`
3. **App Store Accounts**: Apple Developer + Google Play Console

### Step 1: Configure EAS
```bash
eas login
eas build:configure
```

### Step 2: Build for App Stores
```bash
# Build for both platforms
eas build --platform all

# Or build individually
eas build --platform ios
eas build --platform android
```

### Step 3: Submit to App Stores
```bash
eas submit --platform ios
eas submit --platform android
```

## Configuration Files

### app.json Updates for Production
```json
{
  "expo": {
    "name": "QaaqConnect",
    "slug": "qaaqconnect-mobile",
    "version": "2.0.0",
    "bundleIdentifier": "com.qaaq.connect",
    "androidPackage": "com.qaaq.connect"
  }
}
```

### Required Assets
Place these in `mobile-app/assets/`:
- `icon.png` (1024x1024) - App icon
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `splash.png` (1242x2436) - Splash screen
- `favicon.png` (48x48) - Web favicon

## API Configuration for Production

### Update API URLs
In each screen file, replace:
```typescript
const API_BASE_URL = 'https://your-production-api.com';
```

### Environment Variables (Optional)
Create `mobile-app/.env`:
```
EXPO_PUBLIC_API_URL=https://your-production-api.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## App Store Requirements

### iOS App Store
- **Bundle ID**: com.qaaq.connect
- **App Name**: QaaqConnect
- **Category**: Business/Productivity
- **Privacy Policy**: Required for location services
- **App Description**: Maritime networking platform

### Google Play Store
- **Package Name**: com.qaaq.connect
- **App Name**: QaaqConnect
- **Category**: Business
- **Content Rating**: Everyone
- **Privacy Policy**: Required

## Permissions Setup

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>QaaqConnect uses location to help you find nearby sailors</string>
<key>NSCameraUsageDescription</key>
<string>QaaqConnect uses camera for profile pictures</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

## Testing Before Production

### Pre-deployment Checklist
- [ ] All API endpoints work with production server
- [ ] Location services work on physical devices
- [ ] Authentication flow complete
- [ ] Maps display correctly
- [ ] Chat interface functional
- [ ] App icons and splash screen configured
- [ ] App permissions properly requested
- [ ] Performance tested on low-end devices

### Device Testing
Test on various devices:
- iPhone (iOS 14+)
- Android phones (Android 8+)
- Different screen sizes
- Different network conditions

## Post-deployment

### Analytics (Optional)
Add Expo Analytics:
```bash
expo install expo-analytics-amplitude
```

### Crash Reporting
Add Sentry:
```bash
expo install @sentry/react-native
```

### Push Notifications
Setup with Expo Notifications:
```bash
expo install expo-notifications
```

## Maintenance

### Regular Updates
- Update Expo SDK quarterly
- Monitor app store reviews
- Update dependencies monthly
- Test on new iOS/Android versions

### Feature Deployment
- Use EAS Update for over-the-air updates
- A/B test new features
- Monitor performance metrics

This deployment guide ensures your QaaqConnect mobile app reaches production successfully while maintaining the quality and reliability your maritime users expect.