# 📁 File Mapping Guide

## Exact Files to Copy

### STEP 1: Navigation & Authentication

**FROM web-app-source/client/src/ → TO mobile-app/src/**

```
components/bottom-nav.tsx → navigation/TabNavigator.tsx
lib/auth.ts → utils/auth.ts  
lib/queryClient.ts → utils/queryClient.ts
App.tsx → App.tsx (enhance navigation)
```

### STEP 2: Discovery & Maps

**FROM web-app-source/client/src/ → TO mobile-app/src/**

```
pages/discover.tsx → screens/DiscoveryScreen.tsx (enhance existing)
components/users-map-dual.tsx → components/UsersMapDual.tsx
components/discovery-card.tsx → components/DiscoveryCard.tsx
components/user-dropdown.tsx → components/UserDropdown.tsx
hooks/useLocation.ts → hooks/useLocation.ts
```

### STEP 3: QBOT AI Chat

**FROM web-app-source/client/src/ → TO mobile-app/src/**

```
pages/qbot.tsx → screens/QBOTScreen.tsx (major enhancement)
components/qbot-chat/QBOTChatContainer.tsx → components/qbot/QBOTChatContainer.tsx
components/qbot-chat/QBOTChatHeader.tsx → components/qbot/QBOTChatHeader.tsx
components/qbot-chat/QBOTChatArea.tsx → components/qbot/QBOTChatArea.tsx
components/qbot-chat/QBOTMessageList.tsx → components/qbot/QBOTMessageList.tsx
components/qbot-chat/QBOTInputArea.tsx → components/qbot/QBOTInputArea.tsx
components/qbot-chat/QBOTWelcomeState.tsx → components/qbot/QBOTWelcomeState.tsx
components/qbot-chat/QBOTTypingIndicator.tsx → components/qbot/QBOTTypingIndicator.tsx
components/PremiumSubscriptionDialog.tsx → components/PremiumSubscriptionDialog.tsx
```

### STEP 4: Messaging & Social

**FROM web-app-source/client/src/ → TO mobile-app/src/**

```
pages/dm.tsx → screens/DMScreen.tsx
pages/Chat1v1Page.tsx → screens/Chat1v1Screen.tsx
pages/rank-groups.tsx → screens/RankGroupsScreen.tsx
pages/user-profile.tsx → screens/UserProfileScreen.tsx (enhance existing)
components/TopQProfessionals.tsx → components/TopQProfessionals.tsx
components/chat/ (all files) → components/chat/ (create directory)
```

### STEP 5: Premium & Features

**FROM web-app-source/client/src/ → TO mobile-app/src/**

```
pages/premium.tsx → screens/PremiumScreen.tsx
pages/glossary.tsx → screens/GlossaryScreen.tsx
pages/question-bank.tsx → screens/QuestionBankScreen.tsx
components/image-carousel.tsx → components/ImageCarousel.tsx
components/questions-tab.tsx → components/QuestionsTab.tsx
components/ObjectUploader.tsx → components/ObjectUploader.tsx
```

## Key Component Conversions

### Bottom Navigation (Priority)

**FROM: web-app-source/client/src/components/bottom-nav.tsx**
```typescript
// Web version uses wouter and CSS
import { useLocation } from "wouter";
<nav className="fixed bottom-0">
  <Button onClick={() => setLocation("/")} />
</nav>
```

**TO: mobile-app/src/navigation/TabNavigator.tsx**
```typescript
// Mobile version uses React Navigation
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
const Tab = createBottomTabNavigator();

<Tab.Navigator>
  <Tab.Screen name="QBOT" component={QBOTScreen} />
</Tab.Navigator>
```

### Discovery Page (Priority)

**FROM: web-app-source/client/src/pages/discover.tsx**
```typescript
// Web version uses Leaflet maps and CSS
import UsersMapDual from "@/components/users-map-dual";
<div className="h-[90vh]">
  <UsersMapDual />
</div>
```

**TO: mobile-app/src/screens/DiscoveryScreen.tsx** 
```typescript
// Mobile version uses React Native Maps
import MapView, { Marker } from 'react-native-maps';
<View style={styles.container}>
  <MapView style={styles.map} />
</View>
```

### QBOT Chat (Priority)

**FROM: web-app-source/client/src/pages/qbot.tsx**
```typescript
// Web version with complex UI components
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
<div className="h-[90vh] bg-gradient-to-br">
  <QBOTChatContainer>
    <QBOTMessageList messages={messages} />
  </QBOTChatContainer>
</div>
```

**TO: mobile-app/src/screens/QBOTScreen.tsx**
```typescript
// Mobile version with React Native components
import { FlatList } from 'react-native';
<SafeAreaView style={styles.container}>
  <FlatList
    data={messages}
    renderItem={renderMessage}
  />
</SafeAreaView>
```

## Shared Files (Already Available)

These files are already included and work with both web and mobile:

```
shared/schema.ts - Database types and schemas
```

## Assets to Copy

Make sure to copy these asset files:

```
web-app-source/client/src/assets/ → mobile-app/assets/
- qaaq-logo.png (QAAQ logo)
- Any other images used in components
```

## Important Notes

1. **React Native Packages**: You may need to install additional packages:
   ```bash
   npm install react-native-maps react-native-vector-icons
   npm install react-native-linear-gradient
   ```

2. **Navigation Setup**: The mobile app needs React Navigation configured:
   ```bash
   npm install @react-navigation/native @react-navigation/bottom-tabs
   npm install @react-navigation/stack
   ```

3. **Icons**: Convert FontAwesome icons to React Native vector icons:
   ```typescript
   // Web: <i className="fas fa-robot" />
   // Mobile: <Icon name="robot" size={20} color="white" />
   ```

4. **Styling**: Convert all CSS classes to StyleSheet objects:
   ```typescript
   // Web: className="bg-orange-500 text-white"
   // Mobile: style={[styles.orangeBackground, styles.whiteText]}
   ```

5. **API URLs**: Update API base URLs for production:
   ```typescript
   const API_BASE_URL = 'https://mushypiyush-workspace.replit.app';
   ```

This mapping guide provides exact file-to-file copying instructions for the 5-step implementation plan.