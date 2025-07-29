/**
 * Real-Time Location Tracking System for QaaqConnect
 * 
 * This module handles live location updates for maritime professionals post-launch.
 * Currently uses seed data with Present City coordinates, designed to support:
 * 
 * 1. Live GPS tracking when users share location during login
 * 2. Ship position updates via IMO tracking APIs
 * 3. WebSocket-based real-time location broadcasting
 * 4. Proximity detection and notifications
 * 
 * Future Implementation Plan:
 * - Mandatory location sharing during app login
 * - Background location updates every 30 seconds
 * - Ship position synchronization from AIS data
 * - Real-time "who's nearby" notifications
 */

import { WebSocketServer, WebSocket } from 'ws';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  source: 'device' | 'ship' | 'manual';
}

interface ProximityNotification {
  userId: string;
  nearbyUsers: Array<{
    id: string;
    fullName: string;
    distance: number;
    rank: string;
    shipName: string;
  }>;
}

export class RealTimeLocationService {
  private wsServer: WebSocketServer | null = null;
  private connectedUsers = new Map<string, WebSocket>();
  private locationCache = new Map<string, LocationUpdate>();

  constructor() {
    console.log('🌊 Real-time location service initialized');
  }

  /**
   * Initialize WebSocket server for real-time location updates
   * This will be used post-launch for live location broadcasting
   */
  initializeWebSocket(server: any, path: string = '/ws/location') {
    this.wsServer = new WebSocketServer({ server, path });
    
    this.wsServer.on('connection', (ws, req) => {
      console.log('📍 New location tracking connection established');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleLocationMessage(ws, message);
        } catch (error) {
          console.error('Error handling location message:', error);
        }
      });

      ws.on('close', () => {
        // Remove user from connected users
        for (const [userId, socket] of this.connectedUsers.entries()) {
          if (socket === ws) {
            this.connectedUsers.delete(userId);
            console.log(`📍 User ${userId} disconnected from location tracking`);
            break;
          }
        }
      });
    });

    console.log(`🌊 Real-time location WebSocket server started on ${path}`);
  }

  /**
   * Handle incoming location messages from clients
   */
  private async handleLocationMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'authenticate':
        this.connectedUsers.set(message.userId, ws);
        console.log(`📍 User ${message.userId} authenticated for location tracking`);
        break;

      case 'location_update':
        await this.updateUserLocation(message.data);
        break;

      case 'request_nearby':
        await this.sendNearbyUsers(message.userId);
        break;
    }
  }

  /**
   * Update user's real-time location (for post-launch live GPS)
   */
  async updateUserLocation(locationData: LocationUpdate) {
    try {
      // Cache the location update
      this.locationCache.set(locationData.userId, locationData);

      // Update database with real-time location
      // Note: In production, this will update device_latitude/device_longitude
      console.log(`📍 Location update: User ${locationData.userId} at ${locationData.latitude}, ${locationData.longitude}`);

      // Broadcast to nearby users (future feature)
      await this.broadcastToNearbyUsers(locationData);

    } catch (error) {
      console.error('Error updating user location:', error);
    }
  }

  /**
   * Broadcast location updates to nearby users (future feature)
   */
  private async broadcastToNearbyUsers(locationData: LocationUpdate) {
    // Calculate nearby users within 10km radius
    const nearbyUsers = await this.findNearbyUsers(
      locationData.userId, 
      locationData.latitude, 
      locationData.longitude, 
      10000 // 10km radius
    );

    // Send proximity notifications to connected users
    for (const nearbyUser of nearbyUsers) {
      const userSocket = this.connectedUsers.get(nearbyUser.id);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify({
          type: 'proximity_update',
          data: {
            userId: locationData.userId,
            distance: nearbyUser.distance,
            timestamp: locationData.timestamp
          }
        }));
      }
    }
  }

  /**
   * Find nearby users for proximity detection
   */
  private async findNearbyUsers(
    userId: string, 
    latitude: number, 
    longitude: number, 
    radiusMeters: number = 5000
  ) {
    // This will be implemented with the same Haversine formula used in the API
    // For now, return empty array as this is seed data
    return [];
  }

  /**
   * Send nearby users list to requesting client
   */
  private async sendNearbyUsers(userId: string) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket && userSocket.readyState === WebSocket.OPEN) {
      // Get user's current location from cache or database
      const userLocation = this.locationCache.get(userId);
      if (userLocation) {
        const nearbyUsers = await this.findNearbyUsers(
          userId,
          userLocation.latitude,
          userLocation.longitude
        );

        userSocket.send(JSON.stringify({
          type: 'nearby_users',
          data: nearbyUsers
        }));
      }
    }
  }

  /**
   * Mandatory location sharing for app login (post-launch feature)
   * This will be called during authentication to require live location
   */
  async requireLocationForLogin(userId: string): Promise<boolean> {
    // Future implementation:
    // 1. Request device GPS permission
    // 2. Get high-accuracy position
    // 3. Update user's device_latitude/device_longitude
    // 4. Set location_source to 'device'
    // 5. Return true if successful, false if denied
    
    console.log(`📍 Location sharing required for user ${userId} (post-launch feature)`);
    return true; // Always allow for seed data phase
  }

  /**
   * Background location sync (post-launch feature)
   * Updates user location every 30 seconds when app is active
   */
  startBackgroundLocationSync(userId: string) {
    // Future implementation:
    // 1. Set up 30-second interval
    // 2. Get device location
    // 3. Update database if significant change (>100m)
    // 4. Broadcast to nearby users
    // 5. Handle ship position updates for sailors
    
    console.log(`📍 Background location sync started for ${userId} (post-launch feature)`);
  }

  /**
   * Stop background location tracking
   */
  stopBackgroundLocationSync(userId: string) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      this.connectedUsers.delete(userId);
    }
    this.locationCache.delete(userId);
    console.log(`📍 Location tracking stopped for ${userId}`);
  }
}

export default RealTimeLocationService;