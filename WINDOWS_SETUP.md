# Windows Setup Guide

## Running the Server on Windows

Since Windows doesn't support the Linux/Mac environment variable syntax, use these alternative methods:

### Option 1: Use Batch Files (Recommended)
```bash
# For development
./start-dev.bat

# For production (after running npm run build)
./start-prod.bat
```

### Option 2: Manual Commands
```bash
# For development
set NODE_ENV=development && tsx server/index.ts

# For production (after running npm run build)
set NODE_ENV=production && node dist/index.js
```

### Option 3: PowerShell Commands
```powershell
# For development
$env:NODE_ENV="development"; tsx server/index.ts

# For production (after running npm run build)
$env:NODE_ENV="production"; node dist/index.js
```

## Mobile App Development

For the mobile app in the `mobile-app/` directory:

```bash
cd mobile-app
npm start          # Start Expo development server
npm run dev        # Start with dev-client
npm run android    # Run on Android
npm run ios        # Run on iOS
```

## Database Commands

```bash
npm run db:push    # Push schema changes to database
```

## Building for Production

```bash
npm run build      # Build both frontend and backend
```

## Important Notes

- The server runs on port 5000 by default
- The database is already connected via environment variables
- Use `http://localhost:5000` to access the web application
- Make sure you have Node.js 18+ installed