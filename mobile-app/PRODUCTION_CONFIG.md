# QaaqConnect Mobile App - Production Configuration

## Production API URL Configuration ✅

The mobile app has been configured with the production Replit API URL for Play Store deployment.

### API Configuration Files Updated

1. **`src/utils/api.ts`** - Main API client
2. **`src/config/api.ts`** - API configuration constants  
3. **`src/screens/MapScreen.tsx`** - Map screen API calls

### Production URL
```
https://mushypiyush-workspace.replit.app
```

### Environment Detection
The app automatically detects the environment:
- **Development** (`__DEV__ = true`): Uses `http://localhost:5000`
- **Production** (`__DEV__ = false`): Uses `https://mushypiyush-workspace.replit.app`

### API Endpoints Available
- `/api/auth/login` - User authentication
- `/api/auth/user` - Current user profile
- `/api/users/search` - Search maritime professionals
- `/api/users/location/device` - Update device location
- `/api/qbot/chat` - QBOT AI chat interface
- `/api/questions` - Channel 13 Q&A system
- `/api/groups` - Groups and CPSS Navigator
- `/api/chats` - Direct messaging system

### Production Build Commands

#### For Google Play Store
```bash
cd mobile-app
npm install --legacy-peer-deps
eas build --platform android --profile production
```

#### For Apple App Store
```bash
cd mobile-app
npm install --legacy-peer-deps
eas build --platform ios --profile production
```

### Environment Variables (If Needed)
If you need to override the API URL at build time:
```bash
export API_BASE_URL="https://mushypiyush-workspace.replit.app"
```

### Testing Production Configuration
To test the production API URL in development:
1. Temporarily set `__DEV__` to `false` in the code
2. Or modify the development URL to point to production
3. Test all API calls work correctly

### Play Store Deployment Ready ✅
The mobile app is now configured with the correct production API URL and ready for:
- Google Play Console upload
- Internal testing distribution
- Production release to users

All API calls will now properly connect to the live Replit backend service when the app is deployed to production.