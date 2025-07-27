# QaaqConnect - Maritime Community Platform

## Overview

QaaqConnect is a modern full-stack web application that connects sailors with locals to facilitate authentic port city experiences. The platform enables users to discover local recommendations, join maritime meetups, and share experiences through a social posting system.

## User Preferences

Preferred communication style: Simple, everyday language.
Username field label: "USER NAME (This may be ur country code +91 & whatsapp number )"
Primary focus: "Koi Hai?" (Who's there?) discovery - helping sailors find who's nearby in ports
Map display: Full screen with light grey theme initially, becomes colorful when user searches
Map behavior: Shows empty grey map on load, displays pins only when "Koi Hai?" button is pressed
Proximity feature: Shows nearest 10 users when searching without text input
Sample data: Includes seed users in major maritime cities when QAAQ user data unavailable
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
- **Database Provider**: Neon Database (@neondatabase/serverless)
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
- Email-based registration and login flow
- Six-digit verification codes with 10-minute expiration
- JWT tokens for session management with 30-day expiration
- User type distinction (sailor vs local) for personalized experiences

### Social Features
- Post creation with rich content support
- Category-based content organization (Local Discovery, Maritime Meetup, Port Experience, etc.)
- Location tagging for geographic relevance
- Like/unlike functionality with real-time count updates
- Author display options (full name, nickname, anonymous)

### Discovery System
- Real-time post feed with pagination
- Search functionality across post content and locations
- Category-based filtering
- Mobile-first responsive design
- Interactive map showing QAAQ users worldwide with rank abbreviations
- Map pins color-coded by user type (navy for sailors, teal for locals)

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
- **Neon Database**: Serverless PostgreSQL hosting
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