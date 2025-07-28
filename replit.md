# QaaqConnect - Maritime Community Platform

## Overview

QaaqConnect is a location-based maritime discovery platform focused on "Koi Hai?" (Who's there?) functionality. The app helps sailors find nearby maritime professionals and locals through an interactive world map. Features include email-verified registration, proximity-based user discovery, and real-time location mapping with ship details and port visit windows.

## User Preferences

Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
User data: Connected to QAAQ admin database with 12 authentic maritime users including sailors with ship details and local guides in major ports
Future features: CPSS (Country/Port/Suburb/Service) tree breadcrumb for maritime meetups and local tours

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
- **Database Provider**: QAAQ Admin Database (replaced Neon Database on January 27, 2025)
- **Authentication**: JWT-based with email verification
- **Email Service**: Gmail SMTP via nodemailer (switched from SendGrid per user request)
- **Session Management**: Express sessions with PostgreSQL storage

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
- **QAAQ Admin Database**: PostgreSQL database with authentic maritime user data (12 users including sailors and local guides)
- **SendGrid**: Email delivery service for verification
- **Replit**: Development and deployment platform

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

The application follows modern web development patterns with emphasis on type safety, performance, and user experience. The maritime theme and social features are designed to foster genuine connections between sailors and local communities worldwide.