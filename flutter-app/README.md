# QaaqConnect Flutter App

A Flutter mobile application that mirrors the exact functionality of the QaaqConnect web platform - a maritime professional discovery platform featuring "Koi Hai?" GPS-powered location sharing, direct messaging, and professional networking for seafarers.

## Features

### 🧭 Core Functionality
- **"Koi Hai?" Discovery**: GPS-powered location sharing to find nearby maritime professionals
- **Interactive Maps**: Google Maps integration with custom maritime theme
- **User Search**: Search by sailors, ships, or companies
- **Real-time Location**: Device location updates with server synchronization

### 👤 User Management  
- **Authentication**: Login with email/phone number and password
- **Profile Management**: Complete maritime professional profiles
- **User Types**: Sailors and Local users with different UI treatments
- **Admin Features**: Special admin user interface and privileges

### 💬 Communication (Coming Soon)
- **Direct Messaging**: Chat with fellow maritime professionals
- **User Discovery**: Find and connect with users based on proximity
- **Professional Networking**: Build maritime professional connections

## Architecture

### Clean Architecture with BLoC Pattern
```
lib/
├── core/                 # Core functionality
│   ├── config/          # App configuration
│   ├── network/         # HTTP client setup
│   ├── router/          # App navigation
│   ├── theme/           # App theming
│   ├── utils/           # Utilities
│   └── widgets/         # Shared widgets
├── features/            # Feature modules
│   ├── auth/           # Authentication
│   ├── discovery/      # "Koi Hai?" functionality
│   ├── profile/        # User profiles
│   └── chat/           # Messaging (placeholder)
└── main.dart           # App entry point
```

### Key Technologies
- **Flutter SDK**: Cross-platform mobile development
- **BLoC Pattern**: State management with flutter_bloc
- **Google Maps**: Interactive maps with location services
- **Dio**: HTTP client for API communication
- **Go Router**: Declarative routing
- **Secure Storage**: Token and credentials storage

## Setup Instructions

### Prerequisites
- Flutter SDK (>=3.10.0)
- Dart SDK (>=3.0.0)
- Android Studio / VS Code
- Android SDK for Android development
- Xcode for iOS development (macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flutter-app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure Google Maps API**
   - Get a Google Maps API key from Google Cloud Console
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` in `android/app/src/main/AndroidManifest.xml`
   - For iOS, add the key to `ios/Runner/AppDelegate.swift`

4. **Configure API endpoint**
   - Update `baseUrl` in `lib/core/config/app_config.dart`
   - Default: `http://localhost:5000` (for local development)
   - Production: Update to your deployed backend URL

5. **Run the app**
   ```bash
   flutter run
   ```

## Backend Integration

The app connects to the QaaqConnect backend server:

### API Endpoints
- `POST /api/login` - User authentication
- `GET /api/profile` - User profile data
- `GET /api/users/search` - User discovery and search
- `POST /api/users/location/device` - Location updates

### Authentication
- Uses JWT tokens for secure API access
- Tokens stored securely using FlutterSecureStorage
- Automatic token refresh and validation

### Database
- Connects to shared QAAQ parent database
- 666+ authentic maritime professionals
- Real maritime user data with locations, ranks, ships

## Testing Credentials

For testing the app, use these credentials:

```
Email: mushy.piyush@gmail.com
Phone: +919029010070  
Password: 1234koihai
```

## Building APK

### Debug APK
```bash
flutter build apk --debug
```

### Release APK
```bash
flutter build apk --release
```

The APK will be generated in `build/app/outputs/flutter-apk/`

### App Bundle (for Google Play Store)
```bash
flutter build appbundle --release
```

## Project Structure

### Features Implementation

#### Authentication Feature
- Login screen with maritime-themed UI
- JWT token management
- User profile loading
- Secure credential storage

#### Discovery Feature  
- Interactive Google Maps with custom styling
- GPS location services
- "Koi Hai?" button for nearby user discovery
- User search with filtering
- Distance calculation and display
- User cards with maritime professional info

#### Profile Feature
- Complete user profile display
- Maritime-specific information (ship, rank, port)
- Activity statistics
- Admin user badges
- Logout functionality

#### Navigation
- Bottom navigation with 3 tabs
- Route-based navigation with Go Router
- Authentication guards
- Deep linking support

## Key Dependencies

```yaml
dependencies:
  flutter_bloc: ^8.1.3        # State management
  go_router: ^12.1.3          # Navigation
  google_maps_flutter: ^2.5.0 # Maps
  geolocator: ^10.1.0         # Location services
  dio: ^5.3.2                 # HTTP client
  flutter_secure_storage: ^9.0.0 # Secure storage
  cached_network_image: ^3.3.0   # Image caching
  permission_handler: ^11.1.0    # Permissions
  lucide_icons: ^0.263.0         # Icons
```

## Development Notes

### State Management
- Uses BLoC pattern for predictable state management
- Separate blocs for each feature (Auth, Discovery, Profile)
- Event-driven architecture with clear state transitions

### UI/UX Design
- Maritime-themed color scheme (ocean teal, navy blue)
- Responsive design for various screen sizes
- Touch-friendly interface optimized for mobile
- Custom widgets for maritime-specific UI elements

### Location Services
- GPS location with proper permission handling
- Background location updates
- Distance calculation using Haversine formula
- Location-based user discovery

### Performance
- Image caching for profile pictures
- Efficient list rendering with pagination
- Optimized map rendering
- Proper memory management

## Deployment

### Android
1. Configure signing keys in `android/app/build.gradle`
2. Build release APK or App Bundle
3. Upload to Google Play Console

### iOS (macOS required)
1. Configure signing in Xcode
2. Build for iOS device
3. Upload to App Store Connect

## Contributing

1. Follow the existing architecture patterns
2. Use BLoC for state management
3. Write comprehensive tests
4. Follow Flutter/Dart style guidelines
5. Update documentation for new features

## Troubleshooting

### Common Issues

1. **Location permissions denied**
   - Ensure location permissions are properly requested
   - Check device location settings

2. **API connection issues**
   - Verify backend server is running
   - Check API endpoint configuration
   - Ensure network connectivity

3. **Google Maps not loading**
   - Verify Google Maps API key is configured
   - Check API key permissions and billing

4. **Build failures**
   - Run `flutter clean && flutter pub get`
   - Check Flutter doctor for issues
   - Verify all dependencies are compatible

## License

This project is part of the QaaqConnect maritime networking platform.

## Support

For technical support or questions about the app:
1. Check the documentation
2. Review common troubleshooting steps
3. Contact the development team

---

**QaaqConnect Flutter App** - Connecting maritime professionals worldwide through mobile technology.