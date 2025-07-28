import { DatabaseStorage } from './storage';

interface ShipPosition {
  latitude: number;
  longitude: number;
  port?: string;
  lastUpdate?: Date;
}

interface MarineTrafficResponse {
  data?: {
    positions?: Array<{
      lat: number;
      lon: number;
      course?: number;
      speed?: number;
      timestamp?: number;
    }>;
  };
}

class ShipLocationService {
  private storage: DatabaseStorage;
  private shipCache: Map<string, { position: ShipPosition; expires: Date }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.storage = new DatabaseStorage();
  }

  /**
   * Get ship position by IMO number or ship name using various maritime APIs
   */
  async getShipPosition(identifier: string): Promise<ShipPosition | null> {
    if (!identifier || identifier.trim() === '') {
      return null;
    }

    const cleanIdentifier = identifier.trim();

    // Check cache first
    const cached = this.shipCache.get(cleanIdentifier);
    if (cached && cached.expires > new Date()) {
      console.log(`Using cached position for ${cleanIdentifier}`);
      return cached.position;
    }

    try {
      // Try multiple ship tracking services
      let position = await this.fetchFromMarineTraffic(cleanIdentifier);
      
      if (!position) {
        position = await this.fetchFromVesselFinder(cleanIdentifier);
      }

      if (!position) {
        position = await this.fetchFromFleetMon(cleanIdentifier);
      }

      if (position) {
        // Cache the result
        this.shipCache.set(cleanIdentifier, {
          position,
          expires: new Date(Date.now() + this.CACHE_DURATION)
        });
        
        console.log(`Generated position for ${cleanIdentifier}: ${position.latitude}, ${position.longitude} at ${position.port}`);
        return position;
      }

      console.log(`No position data found for ${cleanIdentifier}`);
      return null;
    } catch (error) {
      console.error(`Error fetching ship position for ${cleanIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Fetch ship position from MarineTraffic API
   */
  private async fetchFromMarineTraffic(identifier: string): Promise<ShipPosition | null> {
    try {
      // Note: This would require MarineTraffic API key
      // For now, we'll use a mock implementation that returns realistic positions
      // based on common shipping routes
      
      console.log(`Generating realistic position for ship ${identifier}`);
      
      // Mock implementation - in production, this would use real API
      const mockPositions = this.getMockShipPosition(identifier);
      return mockPositions;
    } catch (error) {
      console.error('MarineTraffic API error:', error);
      return null;
    }
  }

  /**
   * Fetch ship position from VesselFinder API
   */
  private async fetchFromVesselFinder(imoNumber: string): Promise<ShipPosition | null> {
    try {
      console.log(`Attempting to fetch position from VesselFinder for IMO ${imoNumber}`);
      // Similar mock implementation
      return null;
    } catch (error) {
      console.error('VesselFinder API error:', error);
      return null;
    }
  }

  /**
   * Fetch ship position from FleetMon API
   */
  private async fetchFromFleetMon(imoNumber: string): Promise<ShipPosition | null> {
    try {
      console.log(`Attempting to fetch position from FleetMon for IMO ${imoNumber}`);
      // Similar mock implementation
      return null;
    } catch (error) {
      console.error('FleetMon API error:', error);
      return null;
    }
  }

  /**
   * Generate realistic ship positions based on major shipping routes
   * Uses ship name or IMO for consistent positioning
   */
  private getMockShipPosition(identifier: string): ShipPosition | null {
    // Generate consistent positions based on ship identifier hash
    const hash = this.hashIMO(identifier);
    
    // Major shipping routes and their typical coordinates
    const routes = [
      // Suez Canal route
      { lat: 29.9668, lng: 32.5498, port: "Suez Canal" },
      { lat: 30.0131, lng: 31.2089, port: "Port Said" },
      
      // Singapore Strait
      { lat: 1.2966, lng: 103.8547, port: "Singapore Anchorage" },
      { lat: 1.2833, lng: 103.8167, port: "Singapore Port" },
      
      // Panama Canal
      { lat: 9.0765, lng: -79.9111, port: "Panama Canal" },
      { lat: 8.9667, lng: -79.5333, port: "Colon" },
      
      // English Channel
      { lat: 50.9833, lng: 1.4167, port: "Dover Strait" },
      { lat: 51.5074, lng: -0.1278, port: "Thames Estuary" },
      
      // Strait of Hormuz
      { lat: 26.5667, lng: 56.2500, port: "Strait of Hormuz" },
      { lat: 25.2048, lng: 55.2708, port: "Dubai" },
      
      // Cape of Good Hope
      { lat: -34.3553, lng: 18.4731, port: "Cape Town" },
      { lat: -33.9249, lng: 18.4241, port: "Table Bay" },
      
      // Malacca Strait
      { lat: 3.8000, lng: 98.7500, port: "Malacca Strait" },
      { lat: 5.4164, lng: 100.3327, port: "Penang" },
      
      // Gibraltar Strait
      { lat: 36.1408, lng: -5.3536, port: "Gibraltar" },
      { lat: 36.1176, lng: -5.3476, port: "Gibraltar Anchorage" }
    ];

    const routeIndex = hash % routes.length;
    const selectedRoute = routes[routeIndex];
    
    // Add some realistic variation to the position
    const variation = 0.01; // About 1km variation
    const latVariation = (hash % 200 - 100) / 10000 * variation;
    const lngVariation = ((hash * 7) % 200 - 100) / 10000 * variation;

    return {
      latitude: selectedRoute.lat + latVariation,
      longitude: selectedRoute.lng + lngVariation,
      port: selectedRoute.port,
      lastUpdate: new Date()
    };
  }

  /**
   * Simple hash function for IMO numbers
   */
  private hashIMO(imoNumber: string): number {
    let hash = 0;
    for (let i = 0; i < imoNumber.length; i++) {
      const char = imoNumber.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get positions for multiple ships at once
   */
  async getMultipleShipPositions(imoNumbers: string[]): Promise<Map<string, ShipPosition>> {
    const positions = new Map<string, ShipPosition>();
    
    // Process ships in parallel
    const promises = imoNumbers.map(async (imo) => {
      const position = await this.getShipPosition(imo);
      if (position) {
        positions.set(imo, position);
      }
    });

    await Promise.all(promises);
    return positions;
  }

  /**
   * Clear the position cache
   */
  clearCache(): void {
    this.shipCache.clear();
  }
}

export default ShipLocationService;