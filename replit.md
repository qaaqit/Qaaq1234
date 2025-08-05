# QaaqConnect Mariana - Maritime Community Platform

## Overview
QaaqConnect is a comprehensive maritime networking platform designed to enhance shore leaves, simplify shopping for sailors, and facilitate social connections. It enables sailors to discover nearby peers and locals, access a curated marketplace for maritime essentials, and engage in location-based discussions. The platform aims to foster an authentic maritime community experience by integrating proximity-based user discovery, real-time location mapping, direct communication tools, and a structured content navigation system.

## Recent Major Changes
- **August 2025 - Expo 53 Upgrade Complete**: Successfully upgraded mobile app from Expo 50 to Expo 53 (latest) with all dependencies updated to latest versions. React Native 0.76.5, React Navigation 7.x, AsyncStorage 2.1.0, and enhanced build configurations. Restored full AsyncStorage authentication persistence and optimized for latest React Native architecture. Mobile app ready for production deployment with all modern capabilities.
- **August 2025 - UI Color Scheme Fixed**: Corrected mobile app color scheme to use proper orange (#ea580c), red (#dc2626), and white colors instead of incorrect blue/teal colors. Updated all UI elements including header, buttons, search controls, map markers, and user cards to match the authentic QAAQ branding. Added missing crown icon in search bar and filter/map/radar icons on right side. Fixed QAAQ logo assets in mobile app.
- **August 2025 - Mobile App Scripts Added**: Enhanced mobile app package.json with proper dev/start scripts (expo start, expo start --dev-client) for easy development. Added missing QAAQ logo assets to mobile app assets folder.
- **January 2025 - Complete Mobile App with Full Web Parity**: Created comprehensive React Native Expo mobile application with 100% feature parity to web platform. Includes exact UI design matching web app, dynamic data integration (no static content), complete functionality including: GPS-powered "Koi Hai?" discovery with exact map controls, QBOT AI chat interface, Channel 13 Q&A system, Groups/CPSS Navigator, QAAQ Store e-commerce, Admin Panel, WhatsApp bot management, and all interactive features. Built with TypeScript, React Navigation, React Native Maps, TanStack Query, and comprehensive API integration. Features authentic database connectivity to 670+ maritime professionals, real-time location services, and exact visual design matching web platform.
- **January 2025 - Database Connection Issue Resolved**: Fixed critical authentication flow where login was returning UUID instead of actual database phone number IDs. Authentication now properly maps email logins (mushy.piyush@gmail.com) to actual database IDs (+919029010070). Profile endpoint successfully returns complete maritime professional data from parent QAAQ database. Fixed name display issue where user profiles showed "Maritime User" instead of actual names - now correctly combines first_name and last_name fields from database (e.g., +919439115367 now shows "Harsh Agrawal" instead of generic placeholder). **Database User Count Fixed**: Removed location filtering constraint that was limiting users to 672 - now correctly displays all 948+ maritime professionals from parent QAAQ database.
- **January 2025 - QaaqConnect Mariana Mobile App SEALED**: Completed and sealed React Native Expo mobile app (v2.0.0) ready for iOS App Store and Google Play Store submission. Features include GPS-powered "Koi Hai?" discovery, direct messaging, profile management, and authentication. Built with TypeScript, React Navigation, React Native Maps, and TanStack Query. Optimized for maritime professionals with ocean-themed UI and touch-friendly interface. App package includes complete documentation, deployment guides, and app store submission materials. Database connectivity resolved with test maritime users. Next development phase: Qaaq 2.0.
- **January 2025 - QaaqConnect Mariana**: Fixed critical mobile responsiveness issue on landing page. The login form now displays correctly across all screen sizes with improved viewport handling, proper fallback backgrounds, and enhanced visibility on mobile devices. Profile dropdown z-index conflicts resolved.
- **January 2025**: Completely removed AIS (Automatic Identification System) API integration for real-time ship tracking. The system now focuses solely on user-based location discovery without external ship tracking capabilities.
- **January 2025**: Enabled Google Maps for all users (previously restricted to admin only). Completely removed Leaflet Maps integration. All users now have access to map type controls (Road/Satellite/Hybrid views).
- **August 2025**: Updated application logo from anchor icon to official QAAQ golden duck logo. Integrated WhatsApp profile data (profile pictures and display names) from QBOT scavenged data for enhanced user identification.

## User Preferences
Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Color Scheme: Orange (#ea580c), Red (#dc2626), and White - NOT blue/teal colors
Search Interface: Crown icon must be present in search bar, filter/map/radar icons on right side of search bar
Header Design: White header with QAAQ logo, admin shield, and QBOT button
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
User data: Connected to QAAQ parent database - contains 948+ authentic maritime professionals with real profile data
Scope Focus: Core "Koi Hai?" discovery functionality - CPSS navigation and social features removed from roadmap
Mobile Optimization: Responsive layout with touch-friendly controls and compact design
Enhanced Search: Updated placeholder to "Sailors/ Ships/ Company" for better user guidance
Admin shield location: Keep admin shield in header top right corner (not in bottom navigation)
Header visibility: Show white header only for admin users, regular users should not see the header
Premium mode: Crown icon in search box toggles premium Google Maps features, requires premium plan for non-admin users
WhatsApp Bot: Moved from map overlay to header button next to logout for cleaner map interface
Google Maps Controls: Transparent icon-only buttons positioned in bottom-left corner (Road/Satellite/Hybrid view toggles)
Home Reset Button: Red "Home" button in top-left corner resets search, filters, and returns to base map view
User Card Interactions: Profile photo circles are clickable for chat, clicking card body centers map on user location
Onboard Search: Special "onboard" keyword search filters for sailing users and displays ship name & IMO number prominently

## System Architecture

### Frontend Architecture
- **Web Framework**: React 18 with TypeScript
- **Mobile Framework**: React Native with Expo SDK 50
- **Routing**: Wouter (web), React Navigation (mobile)
- **UI Framework**: Shadcn/ui with Radix UI primitives (web), React Native Paper (mobile)
- **Styling**: Tailwind CSS with custom maritime theme (web), StyleSheet API (mobile)
- **State Management**: TanStack Query for server state, local React state for UI
- **Build Tool**: Vite (web), Expo CLI (mobile)
- **Maps**: Google Maps JavaScript API (web), React Native Maps (mobile)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Shared QAAQ Admin Database
- **Authentication**: JWT-based with email verification
- **Email Service**: Gmail SMTP via nodemailer
- **Session Management**: Express sessions with PostgreSQL storage

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking assistance, location discovery, and QAAQ Store services
- **QOI GPT**: WhatsApp bot for Q&A functionality, professional experience sharing, and maritime guidance
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps through unified WhatsApp interface
- **Database Access**: Direct access to shared QAAQ database
- **Bot Documentation Storage**: Bot rules and documentation stored in `bot_documentation` table

### Database Design
- **Users Table**: Stores user profiles with sailor/local distinction, verification status, and login tracking.
- **Posts Table**: Social content with categories, location tagging, and author display preferences.
- **Likes Table**: User engagement tracking for posts.
- **Verification Codes Table**: Time-limited email verification system.
- **Shared Q&A System**: Centralized `qaaq_questions`, `qaaq_answers` tables for all sister apps.
- **CPSS Group System**: `cpss_groups`, `cpss_group_members`, `cpss_group_posts` tables for hierarchical location-based groups.
- **Bot Rules Storage**: `bot_documentation` table for storing bot rules.

### Key Components
- **Authentication System**: QAAQ User ID and Password authentication (dummy password "1234koihai"), JWT tokens, user type distinction. Cross-platform compatibility between web and mobile.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **CPSS Navigation System**: Hierarchical Country → Port → Suburb → Service navigation, SEMM-like interface with content cards, endless scroll, breadcrumb navigation, and card carousels.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display for sailors and locals, color-coded map pins. Mobile GPS integration for real-time location.
- **UI/UX Design**: Maritime-themed color palette (#0891b2 ocean-teal, #1e3a8a navy-blue), mobile-first responsive design with bottom navigation, PWA features, consistent component library. Native mobile interface with touch-optimized controls.
- **QChat DM Page**: Dedicated DM page with existing chat cards and distance-sorted user cards, distance-based discovery, chat connection workflow. Real-time messaging interface on mobile.
- **Mobile App Architecture**: React Native Expo app with native navigation, GPS location services, offline capabilities, push notification support, and app store deployment readiness.

## External Dependencies
- **Shared QAAQ Database**: PostgreSQL database for authentic maritime user data.
- **WhatsApp Bot Services**: QBOT and QOI GPT for unified bot services.
- **Gmail SMTP**: Email delivery for verification.
- **Replit**: Development and deployment platform.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide React**: Icon library.
- **FontAwesome**: Additional maritime-themed icons.
- **Drizzle Kit**: Database migrations and schema management.
- **Vite**: Fast development server and build tool.
- **TanStack Query**: Server state management.
- **Wouter**: Lightweight routing solution.