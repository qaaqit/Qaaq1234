# QaaqConnect - Maritime Community Platform

## Overview

QaaqConnect is a comprehensive maritime networking platform serving three core purposes:
1. **Memorable Shore Leaves**: Enables sailors to check other sailors' experiences and anonymous feedback about ports and destinations
2. **Hassle-Free Shopping**: Provides access to all Amazon SKUs for sailors to order, with QAAQ Store handling storage and delivery logistics
3. **Nearby Social Network**: Helps sailors and locals connect to make new friends through location-based discovery

The platform combines proximity-based user discovery, real-time location mapping, WhatsApp integration for direct communication, CPSS group navigation for location-based discussions, and a curated marketplace for maritime essentials. Built with a focus on authentic maritime community experiences and practical shore leave solutions.

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
- Anchor pins visible immediately on map load for user browsing
- "Koi Hai?" button only reveals "Nearby Maritime Professionals" card list
- Proximity-based discovery showing nearest 10 users without search text
- **City-Based Location Display**: Shows users at their profile city/port locations instead of GPS coordinates
  - Sailors: Displayed at their current city or home port from profile
  - Locals: Displayed at their home city location from profile
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

### Ch13 DM Tab Navigation Implementation (January 31, 2025)
- **Tab-Based Interface**: Added "Users" and "Questions" tabs to Ch13 DM page, following Ch16 pattern
- **Users Tab**: Moved "Top Q Professionals" list to Users tab with all existing chat connection functionality
- **Questions Tab**: Created placeholder for future QOI GPT Q&A functionality integration
- **Consistent UI**: Applied maritime-themed tab styling matching Ch16 Shore Leave/My Groups design
- **Tab State Management**: Added activeTab state with proper tab switching functionality

### Database Migration to QAAQ Production System (January 31, 2025)
- **Direct PostgreSQL Access**: Successfully connected to user's specific Neon PostgreSQL database at ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech
- **Database Status**: QAAQ Production Database contains 682 authentic maritime professionals with 559 having WhatsApp numbers
- **Real Maritime Data**: Database includes Chief Engineers, Deck Cadets, Engine Cadets with authentic WhatsApp contacts, ship assignments, and Q&A activity
- **Override Replit Database**: Configured app to use user's Neon database instead of auto-created Replit database (falling-fire-56992496)
- **Production Database Connected**: Using postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb
- **No Notion Integration**: Removed all Notion API integration - now using direct PostgreSQL access with 70 properly structured tables

### QOI GPT Search Interface Enhancement (January 31, 2025)
- **AI Search Placeholder**: Updated search placeholder text to "AI Search. Ask anything.." across the platform
- **Ch13 DM Search**: Primary QOI GPT integration point now clearly indicates AI-powered search capabilities
- **CPSS Navigator Search**: Aligned search interface with AI branding for consistent user experience
- **User Experience**: Search boxes now clearly communicate AI-powered assistance for maritime questions and discovery

### Maritime Rank Groups System Implementation (January 30, 2025)
- **9 Rank-Based Groups Created**: Implemented complete maritime rank group system: Mtr CO, 2O 3O, CE 2E, 3E 4E, Cadets, Crew, ETO, Superintendents, Marine Professionals
- **WhatsApp-Style Functionality**: Each rank group functions like WhatsApp groups with join/leave, posting, member management, and real-time discussions
- **Single Group Membership**: Users can only join one rank group at a time - joining a new rank group automatically removes them from their current one
- **Admin Default Membership**: Admin users are default members of all rank groups while regular users are limited to single membership
- **Dropdown Selection Interface**: Replaced policy text with space-efficient dropdown for rank group selection with Chat and Leave Group buttons
- **Active Group Indicator**: Visual status showing current rank group membership with member count and green activity indicator
- **Dedicated API Endpoints**: Added specialized endpoints for rank groups (`/api/cpss/groups/rank-groups`, `/api/cpss/groups/all-ranks`) separate from location-based CPSS groups
- **Sample Content Seeded**: Pre-populated groups with authentic maritime discussions, member assignments based on typical career paths, and realistic member counts
- **Rank Groups Tab**: Complete UI implementation showing dropdown selection with join/chat functionality, member counts, and professional descriptions
- **Recently Joined Priority**: Groups user recently joined appear at top of list for easier access
- **Interface Rename**: Changed "My Groups" to "Rank Groups" and "Discover Groups" to "Shore Leave" for better maritime terminology alignment
- **WhatsApp-Style Messaging**: Replaced Facebook-style posts (with like/share/comment buttons) with simple WhatsApp-style message bubbles showing only user avatar, name, timestamp, and message text
- **Bottom Text Entry**: Added sticky bottom text input box with arrow send button instead of "+ New Post" dialog for seamless WhatsApp-like messaging experience

### CPSS Group Ordering & Interface Updates (January 30, 2025)
- **Recently Joined Groups Priority**: Modified CPSS group ordering system so recently joined groups appear at top of "Discover Groups" card list
- **Database Query Enhancement**: Updated getAllCPSSGroups function with user authentication to prioritize joined groups chronologically
- **Cache Invalidation**: Enhanced mutation success handlers to refresh both user groups and all groups for immediate UI updates
- **Personalized Discovery**: Groups API now uses user ID for personalized ordering while maintaining backward compatibility

### Display All 100 Users Instead of Proximity-Limited 9 (January 30, 2025)
- **Removed Smart Zoom Proximity Logic**: Eliminated the 9-user limitation that only showed nearest users within expanding radius (50km → 500km)
- **Global User Display**: Modified both Leaflet and Google Maps components to display all 100 authentic QAAQ maritime professionals simultaneously
- **City-Based Plotting**: Users plotted at their city/port locations instead of GPS coordinates for better maritime coverage
- **Enhanced Location Mapping**: Added comprehensive Indian state and maritime port mapping (Andhrapradesh → Vizag port coordinates)
- **Immediate Pin Visibility**: All anchor pins now visible on map load without requiring "Koi Hai?" button press for better user browsing experience
- **Real User Integration**: Successfully displaying 100 authentic QAAQ users from Notion database with valid city coordinates across global maritime locations

### CPSS Group System for Ch16 Broadcast (January 30, 2025)
- **360 Location-Based Groups**: Implemented comprehensive hierarchical CPSS group system across 10 countries with breadcrumb navigation
- **Group Management**: Created complete group lifecycle with joining, leaving, posting, and member management functionality
- **Database Architecture**: Built `cpss_groups`, `cpss_group_members`, and `cpss_group_posts` tables for scalable group operations
- **Ch16 Broadcast Transformation**: Redesigned Post page into group-based communication system with My Groups and Discover tabs
- **CPSS Tree Navigation**: Groups follow Country→Port→Suburb→Service hierarchy with collapsible tree structure and visual breadcrumb display
- **Icon-Only Interface**: Streamlined group interaction with UserPlus icon for joining and Share icon for group links (removed heart/like button and join text)
- **Real-time Posting**: Members can create posts, view discussions, and participate in location-specific maritime conversations
- **Global Coverage**: Seeded groups across India, Singapore, UAE, Turkiye, Germany, Netherlands, Belgium, Cyprus, USA, China
- **Group Discovery**: Search and filter functionality for finding relevant maritime groups by location and type
- **Member Authentication**: Post viewing and creation restricted to group members with proper role management
- **Database Connection Fix**: Resolved DATABASE_URL connection issues to properly display CPSS tree in Discover Groups tab

### User Interface Improvements & Hindi Tagline Addition (January 30, 2025)
- **User Dropdown Implementation**: Created comprehensive user dropdown component replacing separate logout/admin buttons
- **Hindi Tagline Integration**: Added "जगह देख के बात करो.." tagline below QaaqConnect logo across all pages
- **Welcome Message Relocation**: Moved personalized welcome message to user dropdown below profile photo
- **Dark Theme Dropdown**: Implemented dark slate theme matching parent app design with smooth animations
- **Menu Structure**: Added comprehensive menu items including My Page, Update CV/Profile, My Questions, Friends, Messages, Storage Management, and conditional Admin Panel access
- **Consistent Branding**: Applied tagline styling across Discover, DM (Ch13), and Post (Ch16 Broadcast) pages
- **Avatar Integration**: User initials displayed in circular avatar with proper fallback handling

### Shared Q&A System for Sister Apps (January 30, 2025)
- **Centralized Question Storage**: Created shared PostgreSQL database tables (`qaaq_questions`, `qaaq_answers`) for all sister apps to store and access question content
- **Cross-App API Endpoints**: Implemented REST APIs for storing questions (`/api/shared/questions`) and answers (`/api/shared/answers`) from any sister app
- **Sister App Integration**: WhatsApp bots, web interfaces, and mobile apps can now store questions in shared database for unified access
- **My Questions Page**: Created qaaqit.com/my-questions style user page at `/my-questions` showing user's questions with filters (All, Recent, Unresolved, Resolved)
- **Real Question Content**: System now displays actual question text, categories, tags, source (WhatsApp/Web), and answers from shared database
- **Data Source Transparency**: Questions tagged with source (WhatsApp bot, web interface) and properly categorized by maritime topics
- **Search and Discovery**: Implemented question search across all sister apps with keyword matching on text, categories, and tags
- **User Profile Integration**: User profile pages link to My Questions page and show authentic question counts from shared system
- **Sample Data Seeded**: Added 5 realistic maritime questions and 3 answers from actual QAAQ users for demonstration

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

### User Dropdown Z-Index Layering Fix (January 30, 2025)
- **Critical Z-Index Fix**: Resolved user dropdown appearing behind map by implementing fixed positioning with maximum z-index (2147483647)
- **Comprehensive Map Override**: Applied strict z-index constraints to both Google Maps and Leaflet elements to ensure they stay below dropdown
- **Fixed Positioning Solution**: Changed dropdown from absolute to fixed positioning with dynamic position calculation based on button location
- **CSS Override Rules**: Added global CSS rules to enforce z-index hierarchy for all map components (.gm-style, .leaflet-container)
- **Consistent Header Hierarchy**: Applied z-index hierarchy across all pages (Discover, DM, Post) to ensure dropdown always appears above content
- **Dark Theme Preservation**: Maintained dark slate dropdown design matching parent app while fixing layering issues
- **User Experience Enhancement**: Dropdown now properly appears above maps, content areas, and all other UI elements across the application

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