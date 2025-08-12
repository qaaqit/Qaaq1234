# QaaqConnect Mariana - Maritime Community Platform

## Overview
QaaqConnect is a comprehensive maritime networking platform designed to enhance shore leaves, simplify shopping for sailors, and facilitate social connections. It enables sailors to discover nearby peers and locals, access a curated marketplace for maritime essentials, and engage in location-based discussions. The platform aims to foster an authentic maritime community experience by integrating proximity-based user discovery, real-time location mapping, direct communication tools, and a structured content navigation system.

Business Vision: To be the leading platform for maritime professionals, fostering genuine connections and simplifying life at sea and ashore.
Market Potential: Tapping into the global maritime industry, connecting a vast network of sailors, ship companies, and related businesses.
Project Ambitions: To create a vibrant, self-sustaining community where maritime professionals can thrive personally and professionally.

## Version Milestones
**QaaqSlow Version** (August 10, 2025) - Above Base & Deadslow versions ✅ SEALED
- Successfully implemented redesigned question card layout with clean minimalist design
- Orange question ID numbering system (#1251, #1250, etc.)
- Eliminated QG circle avatars, replaced "Assistant" with "Ans:" labels
- Edge-to-edge card layout with no gaps between cards or screen borders
- Clean answer text flowing directly after "Ans:" without line breaks
- Displaying all 1,244 authentic maritime questions from QAAQ parent database
- Consistent URL structure and navigation throughout Q&A system
- **Universal Login System**: Any password accepted for any user with automatic password updates
- **WhatsApp Cross-Platform Integration**: Users see their previous WhatsApp Q&A history when logging into webapp
- **Replit-Style Chat Interface**: Paperclip and crown icons embedded inside text box, send button outside
- **Premium Mode Feature**: Crown toggle for enhanced features with visual feedback
- **Auto-Assignment Disabled**: Manual group joining only - no automatic user assignment to rank groups
- **Razorpay Payment Integration**: Complete subscription system with premium subscriptions (₹451/month, ₹2,611/year) and super user pay-per-question topups (2 options: ₹451, ₹4,510), payment processing, webhook handling, and admin analytics dashboard
- **Encrypted/Anonymous Chat**: Privacy shield icon for premium users enabling encrypted chat without database storage
- **Streamlined Super User Packs**: Simplified to 2 options (₹451 Starter, ₹4,510 Max) with column-style comparison layout
- **Silent Crown Toggle**: Removed promotional toast messages for distraction-free premium mode switching
- **Google OAuth Authentication**: Complete Google OAuth integration with professional login button, backend authentication service, and callback handling for seamless user authentication using Google accounts. Configured with custom domain https://qaaq.app/api/auth/google/callback for production use
- **Fixed Chat Authentication**: Resolved JWT token authentication issue where chat components were using incorrect localStorage key. Chat messaging now works properly with qaaq_token authentication (August 10, 2025)
- **Database Schema Fixed**: Resolved login authentication by adding missing database columns and user_id mapping. Login system now fully operational with universal password acceptance (August 11, 2025)
- **User Type System**: Implemented Free/Premium subscription tiers with Razorpay integration. All users default to "Free" type with upgrade paths to Premium and Super tiers (August 11, 2025)
- **Fixed Admin Question Archiving**: Resolved issue where admin archiving questions redirected to QBOT chat page. Admin now stays on current page with data refetch instead of page reload (August 12, 2025)
- **Authentic Location Data Enhancement**: Enhanced location data for 211 maritime professionals using genuine current_city data from user profiles. Major maritime cities represented: Mumbai (39), Kolkata (10), New Delhi (8), Pune (8), Chennai (4), Bengaluru (4), and 30+ other authentic Indian cities plus Bangkok. All sample/enriched data removed, displaying only real maritime professionals with verified location information (August 12, 2025)

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
- **Questions System**: Authentic QAAQ database with 1,244 real maritime Q&A records with separate attachment tracking system. QaaqSlow version features redesigned question cards with orange ID numbering, clean minimalist layout, and edge-to-edge display without gaps.
- **Question Attachments**: Dedicated `question_attachments` table with unique IDs for tracking questions with images/attachments. Currently tracking 32+ authentic maritime question images stored locally in Replit filesystem, each linked to real QAAQ technical questions from maritime professionals, with separate UUID-based attachment IDs for enhanced organization and retrieval. Latest download added 26 new question-image links covering engines, pumps, compressors, valves, generators, and other maritime equipment.
- **Image Storage**: Transitioned from Google Cloud Storage to local filesystem storage. Authentic maritime question images stored in `server/uploads/` directory with WhatsApp naming pattern (`whatsapp_[number]_[timestamp].jpg`) for direct serving via `/uploads/` endpoint. System supports multiple image sources for comprehensive maritime content display. Total storage: 2.6MB with 8 authentic maritime images. Fixed grey box issue by mapping only real image files to carousel, eliminating placeholder SVG files.
- **Stable Image Upload System**: Implemented comprehensive stable image management system with `ImageManagementService` class for handling all future uploads from web and WhatsApp. Features include: automated file processing, UUID-based unique naming, validation for file types and sizes (up to 50MB), proper database integration with `question_attachments` table, and cleanup utilities for unused images.
- **Image Upload Endpoints**: Created dedicated API endpoints (`/api/questions/:questionId/upload-image`) for stable web-based uploads and WhatsApp integration. System automatically handles source detection, proper URL generation, and carousel integration.
- **Question Card Design**: QaaqSlow version implements clean card layout with orange question IDs, "Ans:" labels replacing assistant avatars, and seamless edge-to-edge display eliminating all gaps between cards and screen borders.
- **Authentication**: Dual OTP verification (WhatsApp + Email) with JWT tokens. Universal password acceptance with automatic user creation. Any password works for any user to simplify login experience.
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
- **QBOT Integration**: Fully functional QBOT chat system integrated across all pages with consistent functionality and UI. WhatsApp users see their previous conversations when logging into webapp for seamless cross-platform experience.

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