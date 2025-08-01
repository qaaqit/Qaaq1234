import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Import your existing React app
let App;

if (Platform.OS === 'web') {
  // For web, use your existing React app
  App = require('./client/src/main.tsx').default;
} else {
  // For mobile, we'll create a React Native version
  App = require('./mobile/App.tsx').default;
}

// Register the main component
registerRootComponent(App);