# QaaqConnect PatalPacific Mobile App Blueprint

## 🚢 Overview
Complete Expo React Native implementation guide to replicate the QaaqConnect PatalPacific maritime networking platform. This blueprint contains everything needed to build a production-ready mobile app matching the web platform's functionality.

**Platform Identity**: QaaqConnect PatalPacific - The Ultimate Maritime Professional Networking Platform  
**Target**: Authentic maritime professionals, shipping companies, and port authorities worldwide  
**Core Focus**: "Koi Hai?" (Who's there?) discovery for sailors to find nearby maritime professionals  

---

## 🎯 App Architecture & Navigation

### Bottom Navigation Structure
```javascript
// Main Navigation (4 Tabs)
const TabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="QBOT" component={QBOTScreen} />
    <Tab.Screen name="Qh13" component={DMScreen} />  
    <Tab.Screen name="Qh16" component={RankGroupsScreen} />
    <Tab.Screen name="QRadar" component={DiscoverScreen} />
  </Tab.Navigator>
);
```

### Screen Hierarchy
1. **QBOT** - AI Maritime Assistant (Landing Screen)
2. **Qh13** - Direct Messages & Top Q Professionals 
3. **Qh16** - Maritime Rank Groups Chat
4. **QRadar** - "Koi Hai?" Discovery Map

---

## 🔐 Authentication System

### JWT Token Authentication
```javascript
// AuthContext.tsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const login = async (credentials) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    if (data.success) {
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
      setAuthToken(data.token);
      setUser(data.user);
    }
  };

  const checkPremiumStatus = () => {
    const testingEmails = ['workship.ai@gmail.com', 'mushy.piyush@gmail.com'];
    const isAdmin = user?.isAdmin || false;
    return testingEmails.includes(user?.email) || isAdmin;
  };

  return (
    <AuthContext.Provider value={{
      user, authToken, login, logout, checkPremiumStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### API Configuration
```javascript
// utils/api.ts
const API_BASE = __DEV__ ? 
  'http://localhost:5000' : 
  'https://qaaqconnect-patalpacific.replit.app';

export const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('auth_token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  return response.json();
};
```

---

## 🤖 QBOT AI Chat System

### Core QBOT Features
- **Multi-AI Models**: ChatGPT, Gemini, Deepseek, Mistral
- **Premium Integration**: Unlimited responses for premium users
- **WhatsApp History**: Cross-platform chat continuity
- **File Attachments**: 50MB limit with object storage
- **Maritime Context**: Ship name extraction and user context

### QBOT Screen Implementation
```javascript
// screens/QBOTScreen.tsx
const QBOTScreen = () => {
  const { user, checkPremiumStatus } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedModels, setSelectedModels] = useState(['chatgpt']);
  const [isTyping, setIsTyping] = useState(false);

  const isPremium = checkPremiumStatus();

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await apiRequest('/api/qbot/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: inputText,
          aiModels: selectedModels,
          isPremium: isPremium,
          language: 'en'
        })
      });

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'qbot',
        timestamp: new Date(),
        aiModel: response.aiModel
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('QBOT error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      {isPremium && (
        <View style={styles.premiumHeader}>
          <Text style={styles.premiumText}>QaaqConnect Premium</Text>
          <Icon name="crown" size={20} color="#fbbf24" />
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text>QBOT is typing...</Text>
        </View>
      )}

      {/* AI Model Selection */}
      <View style={styles.modelSelector}>
        {['chatgpt', 'gemini', 'deepseek', 'mistral'].map(model => (
          <TouchableOpacity
            key={model}
            style={[
              styles.modelButton,
              selectedModels.includes(model) && styles.modelButtonActive
            ]}
            onPress={() => toggleModel(model)}
          >
            <Text style={styles.modelText}>{model.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask QBOT anything about maritime..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Icon name="paper-plane" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

---

## 🗺️ Discovery & "Koi Hai?" System

### Core Discovery Features
- **"Koi Hai?" Search**: Find nearest 10 maritime professionals
- **Interactive Map**: React Native Maps with user pins
- **Premium Features**: Crown icon toggles advanced features
- **User Interactions**: Tap photo for chat, tap card to center map
- **Major Ports**: 12 top global ports marked on map

### Discovery Screen Implementation
```javascript
// screens/DiscoverScreen.tsx
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const DiscoverScreen = () => {
  const [users, setUsers] = useState([]);
  const [region, setRegion] = useState({
    latitude: 20,
    longitude: 0,
    latitudeDelta: 60,
    longitudeDelta: 60,
  });
  const [isSearching, setIsSearching] = useState(false);

  const majorPorts = [
    { name: "Shanghai", lat: 31.2304, lng: 121.4737 },
    { name: "Singapore", lat: 1.2966, lng: 103.7764 },
    { name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    // ... more ports
  ];

  const findNearbyUsers = async () => {
    setIsSearching(true);
    
    try {
      const location = await Location.getCurrentPositionAsync({});
      
      const response = await apiRequest('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          limit: 10,
          proximity: true
        })
      });

      if (response.success) {
        setUsers(response.users);
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const openUserChat = (user) => {
    navigation.navigate('Chat', { userId: user.id, userName: user.fullName });
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {/* Major Ports */}
        {majorPorts.map(port => (
          <Marker
            key={port.name}
            coordinate={{ latitude: port.lat, longitude: port.lng }}
            title={port.name}
            pinColor="#ea580c"
          />
        ))}

        {/* Users */}
        {users.map(user => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.latitude,
              longitude: user.longitude
            }}
            title={user.fullName}
            description={user.maritimeRank}
            onCalloutPress={() => openUserChat(user)}
          />
        ))}
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.koiHaiButton}
          onPress={findNearbyUsers}
          disabled={isSearching}
        >
          <Text style={styles.koiHaiText}>
            {isSearching ? 'Searching...' : 'Koi Hai?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton} onPress={resetMap}>
          <Icon name="home" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* User Cards */}
      <View style={styles.userCardsContainer}>
        <FlatList
          horizontal
          data={users}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};
```

---

## 💬 Messaging & Social Features

### QH13 - Direct Messages & Top Q Professionals
```javascript
// screens/DMScreen.tsx
const DMScreen = () => {
  const [activeConnections, setActiveConnections] = useState([]);
  const [topProfessionals, setTopProfessionals] = useState([]);

  // Fetch user connections and top professionals
  useEffect(() => {
    fetchConnections();
    fetchTopProfessionals();
  }, []);

  const fetchConnections = async () => {
    const response = await apiRequest('/api/chat/connections');
    setActiveConnections(response.connections || []);
  };

  const fetchTopProfessionals = async () => {
    const response = await apiRequest('/api/users/top-professionals');
    setTopProfessionals(response.professionals || []);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Top Q Professionals Cards (6 per screen) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Q Professionals</Text>
        <View style={styles.professionalsGrid}>
          {topProfessionals.slice(0, 6).map(professional => (
            <ProfessionalCard 
              key={professional.id} 
              professional={professional}
              onPress={() => openChat(professional)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
```

### QH16 - Maritime Rank Groups
```javascript
// screens/RankGroupsScreen.tsx
const RankGroupsScreen = () => {
  const maritimeRanks = [
    'Cap', 'CO', '2O', '3O', 'CE', '2E', '3E', '4E',
    'Cadets', 'Crew', 'MarineSuperIntendent', 'TechSuperIntendent',
    'Fleet Managers', 'Eto/ Elec Superintendent', 'Other Marine Professionals'
  ];

  return (
    <FlatList
      data={maritimeRanks}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.rankCard}
          onPress={() => navigation.navigate('RankChat', { rank: item })}
        >
          <Text style={styles.rankTitle}>{item}</Text>
          <Icon name="users" size={20} color="#ea580c" />
        </TouchableOpacity>
      )}
    />
  );
};
```

---

## 🎨 Design System & Styling

### Color Palette (Maritime Theme)
```javascript
export const COLORS = {
  primary: '#ea580c',      // Orange (QaaqConnect brand)
  secondary: '#dc2626',    // Red
  background: '#f9fafb',   // Light gray
  white: '#ffffff',
  cream: '#fef7ed',
  premium: '#fbbf24',      // Gold/Crown
  text: '#1f2937',
  textLight: '#6b7280',
  success: '#10b981',
  error: '#ef4444'
};
```

### Typography System
```javascript
export const TYPOGRAPHY = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  orangeButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.bold
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  }
});
```

---

## 📱 Screen-Specific Implementations

### QBOT Screen Styles
```javascript
const qbotStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5'
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    gap: 8
  },
  premiumText: {
    color: COLORS.white,
    fontWeight: 'bold'
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16
  },
  messageContainer: {
    marginVertical: 4
  },
  userMessage: {
    alignItems: 'flex-end'
  },
  botMessage: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4
  },
  botBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.base
  },
  userText: {
    color: COLORS.white
  },
  botText: {
    color: COLORS.text
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
```

### Discovery Screen Styles
```javascript
const discoveryStyles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  koiHaiButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  koiHaiText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold
  },
  homeButton: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  userCardsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 120
  }
});
```

---

## 📦 Required Dependencies

### Package.json
```json
{
  "name": "qaaqconnect-mobile",
  "version": "1.0.0",
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
    "expo-document-picker": "~12.0.2",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-maps": "1.18.0",
    "react-native-paper": "^5.13.0",
    "react-native-vector-icons": "^10.2.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.2.0"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

### Installation Commands
```bash
# Initialize Expo project
npx create-expo-app QaaqConnectMobile --template blank-typescript

# Install dependencies
npm install --legacy-peer-deps

# iOS specific (if targeting iOS)
cd ios && pod install && cd ..

# Start development server
expo start
```

---

## 🔧 Configuration Files

### App.json (Expo Configuration)
```json
{
  "expo": {
    "name": "QaaqConnect PatalPacific",
    "slug": "qaaqconnect-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ea580c"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.qaaqconnect.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ea580c"
      },
      "package": "com.qaaqconnect.mobile",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-location",
      "expo-camera",
      "expo-image-picker"
    ]
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Structure (Week 1)
1. ✅ Setup Expo project with TypeScript
2. ✅ Implement bottom navigation (4 tabs)
3. ✅ Create authentication system with JWT
4. ✅ Setup API integration with TanStack Query
5. ✅ Implement basic QBOT chat interface

### Phase 2: QBOT Enhancement (Week 2)
1. 🔲 Multi-AI model selection UI
2. 🔲 Premium subscription integration
3. 🔲 WhatsApp history sync
4. 🔲 File attachment system (50MB limit)
5. 🔲 Enhanced chat UI with typing indicators

### Phase 3: Discovery System (Week 3)
1. 🔲 React Native Maps integration
2. 🔲 "Koi Hai?" proximity search
3. 🔲 GPS location services
4. 🔲 User cards and map interactions
5. 🔲 Major ports marking system

### Phase 4: Social Features (Week 4)
1. 🔲 QH13 Top Q Professionals cards
2. 🔲 QH16 Maritime rank groups
3. 🔲 Real-time messaging with WebSocket
4. 🔲 User profiles and connections
5. 🔲 Direct messaging system

### Phase 5: Polish & Deploy (Week 5)
1. 🔲 Performance optimization
2. 🔲 UI/UX refinements
3. 🔲 Error handling and offline support
4. 🔲 App store assets and metadata
5. 🔲 Production build and submission

---

## 🔗 API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-token` - Verify JWT token
- `GET /api/auth/user` - Get user profile

### QBOT
- `POST /api/qbot/chat` - Send message to QBOT
- `GET /api/whatsapp-history/{userId}` - Get WhatsApp history
- `POST /api/qbot/clear` - Clear chat history

### Discovery
- `POST /api/users/search` - Find nearby users
- `GET /api/users/top-professionals` - Get top professionals

### Chat & Social
- `GET /api/chat/connections` - Get user connections
- `POST /api/chat/send` - Send direct message
- `GET /api/rank-groups` - Get maritime rank groups

---

## 🎯 Success Metrics

### User Engagement
- Daily active users (target: 50+ maritime professionals)
- QBOT chat sessions per user (target: 5+ per day)
- "Koi Hai?" searches per user (target: 3+ per day)
- Premium subscription conversion (target: 20%)

### Technical Performance
- App load time < 3 seconds
- API response time < 2 seconds
- Crash rate < 1%
- User retention > 70% (week 1)

---

## 🚀 Ready to Build!

This blueprint provides complete specifications to build QaaqConnect PatalPacific mobile app. The web platform has proven success with 948+ authentic maritime professionals. Replicating these features in mobile creates a powerful maritime networking tool ready for app store deployment.

**Key Success Factors:**
1. **Authentic Data**: Connected to QAAQ parent database with real maritime professionals
2. **Premium Integration**: Razorpay payment system for subscription management  
3. **AI-Powered**: Multi-model QBOT system for comprehensive maritime assistance
4. **Location-Based**: GPS-powered "Koi Hai?" discovery for professional networking
5. **Cross-Platform**: Seamless integration with existing web platform and WhatsApp bots

**Next Steps:**
1. Create new Expo project: `npx create-expo-app QaaqConnectMobile`
2. Install dependencies from package.json
3. Implement authentication system first
4. Build QBOT screen as primary landing experience
5. Add discovery map for "Koi Hai?" functionality
6. Integrate social features (QH13/QH16)
7. Test with real maritime professionals
8. Submit to app stores

The maritime industry is ready for this mobile solution. Build it and they will connect! ⚓🚢