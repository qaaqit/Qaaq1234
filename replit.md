# QaaqConnect - Maritime Community Platform

## Overview

QaaqConnect is a minimalistic location-based maritime discovery platform focused on "Koi Hai?" (Who's there?) functionality and QAAQ Store services. The app helps sailors find nearby maritime professionals through an interactive world map and provides essential services through the integrated QAAQ Store. Key features include proximity-based user discovery, real-time location mapping, WhatsApp integration for direct communication, and a curated marketplace for maritime essentials. The platform maintains a clean, focused approach with plans to expand features in future versions.

## User Preferences

Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
User data: Connected to QAAQ parent database - contains test/seed data with 2 real users (+919029010070, +919920027697) and 10 test maritime profiles
CPSS Navigation: Implemented hierarchical Country→Port→Suburb→Service structure with SEMM-like content cards
CPSS Features: Endless scroll, like/share functions, card carousels, breadcrumb navigation
CPSS Content: Maritime meetups, local tours, port dining, shore shopping, cultural experiences
Admin shield location: Keep admin shield in header top right corner (not in bottom navigation)
Header visibility: Show white header only for admin users, regular users should not see the header
Premium mode: Crown icon in search box toggles premium Google Maps features, requires premium plan for non-admin users
WhatsApp Bot: Moved from map overlay to header button next to logout for cleaner map interface
Google Maps Controls: Transparent icon-only buttons positioned in bottom-left corner (Road/Satellite/Hybrid view toggles)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **UI Framework**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom maritime theme
- **State Management**: TanStack Query for server state, local React state for UI
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Shared QAAQ Admin Database (serves both QAAQ and QaaqConnect)
- **Authentication**: JWT-based with email verification
- **Email Service**: Gmail SMTP via nodemailer (switched from SendGrid per user request)
- **Session Management**: Express sessions with PostgreSQL storage

### Bot Integration Architecture
- **QBOT**: WhatsApp bot for maritime networking assistance, location discovery, and QAAQ Store services
- **QOI GPT**: WhatsApp bot for Q&A functionality, professional experience sharing, and maritime guidance
- **Shared Service**: Both bots serve QAAQ, QaaqConnect, and other Replit apps through unified WhatsApp interface
- **Database Access**: Direct access to shared QAAQ database for consistent user data across all platforms
- **Bot Documentation Storage**: Bot rules and documentation stored in bot_documentation table, accessible by all sister apps via simple key-value queries

### Database Design
- **Users Table**: Stores user profiles with sailor/local distinction, verification status, and login tracking
- **Posts Table**: Social content with categories, location tagging, and author display preferences
- **Likes Table**: User engagement tracking for posts
- **Verification Codes Table**: Time-limited email verification system

## Key Components

### Authentication System
- QAAQ User ID and Password authentication with dummy password system
- User ID accepts: Full Name, Email, or Phone Number from QAAQ admin database
- Password system: Simple dummy password "1234koihai" for all users (temporary solution)
- JWT tokens for session management with 30-day expiration
- User type distinction (sailor vs local) for personalized experiences
- Chrome password manager compatibility - users typically save credentials after first login

### Social Features
- Post creation with rich content support
- Category-based content organization (Local Discovery, Maritime Meetup, Port Experience, etc.)
- Location tagging for geographic relevance
- Like/unlike functionality with real-time count updates
- Author display options (full name, nickname, anonymous)

### CPSS Navigation System
- **Hierarchical Structure**: Country → Port → Suburb → Service navigation
- **SEMM-like Interface**: Cards with author profiles, ranks, ship details, timestamps
- **Social Interactions**: Like/heart button, share functionality, comment/reply options
- **Endless Scroll**: Infinite loading with intersection observer for performance
- **Content Categories**: Maritime Meetups, Local Tours, Port Dining, Shore Shopping, Cultural Experiences
- **Breadcrumb Navigation**: Easy navigation back through hierarchy levels
- **Card Carousels**: Smooth content browsing with loading indicators

### Discovery System
- Interactive world map with light grey theme (CartoDB tiles)
- Map loads empty initially, shows pins only when "Koi Hai?" is pressed
- Proximity-based discovery showing nearest 10 users without search text
- **Accurate Location Display**: Shows users' actual locations from QAAQ database coordinates
  - Sailors: Displayed at their ship's current location or port
  - Locals: Displayed at their home city location
  - Automatic user type detection based on ship assignment
- Ship information display (name, port, visit windows) without IMO numbers
- Map pins color-coded by user type (navy for sailors, teal for locals)
- Authentication-required proximity search with Haversine distance calculation

### UI/UX Design
- Maritime-themed color palette (navy blue, ocean teal, duck yellow)
- Mobile-first responsive design with bottom navigation
- Progressive Web App features
- Comprehensive component library with consistent styling

## Data Flow

### User Registration Flow
1. User selects sailor or local type and provides basic information
2. System creates unverified user account and generates JWT
3. Verification email sent via SendGrid with 6-digit code
4. User enters code to complete verification
5. Account activated and user redirected to main application

### Content Discovery Flow
1. Authenticated users access discovery feed
2. Posts loaded via TanStack Query with caching
3. Real-time search and filtering applied client-side
4. Infinite scroll or pagination for performance

### Social Interaction Flow
1. Users create posts with category and location context
2. Content stored with author preferences and metadata
3. Other users discover and interact through likes
4. Real-time updates maintain engagement metrics

## External Dependencies

### Core Infrastructure
- **Shared QAAQ Database**: PostgreSQL database serving both QAAQ and QaaqConnect with authentic maritime user data
- **WhatsApp Bot Services**: QBOT and QOI GPT providing unified bot services across multiple Replit apps
- **Gmail SMTP**: Email delivery service for verification
- **Replit**: Development and deployment platform for all integrated apps

### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **FontAwesome**: Additional maritime-themed icons

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **Vite**: Fast development server and build tool
- **TanStack Query**: Server state management
- **Wouter**: Lightweight routing solution

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- Replit integration with live preview and collaborative editing
- Environment variables for database and API keys
- TypeScript compilation with strict mode

### Production Build
- Vite optimized build with code splitting
- Express server bundle with ESBuild
- Static asset serving from Express
- Database migrations via Drizzle Kit

### Database Management
- Schema-first design with Drizzle ORM
- Migration-based database updates
- Connection pooling for serverless environment
- Environment-based configuration

## Recent Changes

### Real QAAQ Question Integration (January 30, 2025)
- **Authentic Data Source**: Successfully integrated real QAAQ question metrics from Notion database "User Question Metrics" (23f533fe-2f81-8143-be0c-c6ac6dabaf51)
- **Question Count Accuracy**: System now displays actual question counts for 40+ maritime professionals from QAAQ parent app database
- **Data Limitation Discovery**: Found that QAAQ Notion databases contain question metrics (counts, dates) but not actual question content/text
- **User Profile Enhancement**: User cards and profile pages show real question counts with clear indication when using authentic QAAQ data
- **No Generated Content**: Removed all generated/sample questions - system only shows verified question counts from QAAQ metrics
- **Data Source Transparency**: Added "Real QAAQ Data" badges and explanatory messages when displaying authentic metrics vs. unavailable content
- **WhatsApp vs Web Breakdown**: Integration captures breakdown of questions asked via WhatsApp bot vs. web interface from QAAQ system
- **API Integration**: Created `/api/users/:userId/profile` endpoint that fetches real QAAQ metrics and updates question counts from authentic data

### Bot Rules Database Storage (January 29, 2025)
- **QBOT Rules Storage**: Successfully stored QBOTRULESV1.md in shared QAAQ database using bot_documentation table
- **Cross-App Accessibility**: All sister apps can now access bot rules via SQL query: `SELECT doc_value FROM bot_documentation WHERE doc_key = 'QBOTRULESV1'`
- **Database Architecture**: Created simple key-value bot_documentation table for storing bot documentation and rules
- **Admin Panel Integration**: Updated admin panel to fetch and display QBOT rules dynamically from database instead of static files
- **API Endpoints**: Added `/api/bot-documentation/:key` and `/api/bot-documentation` endpoints for accessing bot rules
- **Real-time Updates**: Sister apps can freely read, update, and share bot documentation in real-time through the shared database

### Navigation Streamlining & Q&A Integration (January 29, 2025)  
- **Bottom Navigation Reduction**: Reduced to 2 tabs for regular users (Ch13 DM, Ch16 Broadcast) and 3 tabs for admin users (+ Admin Panel)
- **Channel-Based Naming**: Renamed QChat to "Ch13 DM" and Post to "Ch16 Broadcast" with two-line button layout for better fit
- **QAAQ Q&A Count Display**: Added question and answer count display in user cards showing format like "E/C 5Q2A" after user rank
- **Database Schema Enhancement**: Added questionCount and answerCount fields to users table with automatic tracking
- **Comprehensive Q&A Integration**: Updated all user card displays across DM page, Google Maps, Users Map, and QChat window
- **QBOT & QOI GPT Rules Integration**: Added comprehensive rules and guidelines sections in admin panel for both bot systems
- **Admin Panel Enhancement**: Displayed QBOT rules (networking, location discovery, WhatsApp integration) and QOI GPT rules (Q&A functionality, engagement standards, content moderation)
- **Discover Tab Removed**: Eliminated Discover from bottom navigation to reduce clutter
- **Home Logo Integration**: Added clickable QaaqConnect logo to Ch13 DM and Ch16 Broadcast page headers for easy return to Discover page
- **QHF Integration**: Moved QHF functionality into Ch13 DM button, eliminating separate navigation item
- **Consistent Navigation**: Both top-left circle icon on Discover page and header logos on other pages navigate to home page (/)
- **Header Removal**: Eliminated admin header requirement, creating cleaner interface for all users
- **WhatsApp Bot Rebranding**: Updated bot control to "Discover Bot Assistant" for better alignment with navigation structure
- **Simplified User Flow**: Users access Discover via logos, chat via Ch13 DM tab, broadcasting via Ch16 Broadcast tab, admin via Admin Panel tab (admin only)

### Minimalistic App Focus (January 29, 2025)
- **Simplified Architecture**: Removed maritime events management system to maintain focus on core features
- **QAAQ Store Integration**: Kept full QAAQ Store functionality for maritime professionals to order essentials
- **WhatsApp Events Integration**: Replaced internal chat with WhatsApp direct link for event coordination (+905363694997)
- **"Koi Hai?" Discovery**: Maintained proximity-based user discovery as primary feature
- **Database Cleanup**: Removed maritime_events and event_attendees tables from schema
- **UI Streamlined**: Updated bottom navigation to show WhatsApp Events instead of internal QChat
- **Focus Areas**: App now concentrates on two main features: location-based discovery and store services
- **Future Planning**: Maritime events and advanced chat features reserved for next version
- **Search Migration**: Moved search functionality from discover page to CPSS Navigator for focused "Koi Hai?" discovery
- **Global CPSS Expansion**: Added 10 countries and ports based on authentic QAAQ user locations (Brazil, China, Germany, India, Japan, Netherlands, Panama, Singapore, UAE, USA)

### Premium Google Maps Integration (January 29, 2025)
- **Google Maps API Integration**: Implemented premium Google Maps features for admin/premium QAAQ users
- **Enhanced Map Features**: Added satellite view, street view, hybrid view, and improved navigation controls
- **User Discovery on Google Maps**: Integrated nearby user fetching and display on premium Google Maps
- **Map Type Toggle**: Added UI controls to switch between standard Leaflet maps and premium Google Maps
- **Maritime-themed Styling**: Applied navy blue water styling and maritime-focused map customization
- **Smart Zoom Logic**: Implemented same intelligent zoom rule as regular map - centers on user location with expanding radius (50km → 500km) until at least 9 users are shown
- **Premium User Detection**: Enhanced user authentication to identify premium users (admin accounts)
- **Interactive Markers**: Custom markers with user info windows, WhatsApp connect buttons, and maritime rank display
- **Real-time Location**: Integrated device location tracking with Google Maps for enhanced positioning
- **Loading States**: Added loading indicators and error handling for premium map features

### QChat DM Page Implementation (January 29, 2025)
- **Comprehensive DM Interface**: Created dedicated DM page with existing chat cards followed by user cards sorted by distance
- **Distance-Based Discovery**: Implemented `/api/users/nearby` endpoint with Haversine distance calculation for accurate user proximity
- **Chat Management**: Organized chat interface with active conversations, pending requests, sent requests, and new user discovery
- **Interactive User Cards**: Maritime-themed user cards with distance display, ship information, rank, and location details
- **Search Functionality**: Real-time search across user names, ranks, ship names, and locations
- **Connection Management**: Full chat connection workflow with request sending, acceptance, and messaging
- **Navigation Update**: Updated bottom navigation to make QChat the primary chat interface
- **Mobile-First Design**: Responsive cards layout with maritime color coding and professional styling

### Enhanced Location System for Maritime Discovery (January 28, 2025)
- **QAAQ Authorization Integration**: Updated location system to use password field as temporary city storage during QAAQ authorization flow
- **Multi-source Location**: Implemented priority-based location derivation: 1) Ship IMO tracking 2) Device GPS 3) City mapping 4) Password field fallback
- **Device Location API**: Added `/api/users/location/device` endpoint for real-time GPS coordinate updates from mobile/browser
- **Ship Location API**: Added `/api/users/location/ship` endpoint for IMO-based vessel position tracking
- **Enhanced Schema**: Added `deviceLatitude`, `deviceLongitude`, `locationSource`, and `locationUpdatedAt` fields to support multi-source positioning
- **Location Hooks**: Created `useLocation` React hook with GPS permission handling, device location updates, and ship tracking functionality
- **UI Integration**: Added location control buttons to discover page with real-time status display and error handling
- **WhatsApp Auth Flow**: Integrated WhatsApp number as User ID and City name as password for QAAQ authorization process

### Admin CPSS Management System (January 28, 2025)
- **Admin Controls**: Added reorder, edit, and delete functionality for all CPSS list items
- **Preferential Listing**: Admin users (+919029010070 & mushy.piyush@gmail.com) can move items up/down for priority ranking
- **Content Management**: Comprehensive edit dialog for title, content, author details, category, and tags
- **Admin Authentication**: Enhanced useAuth hook to identify admin users based on phone/email
- **Visual Admin Controls**: Dedicated admin button section with move, edit, and delete icons
- **Real-time Updates**: Immediate UI updates for all admin actions with toast notifications
- **Admin Navigation**: Added back arrow button to navigate from admin panel to home page

The application follows modern web development patterns with emphasis on type safety, performance, and user experience. The maritime theme and social features are designed to foster genuine connections between sailors and local communities worldwide.