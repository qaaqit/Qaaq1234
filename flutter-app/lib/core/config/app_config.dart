class AppConfig {
  // API Configuration
  // For Android emulator: use 10.0.2.2 instead of localhost
  // For iOS simulator: use localhost or 127.0.0.1
  // For real device: use the actual IP address of your development machine
  static const String baseUrl = 'http://10.0.2.2:5000'; // Android emulator
  // static const String baseUrl = 'http://localhost:5000'; // iOS simulator
  // static const String baseUrl = 'http://192.168.1.XXX:5000'; // Real device (replace XXX with your IP)
  static const String apiVersion = '/api';
  static const String apiBaseUrl = '$baseUrl$apiVersion';
  
  // Endpoints
  static const String loginEndpoint = '/login';
  static const String profileEndpoint = '/profile';
  static const String usersSearchEndpoint = '/users/search';
  static const String updateLocationEndpoint = '/users/location/device';
  static const String postsEndpoint = '/posts';
  static const String likesEndpoint = '/likes';
  static const String chatEndpoint = '/chat';
  
  // App Configuration
  static const String appName = 'QaaqConnect';
  static const String appVersion = '1.0.0';
  
  // Map Configuration
  static const double defaultLatitude = 19.0760; // Mumbai
  static const double defaultLongitude = 72.8777;
  static const double defaultZoom = 10.0;
  static const double searchRadius = 50.0; // km
  
  // Authentication
  static const String jwtSecretKey = 'qaaq-connect-secret-key-2024';
  static const String defaultPassword = '1234koihai';
  
  // Colors - Maritime Theme
  static const String primaryColor = '#0891b2'; // Ocean teal
  static const String secondaryColor = '#1e3a8a'; // Navy blue
  static const String accentColor = '#f59e0b'; // Amber
  static const String backgroundColor = '#f8fafc'; // Light grey
  static const String surfaceColor = '#ffffff';
  static const String errorColor = '#ef4444';
  static const String successColor = '#10b981';
  
  // Animation durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 400);
  static const Duration longAnimation = Duration(milliseconds: 600);
}