# QaaqConnect - Original Plan & Vision

## Project Mission

**QaaqConnect is a location-based social discovery app for maritime professionals that complements the existing QAAQ maritime engineering platform.**

The primary goal is breaking ice between nearby maritime professionals and locals through "Koi Hai?" (Who's there?) discovery, featuring a CPSS (Country/Port/Suburb/Service) structure for location-based Q&A and community building.

## Core Concept: "Koi Hai?" Discovery

### Primary Use Case
When a sailor arrives at a port, they can instantly discover:
- Who else is nearby (sailors and locals)
- What ships are in port with their crews
- Local guides and maritime professionals
- Upcoming maritime meetups and events

### Smart AI Routing
The platform intelligently routes between:
- **QaaqConnect**: Leisure/location/social questions
- **QAAQ's SEMM database**: Technical machinery questions

## User Experience Flow

### 1. First-Time Registration
- **Instant Access**: Users get immediate access after registration
- **Email Verification**: 6-digit codes sent via Gmail SMTP
- **User Types**: Sailor or Local selection
- **Phone Integration**: Username can be country code + WhatsApp number

### 2. Discovery Experience
- **Landing**: Light grey world map loads immediately
- **Activation**: Map becomes colorful when "Koi Hai?" is pressed
- **Proximity Search**: Shows nearest 10 users when no search text
- **Location Awareness**: Uses Haversine formula for real distance calculation

### 3. Information Display
- **Maritime Ranks**: Abbreviated (CAPT, CE, CO, etc.) with emoji icons
- **Ship Details**: Name in italics, no MV/MT prefix, no IMO numbers
- **Port Information**: Current port and visit windows (e.g., "28 to 30 Jul25")
- **User Distinction**: Navy blue pins for sailors, teal for locals

## Architecture: CPSS Structure

### Country → Port → Suburb → Service
Future hierarchical navigation system for:
- **Maritime Meetups**: Organized crew gatherings
- **Local Tours**: Port city exploration
- **Port Dining**: Authentic local restaurants
- **Shore Shopping**: Essential maritime supplies
- **Cultural Experiences**: Local attractions and events

## Technical Implementation

### Frontend Stack
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **Tailwind CSS** with maritime theme colors
- **Leaflet Maps** with CartoDB light tiles
- **TanStack Query** for server state management

### Backend Infrastructure
- **Node.js/Express** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **JWT Authentication** with 30-day sessions
- **Gmail SMTP** for email services
- **Neon Database** for serverless PostgreSQL

### Map Technology
- **CartoDB Light**: Grey theme for calm maritime aesthetic
- **Custom Markers**: Emoji-based rank icons with color coding
- **Dynamic Loading**: Pins appear only on user interaction
- **Responsive Bounds**: Auto-fit to show all discovered users

## Data Model

### Users Table
```
- id (UUID)
- fullName
- email (unique)
- userType (sailor/local)
- rank (maritime position)
- shipName (current vessel)
- port (current/next port)
- visitWindow (planned dates)
- city/country (location)
- latitude/longitude (coordinates)
- isVerified (email confirmation)
```

### Key Features
- **Location Tracking**: Real GPS coordinates for proximity
- **Ship Management**: Current vessel and port schedules
- **Visit Planning**: Time windows for port stays
- **Verification System**: Email-based account confirmation

## User Interface Design

### Maritime Theme
- **Colors**: Navy blue (#1e3a8a) for sailors, Ocean teal (#0891b2) for locals
- **Typography**: Clean, readable fonts for maritime professionals
- **Icons**: FontAwesome maritime symbols and Lucide icons
- **Responsive**: Mobile-first design for on-ship usage

### Map Experience
- **Initial State**: Clean grey world map
- **Discovery State**: Colorful pins with detailed popups
- **Interaction**: Click pins for user details and contact options
- **Navigation**: Smooth zoom and pan for exploration

## Integration with QAAQ Ecosystem

### Smart Question Routing
AI determines whether questions should go to:
- **QaaqConnect**: "Where's good food in Hamburg?"
- **QAAQ SEMM**: "How to fix centrifugal pump cavitation?"

### Data Sharing
- **User Profiles**: Sync maritime ranks and certifications
- **Location Data**: Share port schedules and ship assignments
- **Activity Feed**: Cross-platform notifications for connections

## Future Roadmap

### Phase 1: Core Discovery (Current)
- ✅ User registration and authentication
- ✅ Interactive world map with pins
- ✅ Proximity-based user discovery
- ✅ Ship and port information display

### Phase 2: CPSS Navigation
- 🔄 Hierarchical location browsing
- 🔄 Category-based service discovery
- 🔄 Maritime meetup organization
- 🔄 Local tour booking system

### Phase 3: Social Features
- 📋 Real-time messaging between users
- 📋 Event creation and management
- 📋 Review system for local services
- 📋 Photo sharing for port experiences

### Phase 4: AI Integration
- 📋 Smart question routing to QAAQ
- 📋 Personalized recommendations
- 📋 Automated port arrival notifications
- 📋 Multi-language support

## Success Metrics

### User Engagement
- **Discovery Rate**: How often users find nearby connections
- **Response Time**: Speed of local/sailor interactions
- **Return Usage**: Frequency of app use per port visit

### Network Growth
- **Coverage**: Number of ports with active users
- **Density**: Average users per major maritime city
- **Quality**: Successful connections leading to meetups

### Integration Success
- **Question Routing**: Accuracy of AI directing queries
- **Cross-Platform**: Usage between QaaqConnect and QAAQ
- **Professional Value**: Maritime career networking benefits

## Technical Considerations

### Scalability
- **Serverless Architecture**: Auto-scaling with user demand
- **Geographic Clustering**: Efficient proximity calculations
- **Caching Strategy**: Fast map loading and user discovery

### Security & Privacy
- **Location Privacy**: Optional precise location sharing
- **Data Protection**: GDPR compliance for international users
- **Maritime Safety**: Secure communication for crew coordination

### Performance
- **Offline Capability**: Cached maps for poor connectivity areas
- **Low Bandwidth**: Optimized for ship internet connections
- **Real-time Updates**: Live position tracking for active users

---

**Last Updated**: January 27, 2025
**Status**: Phase 1 Core Discovery - Successfully Implemented
**Next Priority**: CPSS Navigation System Implementation