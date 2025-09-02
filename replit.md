# QaaqConnect PatalAtlantic - Next-Generation Maritime Platform

## Overview
QaaqConnect PatalAtlantic is the evolution of maritime networking platforms (beyond MARIANA, Patalbase, and PatalPacific). It provides a seamless experience for maritime professionals to explore global port networks, access AI-powered assistance via QBOT, and connect with authenticated industry peers through secure messaging. The platform features robust multi-layer authentication (Google OAuth, Replit Auth, JWT), real-time communication, and enhanced stability. Its business vision is to be the leading maritime platform connecting global port networks and industry professionals, focusing on authenticated maritime professionals, shipping companies, and port authorities worldwide.

## User Preferences
Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur Email or country code & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Home page after login: QBOT Chat (not Map Radar) - users land on QBOT Chat immediately after authentication
MARIANA BASE RULE: The app will NEVER carry out bulk assignment of users to rank groups - this functionality is permanently disabled for security
Color Scheme: Orange, cream, and white maritime professional palette - consistent across all platform interfaces.
Search Interface: Crown icon must be present in search bar, filter/map/radar icons on right side of search bar
Header Design: White header with QAAQ logo, admin shield, and QBOT button
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
Connected to QAAQ parent database - contains 948+ authentic maritime professionals with real profile data
Scope Focus: Core "Koi Hai?" discovery functionality - CPSS navigation and social features removed from roadmap
Active Conversations section completely removed - only Top Q Professionals cards remain in compact format (6 cards per screen)
Mobile Optimization: Responsive layout with touch-friendly controls and compact design
Enhanced Search: Updated placeholder to "Sailors/ Ships/ Company" for better user guidance
Admin shield location: Keep admin shield in header top right corner (not in bottom navigation)
Header visibility: Show white header only for admin users, regular users should not see the header
Premium mode: Crown icon in search box toggles premium Google Maps features, requires premium plan for non-admin users
WhatsApp Bot: Moved from map overlay to header button next to logout for cleaner map interface
Google Maps Controls: Transparent icon-only buttons positioned in bottom-left corner (Road/Satellite/Hybrid view toggles), zoom controls (+ and - buttons) positioned in top-right corner below map maximize box
Home Reset Button: Red "Home" button in top-left corner resets search, filters, and returns to base map view
User Card Interactions: Profile photo circles are clickable for chat, clicking card body centers map on user location
Onboard Search: Special "onboard" keyword search filters for sailing users and displays ship name & IMO number prominently
Shipping Dictionary Access: Users can access maritime dictionary definitions without authentication
Login Roadblock Design: Single minimizable login roadblock with chevron control in top-right corner, no separate roadblocks for individual features
Breadcrumb positioned next to back arrow as small text in one line, code cards positioned in top-left corner with back arrow above
Enhanced Reorder System: Admin reorder modals now feature editable code cards allowing direct code modification alongside position changes for comprehensive hierarchy management. Simplified reorder buttons use only RotateCcw icon without text or colored backgrounds for cleaner interface.
S>E>M>M hierarchical structure where System=Great Grandfather, Equipment=Grandfather, Make=Father, Model=Son. CRITICAL RULE: All transfers must move complete family units - Equipment moves with ALL its Makes+Models, Make moves with ALL its Models. No Model exists without parent Make, no Make without parent Equipment. They are inseparable hardbound families that must always move together during any SEMM operations.

## System Architecture

### Frontend Architecture
- **Web Framework**: React 18 with TypeScript, Wouter for routing, Shadcn/ui and Radix UI for components, Tailwind CSS for styling.
- **Mobile Framework**: React Native with Expo SDK 53, React Navigation for routing, React Native Paper for UI, StyleSheet API for styling.
- **State Management**: TanStack Query for server state, local React state for UI.
- **Build Tool**: Vite (web), Expo CLI (mobile).
- **Maps**: Google Maps JavaScript API (web), React Native Maps (mobile).
- **UI/UX Decisions**: QAAQ branding with orange, cream, and white color scheme. Consistent UI across web and mobile. Optimized z-index hierarchy, QBOT chat interface, mobile-first responsive design with bottom navigation, card-based layout for user management, streamlined QBOT answer display, airport departure board design aesthetic for SEMM code displays.

### Backend Architecture
- **Runtime**: Node.js with Express.js, TypeScript.
- **Database**: Enhanced PostgreSQL with advanced connection pooling, retry logic, health monitoring, and hibernation prevention. Shared QAAQ Admin Database with subscription tables. Database management services include DatabaseKeeper, ConnectionPoolManager, SyncManager, and automated migration helper.
- **Questions System**: Authentic QAAQ database with real maritime Q&A records and `question_attachments` table.
- **Image Storage**: Local filesystem storage (`server/uploads/`) managed by `ImageManagementService`.
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens. Universal password acceptance with automatic user creation.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Payment System**: Production Razorpay integration with enhanced database connection reliability, automatic retry logic, and comprehensive subscription management. Features automatic webhook system with multi-method user identification for seamless payment processing. Automatic premium activation with welcome email and UI updates.
- **AI Token Management**: Configurable token limits for free users, unlimited for premium users, adjustable via admin dashboard.
- **Performance Optimization**: Removed unnecessary auto-refresh intervals from analytics dashboard and QBOT subscription checks; analytics load on-demand.
- **QBOT Premium Access**: QBOT is exclusively for premium subscribers; free users see subscription prompt.

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking, location discovery, QAAQ Store, and Q&A. Integrates with OpenAI GPT-4o, Gemini, and Deepseek.
- **QOI GPT**: WhatsApp bot for Q&A, professional experience sharing, and maritime guidance. Integrates with OpenAI and Gemini for structured responses.
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps via a unified WhatsApp interface with direct access to the shared QAAQ database.
- **SEMM Hierarchy System**: Complete 4-level System > Equipment > Make > Model categorization with integrated header breadcrumbs, dropdown navigation, and authentic maritime equipment classification. Full admin reordering system with inline controls and alphabetical code generation.
- **File Attachments**: Clip icon attachment system to QBOT chat supporting JPG, PNG, PDF (up to 50MB) with object storage integration.

### System Design Choices
- **Dual Authentication System**: QAAQ JWT token and Replit OpenID Connect. All successful logins redirect to "/qbot".
- **WhatsApp Cross-Platform Integration**: Users see previous WhatsApp Q&A history in webapp.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery, city-based location display, color-coded map pins, mobile GPS integration, map zoom and navigation controls.
- **Real-Time Messaging**: WebSocket-based real-time messaging with live typing indicators, instant message delivery, and read receipts.
- **QBOT Integration**: Fully functional QBOT chat system across all pages with multi-AI model selection (ChatGPT, Gemini, Deepseek).
- **Database Synchronization & Performance Features**: Keep-Alive service, Connection Pool Management, Data Synchronization, Performance Monitoring, Automated Maintenance, Admin Controls.
- **SEMM Implementation**: Complete System > Equipment > Make > Model hierarchy with authentic data, dedicated equipment pages, admin-only editing controls, and enhanced reorder functionality with editable code cards.

## Recent Changes
- **🏷️ GANPATI BUILD CHECKPOINT (September 2, 2025)** - Major milestone sealed for rollback capability
  - WhatsApp bot functions selectively disabled: Koi Hai discovery, ship detection, help system
  - Only greeting functionality remains active in WhatsApp bot
  - Full project export functionality implemented and tested (react-full-app.zip available)
  - System running stable with healthy authentication monitoring
  - Database connections optimized and performing well
  - All core maritime platform features operational and tested
  - Ready for production deployment or further development

## External Dependencies
- **Shared QAAQ Database**: PostgreSQL database for maritime user data and Q&A records.
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
- **Google Maps JavaScript API**: For web mapping.
- **React Native Maps**: For mobile mapping.
- **OpenAI GPT-4o**: For QBOT AI-powered responses.
- **Google Gemini API**: For QOI GPT AI-powered responses.
- **Razorpay**: Production-ready subscription system for payments.