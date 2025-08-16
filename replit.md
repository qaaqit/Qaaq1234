# QaaqConnect Mariana - Maritime Community Platform

## Overview
QaaqConnect is a comprehensive maritime networking platform designed to enhance shore leaves, simplify shopping for sailors, and facilitate social connections. It enables sailors to discover nearby peers and locals, access a curated marketplace for maritime essentials, and engage in location-based discussions. The platform aims to foster an authentic maritime community experience by integrating proximity-based user discovery, real-time location mapping, direct communication tools, and a structured content navigation system.

Business Vision: To be the leading platform for maritime professionals, fostering genuine connections and simplifying life at sea and ashore.
Market Potential: Tapping into the global maritime industry, connecting a vast network of sailors, ship companies, and related businesses.
Project Ambitions: To create a vibrant, self-sustaining community where maritime professionals can thrive personally and professionally.

## User Preferences
Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Home page after login: QBOT Chat (not Map Radar) - users land on QBOT Chat immediately after authentication
MARIANA BASE RULE: The app will NEVER carry out bulk assignment of users to rank groups - this functionality is permanently disabled for security
Color Scheme: Orange (#ea580c), Red (#dc2626), and White - NOT blue/teal colors
Search Interface: Crown icon must be present in search bar, filter/map/radar icons on right side of search bar
Header Design: White header with QAAQ logo, admin shield, and QBOT button
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
User data: Connected to QAAQ parent database - contains 948+ authentic maritime professionals with real profile data
Scope Focus: Core "Koi Hai?" discovery functionality - CPSS navigation and social features removed from roadmap
🔒 QH13 FORMAT UPDATED: Active Conversations section completely removed - only Top Q Professionals cards remain in compact format (6 cards per screen)
🔒 DUAL SEARCH SYSTEM LOCKED: Pull-to-search on QH13 page + Q radar map search both fully operational with clickable green dots and DM navigation
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
Shipping Dictionary Access: Users can access maritime dictionary definitions without authentication
Login Roadblock Design: Single minimizable login roadblock with chevron control in top-right corner, no separate roadblocks for individual features

## System Architecture

### Frontend Architecture
- **Web Framework**: React 18 with TypeScript
- **Mobile Framework**: React Native with Expo SDK 53
- **Routing**: Wouter (web), React Navigation (mobile)
- **UI Framework**: Shadcn/ui with Radix UI primitives (web), React Native Paper (mobile)
- **Styling**: Tailwind CSS with custom maritime theme (web), StyleSheet API (mobile)
- **State Management**: TanStack Query for server state, local React state for UI
- **Build Tool**: Vite (web), Expo CLI (mobile)
- **Maps**: Google Maps JavaScript API (web), React Native Maps (mobile)
- **UI/UX Decisions**: QAAQ branding with orange, red, and white color scheme. Consistent UI across web and mobile. Optimized z-index hierarchy for UI elements. QBOT chat interface with consistent design across all pages. Mobile-first responsive design with bottom navigation. Card-based layout for user management. Streamlined QBOT answer display.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: Enhanced PostgreSQL with advanced connection pooling, retry logic, health monitoring, and hibernation prevention. Shared QAAQ Admin Database with subscription tables.
- **Database Management**: Comprehensive database services including DatabaseKeeper (prevents hibernation), ConnectionPoolManager (optimizes performance), SyncManager (ensures data consistency), and automated migration helper with daily maintenance scheduling.
- **Questions System**: Authentic QAAQ database with 1,244 real maritime Q&A records, with redesigned question card layout. Dedicated `question_attachments` table for tracking questions with images/attachments stored locally in `server/uploads/`.
- **Image Storage**: Local filesystem storage (`server/uploads/`) with `ImageManagementService`.
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens. Universal password acceptance with automatic user creation.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Payment System**: Production Razorpay integration with enhanced database connection reliability, automatic retry logic for payment processing, and comprehensive subscription management.

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking assistance, location discovery, QAAQ Store services, and Q&A functionality.
- **QOI GPT**: WhatsApp bot for Q&A functionality, professional experience sharing, and maritime guidance.
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps through unified WhatsApp interface.
- **Database Access**: Direct access to shared QAAQ database.
- **AI-Powered Responses**: Connected QBOT to OpenAI GPT-4o for intelligent maritime assistance.
- **SEMM Breadcrumb System**: Implemented System > Equipment > Make > Model categorization for technical questions.
- **File Attachments**: Clip icon attachment system to QBOT chat supporting JPG, PNG, PDF and similar formats up to 50MB with object storage integration.

### System Design Choices
- **Dual Authentication System**: QAAQ JWT token and Replit OpenID Connect. All successful logins redirect to "/qbot" (QBOT Chat).
- **WhatsApp Cross-Platform Integration**: Users see their previous WhatsApp Q&A history when logging into webapp.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display for sailors and locals, color-coded map pins. Mobile GPS integration for real-time location.
- **Real-Time Messaging**: WebSocket-based real-time messaging with live typing indicators, instant message delivery, and read receipts.
- **QBOT Integration**: Fully functional QBOT chat system integrated across all pages.

## Database Synchronization & Performance Features
- **Keep-Alive Service**: Prevents database hibernation with automated ping every 5 minutes and health checks every 30 seconds
- **Connection Pool Management**: Advanced pool optimization with monitoring, query tracking, and automatic retry logic
- **Data Synchronization**: Queue-based sync manager for user locations, message status, activity logs, and subscription updates
- **Performance Monitoring**: Real-time database metrics, connection statistics, and query performance tracking
- **Automated Maintenance**: Daily cleanup of old data, index optimization, and database analysis scheduled at 2 AM
- **Admin Controls**: Database restart, pool optimization, sync queue management, and real-time health monitoring endpoints

## External Dependencies
- **Shared QAAQ Database**: PostgreSQL database for authentic maritime user data and Q&A records.
- **WhatsApp Bot Services**: QBOT and QOI GPT.
- **Gmail SMTP**: Email delivery.
- **Replit**: Development and deployment platform.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide React**: Icon library.
- **FontAwesome**: Additional maritime-themed icons.
- **Drizzle Kit**: Database migrations and schema management.
- **Vite**: Fast development server and build tool.
- **TanStack Query**: Server state management.
- **Wouter**: Lightweight routing solution.
- **OpenAI GPT-4o**: For QBOT AI-powered responses.
- **Razorpay**: Production-ready subscription system for payments.