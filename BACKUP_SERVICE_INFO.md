# Database Backup Service

## Overview
A local database has been created and configured to automatically backup from the parent database every 6 hours.

## Configuration

### Parent Database (Source)
- URL: `postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require`
- This is the database that data is copied FROM

### Local Database (Destination)  
- Automatically created and configured
- This is the database that data is backed up TO
- Connection details stored in environment variables

## Automatic Backup Schedule
- **Frequency**: Every 6 hours
- **Type**: Full backup (replaces all data in local database)
- **Status**: Currently running and scheduled

## Manual Controls
The backup service provides several API endpoints for manual control (requires admin authentication):

### Start/Stop Service
- **Start**: `POST /api/admin/backup/start` (with optional `intervalHours` parameter)
- **Stop**: `POST /api/admin/backup/stop`

### Check Status
- **Status**: `GET /api/admin/backup/status`
  - Shows if backup is running
  - Last backup time
  - Next scheduled backup
  - Recent backup history

### Manual Backup
- **Full Backup**: `POST /api/admin/backup/manual` with `{"incremental": false}`
- **Incremental Backup**: `POST /api/admin/backup/manual` with `{"incremental": true}`

### Test Connections
- **Test**: `GET /api/admin/backup/test-connections`
  - Verifies both database connections are working

## Testing
A test script is available at `server/test-backup.ts` that can be run with:
```bash
cd server && npx tsx test-backup.ts
```

This will:
1. Test database connections
2. Show backup status
3. Perform a manual backup
4. Display results

## Service Architecture
The backup service:
1. Connects to both parent and local databases
2. Reads tables from parent database
3. Copies data to local database
4. Handles missing tables gracefully
5. Logs all operations and errors
6. Maintains backup history

## Notes
- The service starts automatically when the server starts
- If tables don't exist in the parent database, they are skipped
- All backup operations are logged with timestamps
- The service is resilient and will continue running even if individual table backups fail