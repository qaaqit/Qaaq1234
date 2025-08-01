# QaaqConnect - Maritime Community Platform

## Overview
QaaqConnect is a comprehensive maritime networking platform designed to enhance shore leaves, simplify shopping for sailors, and facilitate social connections. It enables sailors to discover nearby peers and locals, access a curated marketplace for maritime essentials, and engage in location-based discussions. The platform aims to foster an authentic maritime community experience by integrating proximity-based user discovery, real-time location mapping, direct communication tools, and a structured content navigation system.

## Recent Major Changes
- **January 2025**: Completely removed AIS (Automatic Identification System) API integration for real-time ship tracking. The system now focuses solely on user-based location discovery without external ship tracking capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
User data: Connected to QAAQ parent database - contains test/seed data with 2 real users (+919029010070, +919920027697) and 10 test maritime profiles
Scope Focus: Core "Koi Hai?" discovery functionality - CPSS navigation and social features removed from roadmap
Mobile Optimization: Responsive layout with touch-friendly controls and compact design
Enhanced Search: Updated placeholder to "Sailors/ Ships/ Company" for better user guidance
Admin shield location: Keep admin shield in header top right corner (not in bottom navigation)
Header visibility: Show white header only for admin users, regular users should not see the header
Premium mode: Crown icon in search box toggles premium Google Maps features, requires premium plan for non-admin users
WhatsApp Bot: Moved from map overlay to header button next to logout for cleaner map interface
Google Maps Controls: Transparent icon-only buttons positioned in bottom-left corner (Road/Satellite/Hybrid view toggles)
Home Reset Button: Blue "Home" button in top-left corner resets search, filters, and returns to base map view
User Card Interactions: Profile photo circles are clickable for chat, clicking card body centers map on user location
Onboard Search: Special "onboard" keyword search filters for sailing users and displays ship name & IMO number prominently

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **UI Framework**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom maritime theme
- **State Management**: TanStack Query for server state, local React state for UI
- **Build Tool**: Vite

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
- **Authentication System**: QAAQ User ID and Password authentication (dummy password "1234koihai"), JWT tokens, user type distinction.
- **Social Features**: Post creation with content categories and location tagging, like/unlike functionality, author display options.
- **CPSS Navigation System**: Hierarchical Country → Port → Suburb → Service navigation, SEMM-like interface with content cards, endless scroll, breadcrumb navigation, and card carousels.
- **Discovery System**: Interactive world map with light grey theme, proximity-based user discovery showing nearest users, city-based location display for sailors and locals, color-coded map pins.
- **UI/UX Design**: Maritime-themed color palette, mobile-first responsive design with bottom navigation, PWA features, consistent component library.
- **QChat DM Page**: Dedicated DM page with existing chat cards and distance-sorted user cards, distance-based discovery, chat connection workflow.

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