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
- **Database**: PostgreSQL with Drizzle ORM, shared QAAQ Admin Database
- **Questions System**: Authentic QAAQ database with 1,244 real maritime Q&A records with separate attachment tracking system.
- **Question Attachments**: Dedicated `question_attachments` table with unique IDs for tracking questions with images/attachments. Currently tracking 18 authentic maritime question images stored in Google Cloud Storage, each with separate UUID-based attachment IDs for enhanced organization and retrieval.
- **Image Storage**: Transitioned from Google Cloud Storage to local filesystem storage. Authentic maritime question images stored in `server/uploads/` directory with WhatsApp naming pattern (`whatsapp_[number]_[timestamp].jpg`) for direct serving via `/uploads/` endpoint. System supports multiple image sources for comprehensive maritime content display.
- **Future Image Storage Strategy**: All new images will be stored in `server/uploads/` directory with proper database records in `question_attachments` table. Images served via `/uploads/` endpoint with caching and proper MIME type detection.
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens. Universal password acceptance with automatic user creation.
- **Session Management**: Express sessions with PostgreSQL storage
- **Email Service**: Gmail SMTP (support@qaaq.app)
- **WhatsApp Integration**: Primary OTP delivery.

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking assistance, location discovery, and QAAQ Store services.
- **QOI GPT**: WhatsApp bot for Q&A functionality, professional experience sharing, and maritime guidance.
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps through unified WhatsApp interface.
- **Database Access**: Direct access to shared QAAQ database.
- **Bot Documentation Storage**: Bot rules and documentation stored in `bot_documentation` table.
- **AI-Powered Responses**: Connected QBOT to OpenAI GPT-4o for intelligent maritime assistance.
- **SEMM Breadcrumb System**: Implemented System > Equipment > Make > Model categorization for technical questions.
- **Database Storage**: All QBOT interactions automatically stored in questions table with SEMM breadcrumbs.
- **File Attachments**: Clip icon attachment system to QBOT chat supporting JPG, PNG, PDF and similar formats up to 50MB with object storage integration. Direct image paste functionality.

### System Design Choices
- **Authentication System**: QAAQ User ID and Password authentication, JWT tokens, user type distinction. Cross-platform compatibility. All authentication flows redirect to "/qbot" (QBOT Chat) as the home page.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display for sailors and locals, color-coded map pins. Mobile GPS integration for real-time location.
- **Real-Time Messaging**: WebSocket-based real-time messaging with live typing indicators, instant message delivery, and read receipts.
- **QBOT Integration**: Fully functional QBOT chat system integrated across all pages with consistent functionality and UI.

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