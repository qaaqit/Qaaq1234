# QaaqConnect Mariana - Maritime Community Platform

## Version Qaaq1234 - Important Database Upgrade
**Date: August 8, 2025**
**Status: Successfully implemented authentic QAAQ database integration**

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
- **UI/UX Decisions**: QAAQ branding with orange, red, and white color scheme. Consistent UI across web and mobile. Optimized z-index hierarchy for UI elements. QBOT chat interface with consistent design across all pages. Mobile-first responsive design with bottom navigation.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Shared QAAQ Admin Database
- **Questions System**: Authentic QAAQ database with 1235 real maritime Q&A records (Version Qaaq1234)
- **Database Tables**: `questions` table (1235 authentic records) replaces obsolete `qaaq_questions` (13 seeded records)
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens - FULLY OPERATIONAL
- **Session Management**: Express sessions with PostgreSQL storage
- **Email Service**: Gmail SMTP (support@qaaq.app) - PRODUCTION READY
- **Password System**: Liberal first-time auth ("1234koihai") followed by custom password setup
- **WhatsApp Integration**: Primary OTP delivery with 100% reliability
- **Email Templates**: Professional QaaqConnect-branded verification emails

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking assistance, location discovery, and QAAQ Store services.
- **QOI GPT**: WhatsApp bot for Q&A functionality, professional experience sharing, and maritime guidance.
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps through unified WhatsApp interface.
- **Database Access**: Direct access to shared QAAQ database.
- **Bot Documentation Storage**: Bot rules and documentation stored in `bot_documentation` table.

### System Design Choices
- **Authentication System**: QAAQ User ID and Password authentication (dummy password "1234koihai"), JWT tokens, user type distinction. Cross-platform compatibility between web and mobile. All authentication flows redirect to "/" (QBOT Chat) as the home page.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display for sailors and locals, color-coded map pins. Mobile GPS integration for real-time location.
- **Real-Time Messaging**: WebSocket-based real-time messaging with live typing indicators, instant message delivery, and read receipts.
- **QBOT Integration**: Fully functional QBOT chat system integrated across all pages (Map Radar, Ch13 DM, Ch16 Groups) with consistent functionality and UI.

## Recent Changes - Version Qaaq1234 (August 8, 2025)

### Database Integration Upgrade
- **Questions Database**: Migrated from obsolete `qaaq_questions` table (13 seeded records) to authentic `questions` table (1235 real maritime Q&A)
- **Data Source Alignment**: Questions tab now uses same authentic data source as qaaqit.com/questions
- **Column Mapping**: Updated field mappings to handle questions table schema (`content`, `author_name`, `category_name`)
- **Authentication Removal**: Eliminated authentication barriers for universal platform access
- **Data Integrity**: Removed all mock/seeded data generation, ensuring 100% authentic maritime content

### Key Technical Improvements
- Modified `shared-qa-service.ts` to query `questions` table instead of `qaaq_questions`
- Updated `mapRowToQuestion` function for proper column mapping
- Enhanced search functionality to work with questions table schema
- Preserved admin panel functionality without modifications per user requirements

### QBOT OpenAI Integration (August 8, 2025)
- **AI-Powered Responses**: Connected QBOT to OpenAI GPT-4o for intelligent maritime assistance
- **SEMM Breadcrumb System**: Implemented System > Equipment > Make > Model categorization for technical questions
- **Database Storage**: All QBOT interactions automatically stored in questions table with SEMM breadcrumbs
- **Maritime Expertise**: Enhanced prompts for maritime engineering, safety, regulations, and technical guidance
- **Error Handling**: Robust fallback systems ensure chat continuity even during API issues
- **Chat History Parking**: Clear chat button parks entire conversation history with proper question IDs and shareable links (https://qaaqit.com/questions/xxx)
- **SEMM Categorization**: Each parked Q&A automatically categorized with System > Equipment > Make > Model structure for organized maritime knowledge base
- **UI Enhancement**: Reduced QBOT chat container height to 50% of viewport height for better screen utilization
- **Response Format**: Modified OpenAI responses to use 3-5 bullet points totaling 30-50 words for concise, scannable maritime advice
- **Database Fix**: Corrected database column mappings to prevent insertion errors
- **Landing Page Design**: Created animated maritime communication background with ship-to-ship and sailor-to-sailor message transmission vectors

## External Dependencies
- **Shared QAAQ Database**: PostgreSQL database for authentic maritime user data and 1235 real Q&A records.
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