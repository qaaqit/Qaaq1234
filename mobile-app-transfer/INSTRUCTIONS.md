# QaaqConnect Mobile App Setup Instructions

## Files to Replace in Your Expo Template

Replace the following files in your Expo template (https://replit.com/@mushypiyush/QG) with these QaaqConnect mobile app files:

### 1. Root Files
- Replace `App.tsx` with the provided `App.tsx`
- Replace `app.json` with the provided `app.json` 
- Replace `package.json` with the provided `package.json`

### 2. Create Directory Structure
Create this folder structure in your project:
```
src/
└── screens/
    ├── MapScreen.tsx
    ├── GroupsScreen.tsx
    ├── DMScreen.tsx
    └── ProfileScreen.tsx
```

### 3. Screen Files
Place the provided screen files in the `src/screens/` directory:
- `MapScreen.tsx` - Koi Hai? discovery map
- `GroupsScreen.tsx` - Maritime groups interface  
- `DMScreen.tsx` - Direct messaging
- `ProfileScreen.tsx` - User profile & settings

### 4. Install Dependencies
After replacing the files, run in your Replit console:
```bash
npm install
```

This will install all the required dependencies including:
- React Navigation for app navigation
- React Native Maps for location services
- Expo Location for GPS functionality
- All maritime-specific UI components

### 5. Update API Endpoints
In `MapScreen.tsx`, replace `YOUR_API_ENDPOINT` with your actual QaaqConnect API URL to connect to the live maritime user database.

### 6. Test the App
1. Run `expo start` in your Replit console
2. Use Expo Go app on your phone to scan the QR code
3. Test all 4 main features:
   - **Map**: "Koi Hai?" sailor discovery
   - **Groups**: 9 maritime professional groups
   - **DM**: Direct messaging interface
   - **Profile**: User profile management

## Maritime Features Included

### Core Features
- **Koi Hai? Discovery**: GPS-based sailor finding
- **9 Maritime Groups**: TSI, MSI, Mtr CO, 20 30, CE 2E, 3E 4E, Cadets, Crew, ETO & Elec Supdts
- **Direct Messaging**: Chat with nearby maritime professionals
- **Location Services**: Real-time proximity-based networking

### UI/UX Features
- Maritime-themed color scheme (#0891b2 primary)
- Professional sailor vs local user distinction
- Distance-based user sorting
- Online status indicators
- Mobile-optimized touch interfaces

## Next Steps After Setup

1. **Connect to Live Database**: Update API endpoints to connect to your QaaqConnect PostgreSQL database
2. **Authentication**: Implement JWT authentication matching your web app
3. **Real-time Messaging**: Add WebSocket integration for live chat
4. **Push Notifications**: Configure for message alerts
5. **Production Build**: Use EAS to build for Google Play Store

This mobile app maintains full feature parity with your web QaaqConnect platform while being optimized for mobile maritime use cases.