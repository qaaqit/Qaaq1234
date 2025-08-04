# QaaqConnect Mobile App - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd mobile-app
npm install
```

### Step 2: Update API Configuration
Replace `https://your-qaaqconnect-api.replit.app` with your actual API URL in these files:
- `src/screens/LoginScreen.tsx`
- `src/screens/RegisterScreen.tsx`
- `src/screens/VerifyScreen.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/ChatScreen.tsx`
- `src/screens/UserProfileScreen.tsx`

### Step 3: Start Development Server
```bash
npm start
```

### Step 4: Test on Your Phone
1. Install **Expo Go** from App Store/Play Store
2. Scan the QR code from your terminal
3. Test login with your QaaqConnect credentials

## 📱 App Features Overview

### Main Screens
1. **Login/Register** - QaaqConnect authentication
2. **Koi Hai? Map** - GPS-powered sailor discovery
3. **Chat** - Direct messaging with maritime professionals
4. **Profile** - User profile and settings

### Key Functionality
- ✅ GPS location sharing
- ✅ Maritime professional discovery
- ✅ Real-time messaging interface
- ✅ Professional profiles with rank/ship info
- ✅ WhatsApp integration display
- ✅ Settings for privacy and notifications

## 🔧 Configuration Notes

### API Endpoints Used
- `POST /api/login` - User authentication
- `POST /api/register` - New account creation
- `POST /api/verify` - Email verification
- `GET /api/users/search` - Find nearby users
- `POST /api/users/location/device` - Update GPS location

### Required Permissions
- **Location** - For "Koi Hai?" discovery
- **Camera** - For profile pictures (future)
- **Notifications** - For message alerts

### Environment Setup
The app is configured to work with:
- Your existing QaaqConnect PostgreSQL database
- JWT authentication system
- WhatsApp bot integration
- Google Maps API

## 🎨 UI/UX Highlights

### Maritime Theme
- Ocean blue color scheme (#0891b2)
- Maritime icons (anchor, ship, compass)
- Professional sailor vs local distinction
- Touch-optimized interface

### Mobile Optimizations
- Pull-to-refresh lists
- Keyboard-aware forms
- Native navigation patterns
- Optimized for one-handed use

## 🚀 Deployment Options

### Development (Recommended)
```bash
expo start --tunnel  # For external testing
```

### Production
```bash
# Build APK for Android
expo build:android

# Build IPA for iOS
expo build:ios
```

## 📋 Testing Checklist

- [ ] Login with existing QaaqConnect account
- [ ] GPS location permission granted
- [ ] Map shows nearby users
- [ ] Search functionality works
- [ ] Profile displays correctly
- [ ] Chat interface loads
- [ ] Logout and re-login works

## 🔗 Integration Status

### Connected to QaaqConnect Web
- ✅ Same user authentication
- ✅ Shared user database
- ✅ Consistent API endpoints
- ✅ Maritime professional data

### Next Steps
- Connect WebSocket for real-time chat
- Add push notifications
- Implement offline capabilities
- Add image sharing in messages

## 📞 Support

If you encounter issues:
1. Check API URL configuration
2. Verify internet connection
3. Ensure QaaqConnect API is running
4. Test on different devices/networks

The mobile app is designed to be a 1:1 feature match with your web application, optimized for mobile maritime use cases.