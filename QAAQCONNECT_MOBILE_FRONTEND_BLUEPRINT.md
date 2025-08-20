# 🚀 QaaqConnect Mobile Frontend Blueprint

## Overview
Complete React Native mobile app development guide to copy web app functionality. The mobile app is 50% complete - this blueprint finishes it.

**Current Status**: Basic React Native structure with login, discovery, and QBOT screens ✅  
**Goal**: Complete mobile app ready for Play Store deployment 🎯

---

## 🎯 5-STEP IMPLEMENTATION PLAN

### STEP 1: NAVIGATION & AUTHENTICATION (1-2 days)
Copy web app's bottom navigation system to React Native.

**Key Files to Convert:**
- `components/bottom-nav.tsx` → `navigation/TabNavigator.tsx`
- `lib/auth.ts` → `utils/auth.ts`

**Web to Mobile Conversion:**
```javascript
// WEB (wouter routing)
import { useLocation } from "wouter";
const [, setLocation] = useLocation();
setLocation("/qbot");

// MOBILE (React Navigation)
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
navigation.navigate('QBOT');
```

**Result**: Bottom navigation with QBOT, Qh13, Qh16, QRadar tabs

---

### STEP 2: DISCOVERY ENHANCEMENT (2-3 days)  
Complete the "Koi Hai?" proximity search and map functionality.

**Key Features to Implement:**
- "Koi Hai?" button - finds nearest 10 maritime professionals
- Crown icon for premium features
- Red "Home" reset button
- Filter/Map/Radar controls
- User card interactions (tap photo for chat, tap card to center map)

**Map Conversion:**
```javascript
// WEB (Leaflet)
import UsersMapDual from "@/components/users-map-dual";
<div className="h-[90vh]">
  <UsersMapDual />
</div>

// MOBILE (React Native Maps)
import MapView, { Marker } from 'react-native-maps';
<View style={styles.container}>
  <MapView style={styles.map}>
    {users.map(user => (
      <Marker key={user.id} coordinate={{latitude: user.lat, longitude: user.lng}} />
    ))}
  </MapView>
</View>
```

**Result**: Complete discovery system matching web app

---

### STEP 3: QBOT AI CHAT SYSTEM (3-4 days)
Complete QBOT with all AI features and premium integration.

**Key Features to Implement:**
- WhatsApp chat history integration
- Multi-AI model selection (ChatGPT, Gemini, Deepseek)
- File attachments (50MB limit)
- Premium subscription roadblock
- Engineering grid background

**Chat Component Conversion:**
```javascript
// WEB (Complex UI components)
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
<div className="h-[90vh] bg-gradient-to-br">
  <QBOTChatContainer>
    <QBOTMessageList messages={messages} />
  </QBOTChatContainer>
</div>

// MOBILE (React Native)
import { FlatList } from 'react-native';
<SafeAreaView style={styles.container}>
  <FlatList
    data={messages}
    renderItem={renderMessage}
    keyExtractor={(item) => item.id}
  />
  <TextInput 
    style={styles.input}
    placeholder="Type your message..."
  />
</SafeAreaView>
```

**Result**: Full QBOT system matching web app

---

### STEP 4: SOCIAL & MESSAGING (2-3 days)
Add professional networking and chat functionality.

**Key Features to Implement:**
- QH13 format (Top Q Professionals cards) 
- QH16 rank groups functionality
- Real-time messaging with WebSocket
- User profiles with maritime data

**Component Structure:**
```javascript
// Create these screens:
- DMScreen.tsx (Direct messaging)
- Chat1v1Screen.tsx (1-on-1 chat)
- RankGroupsScreen.tsx (Maritime rank groups)
- TopQProfessionals.tsx (QH13 format cards)
```

**Result**: Complete social networking features

---

### STEP 5: PREMIUM FEATURES (2-3 days)
Add subscription system and advanced features.

**Key Features to Implement:**
- Razorpay subscriptions (₹451 monthly, ₹2,611 yearly)
- Premium crown icons throughout app
- Image carousel with maritime photos
- Questions tab with QAAQ database
- Shipping dictionary access

**Premium Integration:**
```javascript
// Premium check component
const PremiumGate = ({ children, feature }) => {
  const isPremium = user?.subscription_status === 'active';
  
  if (!isPremium) {
    return <PremiumSubscriptionDialog feature={feature} />;
  }
  
  return children;
};
```

**Result**: Complete premium subscription system

---

## 🛠️ COMPONENT CONVERSION GUIDE

### HTML to React Native Mapping
| Web Component | React Native Component |
|--------------|----------------------|
| `<div>` | `<View>` |
| `<button>` | `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| `<img>` | `<Image>` |
| `<p>`, `<span>` | `<Text>` |
| `<ul>`, `<ol>` | `<FlatList>` or `<ScrollView>` |

### CSS to StyleSheet Conversion
```javascript
// WEB (CSS classes)
<div className="flex items-center justify-between bg-orange-500 p-4">
  <button className="bg-white text-orange-500 px-4 py-2 rounded">
    Click me
  </button>
</div>

// MOBILE (StyleSheet)
<View style={styles.container}>
  <TouchableOpacity style={styles.button}>
    <Text style={styles.buttonText}>Click me</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ea580c',
    padding: 16
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4
  },
  buttonText: {
    color: '#ea580c'
  }
});
```

---

## 🎨 DESIGN SYSTEM

### Colors (Maritime Theme)
```javascript
export const COLORS = {
  primary: '#ea580c',      // Orange
  secondary: '#dc2626',    // Red  
  background: '#f9fafb',   // Light gray
  white: '#ffffff',
  cream: '#fef7ed',
  premium: '#fbbf24',      // Gold/Crown
  text: '#1f2937',
  textLight: '#6b7280'
};
```

### Typography
```javascript
export const FONTS = {
  small: 12,
  regular: 16,
  large: 20,
  title: 24,
  header: 28
};
```

### Common Styles
```javascript
export const COMMON_STYLES = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  orangeButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  orangeButtonText: {
    color: COLORS.white,
    fontSize: FONTS.regular,
    fontWeight: 'bold'
  }
});
```

---

## 📦 REQUIRED DEPENDENCIES

Add to `package.json`:
```json
{
  "dependencies": {
    "@expo/vector-icons": "^14.0.4",
    "@react-navigation/bottom-tabs": "^7.1.6", 
    "@react-navigation/native": "^7.0.15",
    "@react-navigation/stack": "^7.1.2",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@tanstack/react-query": "^5.61.3",
    "expo": "~53.0.27",
    "expo-location": "~18.0.3",
    "expo-linear-gradient": "~13.0.2",
    "expo-camera": "~15.0.16",
    "expo-image-picker": "~15.0.7",
    "react-native": "0.76.5",
    "react-native-maps": "1.18.0",
    "react-native-paper": "^5.13.0",
    "react-native-vector-icons": "^10.2.0"
  }
}
```

**Installation:**
```bash
npm install --legacy-peer-deps
expo start
```

---

## 🔧 PRODUCTION API INTEGRATION

### API Configuration
```javascript
// src/config/api.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' 
  : 'https://mushypiyush-workspace.replit.app';

export const API_ENDPOINTS = {
  login: '/api/login',
  userSearch: '/api/users/search',
  qbotChat: '/api/qbot/chat',
  whatsappHistory: '/api/whatsapp-history',
  updateLocation: '/api/users/location',
  subscriptions: '/api/subscriptions'
};
```

### Authentication Setup
```javascript
// src/utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthService = {
  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
    }
    return data;
  },
  
  async getToken() {
    return await AsyncStorage.getItem('authToken');
  },
  
  async logout() {
    await AsyncStorage.removeItem('authToken');
  }
};
```

### TanStack Query Setup
```javascript
// src/utils/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const apiRequest = async (endpoint, options = {}) => {
  const token = await AuthService.getToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  
  return response.json();
};
```

---

## 📱 KEY MOBILE FEATURES TO IMPLEMENT

### 1. "Koi Hai?" Discovery
```javascript
const DiscoveryScreen = () => {
  const [users, setUsers] = useState([]);
  const [region, setRegion] = useState(null);

  const findNearbyUsers = async () => {
    const location = await Location.getCurrentPositionAsync({});
    const nearbyUsers = await apiRequest('/api/users/search', {
      method: 'POST',
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        limit: 10
      })
    });
    setUsers(nearbyUsers);
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region}>
        {users.map(user => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.latitude,
              longitude: user.longitude
            }}
            title={user.name}
            description={user.rank}
          />
        ))}
      </MapView>
      
      <TouchableOpacity style={styles.koiHaiButton} onPress={findNearbyUsers}>
        <Text style={styles.koiHaiText}>Koi Hai?</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 2. QBOT Chat Interface
```javascript
const QBOTScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedModels, setSelectedModels] = useState(['chatgpt']);

  const sendMessage = async () => {
    const newMessage = { text: inputText, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    const response = await apiRequest('/api/qbot/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: inputText,
        models: selectedModels,
        whatsapp_history: true
      })
    });
    
    setMessages(prev => [...prev, {
      text: response.response,
      sender: 'qbot',
      timestamp: Date.now(),
      models: response.models_used
    }]);
    
    setInputText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.timestamp.toString()}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask QBOT anything..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

### 3. Premium Subscription Integration
```javascript
const PremiumSubscriptionDialog = ({ visible, onClose, feature }) => {
  const openRazorpay = (plan) => {
    const checkoutUrl = plan === 'monthly' 
      ? 'https://rzp.io/rzp/jwQW9TW'  // ₹451 monthly
      : 'https://rzp.io/rzp/NAU59cv';  // ₹2,611 yearly
    
    Linking.openURL(checkoutUrl);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.premiumContainer}>
        <Text style={styles.premiumTitle}>Premium Required</Text>
        <Text style={styles.premiumDescription}>
          Unlock {feature} with QaaqConnect Premium
        </Text>
        
        <TouchableOpacity 
          style={styles.premiumButton}
          onPress={() => openRazorpay('monthly')}
        >
          <Text style={styles.premiumButtonText}>Monthly - ₹451</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.premiumButton, styles.yearlyButton]}
          onPress={() => openRazorpay('yearly')}
        >
          <Text style={styles.premiumButtonText}>Yearly - ₹2,611</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
```

---

## 🚀 DEPLOYMENT CONFIGURATION

### App Configuration (`app.json`)
```json
{
  "expo": {
    "name": "QaaqConnect Mariana",
    "slug": "qaaqconnect-mariana",
    "version": "2.1.1",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ea580c"
    },
    "android": {
      "package": "com.qaaq.mariana",
      "versionCode": 211,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA"
      ]
    },
    "plugins": [
      "expo-location",
      "expo-camera"
    ]
  }
}
```

### Build Commands
```bash
# Development
expo start

# Production build
eas build --platform android --profile production

# Generate APK for testing
eas build --platform android --profile preview
```

---

## ✅ TESTING CHECKLIST

**After Each Step:**
- [ ] Navigation between tabs works
- [ ] Map loads and displays correctly  
- [ ] "Koi Hai?" finds nearby users
- [ ] QBOT responds to messages
- [ ] Chat system sends/receives messages
- [ ] Premium subscription flow works
- [ ] All buttons are touch-friendly (minimum 44px)
- [ ] App works on different screen sizes

**Final Testing:**
- [ ] Complete user flow: Login → Discovery → Chat → QBOT
- [ ] Offline behavior handled gracefully
- [ ] Loading states shown appropriately
- [ ] Error messages are user-friendly

---

## 🎯 SUCCESS TARGETS

**Launch Goals:**
- 500+ downloads in first month
- 4.0+ star rating on Play Store
- 200+ active maritime professionals
- 70%+ week-1 retention rate

**Key Features Users Expect:**
1. **"Koi Hai?" Discovery** - Core value proposition
2. **QBOT AI Chat** - AI-powered maritime assistance
3. **Professional Networking** - Connect with maritime peers
4. **Premium Features** - Advanced functionality for serious users

---

## 🔥 IMPLEMENTATION TIPS

### Best Practices
- Start with Step 1 (Navigation) - foundation for everything else
- Test each step thoroughly before proceeding
- Keep API endpoints exactly as they are - backend is production-ready
- Maintain maritime theme consistently (orange/cream colors)
- Focus on touch-friendly design (minimum 44px touch targets)

### Common Pitfalls to Avoid
- Don't change API structure - just adapt frontend
- Don't skip premium integration - it's a key revenue feature
- Don't forget location permissions for discovery features
- Don't use web-specific libraries (use React Native equivalents)

### Performance Optimization
- Use FlatList for long lists (user lists, messages)
- Implement lazy loading for images
- Cache user data locally with AsyncStorage
- Optimize map rendering (limit visible markers)

---

## 🚀 READY TO BUILD!

This blueprint provides everything needed to complete the QaaqConnect mobile app. The web app is proven and successful - copying these features to mobile creates a powerful maritime networking platform ready for Play Store launch.

**Start with Step 1 and build systematically. The backend is live and ready!**