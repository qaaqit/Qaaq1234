# QaaqConnect Mobile App - Local Development Commands

## Directory Structure
```
project-root/
├── server/          # Backend Express.js server
├── mobile-app/      # React Native Expo mobile app
├── client/          # Web frontend
└── shared/          # Shared schemas
```

## Running the Mobile App Locally

### Step 1: Start the Backend Server
```bash
# In the project root directory
npm run dev
```
This starts the backend server on `http://localhost:5000`

### Step 2: Start the Mobile App
```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies (if not already installed)
npm install --legacy-peer-deps

# Start the Expo development server
npx expo start
```

### Alternative Mobile App Start Commands
```bash
# Start with development client
npm run dev

# Start with specific options
npm run start

# Start with Expo Go
npx expo start --go

# Start with development build
npx expo start --dev-client

# Start with tunnel for external access
npx expo start --tunnel
```

## Testing the Local Connection

### Backend Status Check
```bash
# Test if backend is running
curl http://localhost:5000/api/users/search
```

### Mobile App Configuration
The mobile app is configured to automatically use localhost in development:
- **Development**: `http://localhost:5000`
- **Production**: `https://qaaqconnect.replit.app` (placeholder)

## Running Both Together

### Terminal 1 (Backend)
```bash
# In project root
npm run dev
```

### Terminal 2 (Mobile App)  
```bash
# In mobile-app directory
cd mobile-app
npx expo start
```

## Expo Development Options

When you run `npx expo start`, you'll see options:
- **Press `a`**: Open on Android device/emulator
- **Press `i`**: Open on iOS simulator
- **Press `w`**: Open in web browser
- **Press `r`**: Reload app
- **Press `m`**: Toggle menu

## Device Testing

### Android Device
1. Install Expo Go app from Play Store
2. Scan QR code from terminal
3. App will load with localhost backend connection

### iOS Device
1. Install Expo Go app from App Store
2. Scan QR code from terminal
3. App will load with localhost backend connection

## Important Notes

- **Backend must be running first** on port 5000
- Mobile app automatically detects `__DEV__` mode and uses localhost
- All 960+ maritime users will be loaded from your PostgreSQL database
- Real-time location and mapping features work in development
- QBOT chat and all features are fully functional locally

## Troubleshooting

### Backend not connecting
```bash
# Check if backend is running
curl http://localhost:5000/api/users/search
```

### Mobile app dependencies
```bash
cd mobile-app
npm install --legacy-peer-deps
```

### Expo cache issues
```bash
cd mobile-app
npx expo start --clear
```

## Development Workflow

1. **Start Backend**: `npm run dev` (in root)
2. **Start Mobile**: `cd mobile-app && npx expo start`
3. **Test on Device**: Scan QR code with Expo Go
4. **Make Changes**: Files auto-reload in both backend and mobile app
5. **Debug**: Use browser dev tools for backend, Expo dev tools for mobile