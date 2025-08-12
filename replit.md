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
- **Web Framework**: React 18 with TypeScript, Wouter for routing, Shadcn/ui with Radix UI primitives, Tailwind CSS.
- **Mobile Framework**: React Native with Expo SDK 53, React Navigation for routing, React Native Paper, StyleSheet API.
- **State Management**: TanStack Query for server state, local React state for UI.
- **Build Tool**: Vite (web), Expo CLI (mobile).
- **Maps**: Google Maps JavaScript API (web), React Native Maps (mobile).
- **UI/UX Decisions**: QAAQ branding with orange, red, and white color scheme. Consistent UI across web and mobile. Optimized z-index hierarchy. QBOT chat interface with consistent design. Mobile-first responsive design with bottom navigation. Card-based layout for user management. Streamlined QBOT answer display.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM, shared QAAQ Admin Database.
- **Questions System**: Authentic QAAQ database with 1,244 real maritime Q&A records, redesigned question cards with orange ID numbering, minimalist layout, and edge-to-edge display. Includes dedicated `question_attachments` table for images.
- **Image Storage**: Local filesystem storage (`server/uploads/`) with WhatsApp naming pattern, served via `/uploads/` endpoint. Stable image management system (`ImageManagementService`) for all uploads, including UUID-based naming, validation, and database integration.
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens. Universal password acceptance for simplified login. Google OAuth integration.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Email Service**: Gmail SMTP.
- **WhatsApp Integration**: Primary OTP delivery, WATI integration for automated communications, and GrandMaster WATI Bot.

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking, location discovery, and QAAQ Store services.
- **QOI GPT**: WhatsApp bot for Q&A functionality and maritime guidance.
- **GrandMaster WATI Bot**: Advanced WhatsApp automation system with three flows (Conversation, Technical, Onboarding), intelligent message classification, A/B clarification, OpenAI o1-mini integration, and comprehensive state management.
- **Shared Service**: All bots serve QAAQ and other Replit apps through unified WhatsApp interface.
- **Database Access**: Direct access to shared QAAQ database with dedicated bot state management tables. Bot rules and documentation stored in `bot_documentation` table.
- **AI-Powered Responses**: QBOT uses OpenAI GPT-4o, GrandMaster Bot uses o1-mini for specialized technical responses.
- **SEMM Breadcrumb System**: System > Equipment > Make > Model categorization for technical questions.
- **File Attachments**: Clip icon attachment system in QBOT chat supporting JPG, PNG, PDF up to 50MB with object storage integration.
- **Webhook Integration**: Complete WATI webhook system for real-time message processing via `/api/wati/webhook`.

### System Design Choices
- **Authentication System**: QAAQ User ID/Password, JWT tokens, user type distinction (Free/Premium). Cross-platform compatibility. All authentication flows redirect to "/qbot".
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display, color-coded map pins. Mobile GPS integration.
- **Real-Time Messaging**: WebSocket-based real-time messaging with typing indicators, instant delivery, and read receipts.
- **QBOT Integration**: Fully functional QBOT chat system integrated across all pages with consistent functionality and UI. WhatsApp users see previous conversations when logging into webapp.
- **Payment System**: Razorpay integration for premium subscriptions (₹451/month, ₹2,611/year) and super user pay-per-question top-ups (₹451, ₹4,510), with webhook handling and admin analytics.

## External Dependencies
- **Shared QAAQ Database**: PostgreSQL database.
- **WhatsApp Bot Services**: QBOT, QOI GPT, WATI.
- **Gmail SMTP**: Email delivery.
- **Replit**: Development and deployment.
- **Radix UI**: Component primitives.
- **Tailwind CSS**: Styling framework.
- **Lucide React**: Icon library.
- **FontAwesome**: Icon library.
- **Drizzle Kit**: Database migrations.
- **Vite**: Build tool.
- **TanStack Query**: Server state management.
- **Wouter**: Routing solution.
- **OpenAI GPT-4o**: AI-powered responses.
- **Razorpay**: Payment gateway.