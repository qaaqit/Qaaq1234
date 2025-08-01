# QaaqConnect Mobile App

## Overview
QaaqConnect Mobile is the React Native version of the maritime networking platform, designed for iOS and Android devices. It enables sailors to discover nearby peers, join maritime groups, and communicate while on shore leave.

## Key Features
- **Koi Hai? Discovery**: Find nearby sailors using GPS location
- **Maritime Groups**: Connect with 9 professional maritime groups (TSI, MSI, etc.)
- **Direct Messaging**: Chat with nearby maritime professionals
- **Location-based Networking**: Real-time proximity-based user discovery

## Technology Stack
- **React Native** with Expo framework
- **React Navigation** for app navigation
- **React Native Maps** for location services
- **Expo Location** for GPS functionality
- **TypeScript** for type safety

## Development Setup

### Prerequisites
1. Install Expo Go app on your phone
2. Create a Replit account
3. Access to QaaqConnect backend API

### Quick Start
1. Clone or remix this Expo template
2. Run `npm install` to install dependencies
3. Run `expo start` to start development server
4. Scan QR code with Expo Go app to preview

### Project Structure
```
mobile-app/
├── App.tsx                 # Main app component with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── src/
│   └── screens/
│       ├── MapScreen.tsx      # Koi Hai? discovery map
│       ├── GroupsScreen.tsx   # Maritime groups interface
│       ├── DMScreen.tsx       # Direct messaging
│       └── ProfileScreen.tsx  # User profile & settings
└── assets/                # App icons and images
```

## Key Components

### MapScreen (Koi Hai?)
- GPS location services
- React Native Maps integration
- Proximity-based user search
- Maritime-themed map markers

### GroupsScreen (Ch16 Groups)
- 9 maritime professional groups
- Member count and status display
- Group chat navigation
- Maritime role-based categorization

### DMScreen (Direct Messages)
- Real-time messaging interface
- Distance-based user sorting
- Online status indicators
- Maritime professional profiles

### ProfileScreen
- User profile management
- Privacy settings
- Location sharing controls
- Maritime credentials display

## Maritime-Specific Features

### User Types
- **Sailors**: Maritime professionals with rank, ship, and company info
- **Locals**: Port agents, suppliers, and local services

### Location Features
- Ship-to-shore location plotting
- Port-based user clustering
- Offline map caching for remote areas
- Battery-optimized location tracking

### Professional Groups
1. **TSI** - Training Ship Instructors
2. **MSI** - Marine Safety Instructors  
3. **Mtr CO** - Motor Chief Officers
4. **20 30** - 2nd & 3rd Officers
5. **CE 2E** - Chief & 2nd Engineers
6. **3E 4E** - 3rd & 4th Engineers
7. **Cadets** - Maritime Cadets
8. **Crew** - Ship Crew Members
9. **ETO & Elec Supdts** - Electrical Officers & Superintendents

## Integration with QaaqConnect Web

### Shared Backend
- Same PostgreSQL database as web version
- JWT authentication compatibility
- Unified user profiles and messaging

### API Endpoints
- `/api/users/search` - User discovery
- `/api/groups` - Maritime groups
- `/api/messages` - Direct messaging
- `/api/auth` - Authentication

## Deployment

### Development Testing
- Use Expo Go app for instant testing
- QR code deployment for development builds
- Hot reload for rapid iteration

### Production Deployment
- Build with EAS (Expo Application Services)
- Generate signed APK/AAB for Google Play Store
- Configure app store metadata and screenshots

## Next Steps
1. Connect to production QaaqConnect API
2. Implement real-time messaging with WebSocket
3. Add push notifications for messages
4. Integrate with WhatsApp for external communication
5. Add offline support for poor connectivity areas

## Support
For technical support or maritime-specific feature requests, contact the QaaqConnect development team.