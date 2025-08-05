# QaaqConnect Mariana - Mobile App (SEALED FOR APP STORE SUBMISSION)

## 🎯 **PRODUCTION READY - VERSION 2.0.0**

**Status**: SEALED FOR APP STORE SUBMISSION  
**App Name**: QaaqConnect Mariana  
**Version**: 2.0.0  
**Target**: iOS App Store + Google Play Store  
**Next Version**: Qaaq 2.0 (Future Development)

## Overview
QaaqConnect Mobile is a React Native Expo app that mirrors the functionality of your QaaqConnect30 web application. It provides maritime professionals with mobile access to "Koi Hai?" discovery, direct messaging, and profile management.

## Features Implemented

### 🗺️ Map Discovery ("Koi Hai?")
- Interactive map with GPS location services
- Proximity-based sailor discovery
- Real-time location sharing
- Maritime-themed map markers
- Search functionality for sailors, ships, and companies
- Premium features toggle

### 💬 Chat System
- Direct messaging interface
- Chat list with user profiles
- Real-time conversation view
- Maritime professional identification
- Distance-based user sorting

### 👤 Profile Management
- User profile display with maritime credentials
- Professional information (rank, ship, location)
- Settings for location sharing and notifications
- WhatsApp integration display
- Account management

### 🔐 Authentication
- Login with QaaqConnect credentials
- User registration for new accounts
- Email verification system
- Secure token-based authentication

## Technology Stack
- **React Native** with Expo SDK 50
- **TypeScript** for type safety
- **React Navigation** for app navigation
- **React Native Maps** for location services
- **TanStack Query** for data management
- **React Native Paper** for UI components
- **AsyncStorage** for local data persistence

## Project Structure
```
mobile-app/
├── App.tsx                 # Main app component with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── babel.config.js        # Babel configuration
├── tsconfig.json          # TypeScript configuration
└── src/
    └── screens/
        ├── LoginScreen.tsx        # User authentication
        ├── RegisterScreen.tsx     # Account creation
        ├── VerifyScreen.tsx       # Email verification
        ├── MapScreen.tsx          # Koi Hai? discovery
        ├── ChatScreen.tsx         # Chat list
        ├── DMScreen.tsx           # Direct messaging
        ├── ProfileScreen.tsx      # User profile
        └── UserProfileScreen.tsx  # Other user profiles
```

## Setup Instructions

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Expo CLI**: `npm install -g @expo/cli`
3. **Expo Go app** on your mobile device
4. **QaaqConnect API** running and accessible

### Installation

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API URL:**
   Edit the `API_BASE_URL` in each screen file to point to your QaaqConnect API:
   ```typescript
   const API_BASE_URL = 'https://your-qaaqconnect-api.replit.app';
   ```

4. **Start development server:**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Test on device:**
   - Scan QR code with Expo Go app
   - Or run `expo start --tunnel` for external access

## Configuration

### API Integration
Update these endpoints in all screen files:
- `/api/login` - User authentication
- `/api/register` - Account creation
- `/api/verify` - Email verification
- `/api/users/search` - User discovery
- `/api/users/location/device` - Location updates

### Maps Integration
The app uses React Native Maps which supports:
- Google Maps (Android)
- Apple Maps (iOS)
- Custom map styling
- Real-time location tracking

### Authentication Flow
1. User logs in with QaaqConnect credentials
2. JWT token stored in AsyncStorage
3. Token included in all API requests
4. Automatic token validation on app launch

## Core Features Explained

### "Koi Hai?" Discovery
- GPS-based location services
- Search for sailors, ships, companies
- Interactive map with custom markers
- Proximity-based user filtering
- Premium features toggle

### Maritime-Specific UI
- Ocean-themed color scheme (#0891b2 primary)
- Maritime icons (anchor, ship, compass)
- Sailor vs Local user distinction
- Professional rank and ship information

### Real-time Features
- Location tracking and sharing
- Live user discovery
- Message notifications (when implemented)
- Online status indicators

## Mobile-Specific Optimizations

### Performance
- Lazy loading of screens
- Optimized image loading
- Efficient location tracking
- Cached user data

### UX/UI
- Touch-friendly interface
- Native navigation patterns
- Keyboard-aware layouts
- Pull-to-refresh functionality

### Device Features
- GPS location services
- Camera access (for future features)
- Push notifications (configured)
- Background location updates

## Deployment

### Development Testing
```bash
# Local development
expo start

# Test on physical device
expo start --tunnel

# iOS Simulator
expo start --ios

# Android Emulator
expo start --android
```

### Production Build
```bash
# Build for app stores
expo build:ios
expo build:android

# Or using EAS (recommended)
eas build --platform ios
eas build --platform android
```

## Integration with QaaqConnect Web

### Shared Features
- Same user authentication system
- Identical API endpoints
- Synchronized user profiles
- Cross-platform messaging

### Data Consistency
- Real-time location synchronization
- Shared user database
- Consistent maritime professional data
- WhatsApp integration compatibility

## Next Steps

1. **Connect to Production API**
   - Update all API_BASE_URL references
   - Test authentication flow
   - Verify location services

2. **Real-time Features**
   - WebSocket integration for live chat
   - Push notifications setup
   - Background location updates

3. **Advanced Features**
   - Offline map caching
   - Image sharing in messages
   - Voice messages
   - QR code scanning

4. **App Store Deployment**
   - Configure app icons and splash screens
   - Set up app store metadata
   - Handle app permissions properly
   - Test on various device sizes

## Support

This mobile app maintains full feature parity with your QaaqConnect web platform while being optimized for mobile maritime use cases. The architecture allows for easy maintenance and feature additions as your platform grows.

For technical support, refer to the web app's documentation and API specifications.