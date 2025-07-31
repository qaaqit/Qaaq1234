import { useState, useEffect, useRef } from 'react';
import { Ship, Navigation, Zap } from 'lucide-react';

interface ShipData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number; // Speed over ground in knots
  course: number; // Course over ground in degrees
  heading: number; // True heading in degrees
  mmsi: string; // Maritime Mobile Service Identity
  type: number; // Ship type code
  destination: string;
  eta: string;
  callSign: string;
  imo: string;
  timestamp: number;
}

interface ShipTrackerProps {
  onShipsUpdate: (ships: ShipData[]) => void;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

const SHIP_TYPE_NAMES: { [key: number]: string } = {
  30: 'Fishing',
  31: 'Towing',
  32: 'Towing (large)',
  33: 'Dredging',
  34: 'Diving',
  35: 'Military',
  36: 'Sailing',
  37: 'Pleasure Craft',
  40: 'High Speed Craft',
  41: 'High Speed Craft',
  42: 'High Speed Craft',
  50: 'Pilot',
  51: 'Search & Rescue',
  52: 'Tug',
  53: 'Port Tender',
  54: 'Anti-pollution',
  55: 'Law Enforcement',
  58: 'Medical',
  60: 'Passenger',
  61: 'Passenger',
  62: 'Passenger',
  63: 'Passenger',
  64: 'Passenger',
  65: 'Passenger',
  66: 'Passenger',
  67: 'Passenger',
  68: 'Passenger',
  69: 'Passenger',
  70: 'Cargo',
  71: 'Cargo',
  72: 'Cargo',
  73: 'Cargo',
  74: 'Cargo',
  75: 'Cargo',
  76: 'Cargo',
  77: 'Cargo',
  78: 'Cargo',
  79: 'Cargo',
  80: 'Tanker',
  81: 'Tanker',
  82: 'Tanker',
  83: 'Tanker',
  84: 'Tanker',
  85: 'Tanker',
  86: 'Tanker',
  87: 'Tanker',
  88: 'Tanker',
  89: 'Tanker'
};

export default function ShipTracker({ onShipsUpdate, bounds }: ShipTrackerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [shipCount, setShipCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const shipsRef = useRef<Map<string, ShipData>>(new Map());

  useEffect(() => {
    // For demonstration, create some sample ship data since AIS WebSocket has connection issues
    const createDemoShips = () => {
      console.log('🚢 Creating demo ships for testing...');
      setIsConnected(true);
      
      const demoShips: ShipData[] = [
        {
          id: 'demo1',
          name: 'MV EVER GIVEN',
          latitude: 29.9792, // Suez Canal
          longitude: 32.5467,
          speed: 8.5,
          course: 85,
          heading: 85,
          mmsi: '353136000',
          type: 70, // Cargo
          destination: 'ROTTERDAM',
          eta: '2025-02-15 14:00',
          callSign: 'H3RC',
          imo: '9811000',
          timestamp: Date.now()
        },
        {
          id: 'demo2',
          name: 'MT SEAWAYS LAURA',
          latitude: 51.5074, // English Channel
          longitude: 1.2985,
          speed: 12.3,
          course: 270,
          heading: 275,
          mmsi: '235094000',
          type: 80, // Tanker
          destination: 'ANTWERP',
          eta: '2025-02-10 08:30',
          callSign: 'MJVH2',
          imo: '9567123',
          timestamp: Date.now()
        },
        {
          id: 'demo3',
          name: 'QUEEN MARY 2',
          latitude: 40.7589, // Near New York
          longitude: -73.9851,
          speed: 15.8,
          course: 120,
          heading: 118,
          mmsi: '310627000',
          type: 60, // Passenger
          destination: 'SOUTHAMPTON',
          eta: '2025-02-12 18:00',
          callSign: 'ZBFV',
          imo: '9241061',
          timestamp: Date.now()
        },
        {
          id: 'demo4',
          name: 'FV NORTHERN PEARL',
          latitude: 19.0760, // Mumbai port area
          longitude: 72.8777,
          speed: 2.1,
          course: 45,
          heading: 50,
          mmsi: '419001234',
          type: 30, // Fishing
          destination: 'MUMBAI',
          eta: '2025-02-08 06:00',
          callSign: 'VT2345',
          imo: '8901234',
          timestamp: Date.now()
        }
      ];

      // Update ships map
      shipsRef.current.clear();
      demoShips.forEach(ship => {
        shipsRef.current.set(ship.id, ship);
      });

      setShipCount(demoShips.length);
      onShipsUpdate(demoShips);
      
      // Simulate movement by updating positions every 30 seconds
      const updateInterval = setInterval(() => {
        const updatedShips: ShipData[] = [];
        shipsRef.current.forEach((ship, id) => {
          // Simulate small movement based on course and speed
          const speedMs = ship.speed * 0.000514444; // Convert knots to degrees per second
          const courseRad = (ship.course * Math.PI) / 180;
          
          const newLat = ship.latitude + (Math.cos(courseRad) * speedMs * 30); // 30 seconds
          const newLng = ship.longitude + (Math.sin(courseRad) * speedMs * 30);
          
          const updatedShip = {
            ...ship,
            latitude: newLat,
            longitude: newLng,
            timestamp: Date.now()
          };
          
          shipsRef.current.set(id, updatedShip);
          updatedShips.push(updatedShip);
        });
        
        if (updatedShips.length > 0) {
          onShipsUpdate(updatedShips);
        }
      }, 30000);

      return updateInterval;
    };

    // Try AIS WebSocket first, fallback to demo data
    const connectWebSocket = () => {
      try {
        setError(null);
        const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
        wsRef.current = ws;

        // Timeout for connection
        const connectionTimeout = setTimeout(() => {
          console.log('🚢 AIS connection timeout, using demo data...');
          ws.close();
          const demoInterval = createDemoShips();
          return () => clearInterval(demoInterval);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('🚢 Connected to AIS Stream');
          setIsConnected(true);
          
          // Subscribe to AIS messages
          const subscription = {
            APIKey: "free", // Using free tier
            BoundingBoxes: bounds ? [[[bounds.west, bounds.south], [bounds.east, bounds.north]]] : undefined,
            FilterMessageTypes: ["PositionReport"], // Only position reports
            FiltersShipAndCargo: {
              MessageTypes: [1, 2, 3] // Position report message types
            }
          };
          
          ws.send(JSON.stringify(subscription));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.MessageType === "PositionReport") {
              const message = data.Message;
              const metadata = data.MetaData;
              
              if (message && metadata && message.Latitude && message.Longitude) {
                const ship: ShipData = {
                  id: metadata.MMSI?.toString() || `ship_${Date.now()}`,
                  name: metadata.ShipName || 'Unknown Vessel',
                  latitude: message.Latitude,
                  longitude: message.Longitude,
                  speed: message.Sog || 0, // Speed over ground
                  course: message.Cog || 0, // Course over ground
                  heading: message.Heading || 0,
                  mmsi: metadata.MMSI?.toString() || '',
                  type: metadata.ShipType || 0,
                  destination: metadata.Destination || '',
                  eta: metadata.Eta || '',
                  callSign: metadata.CallSign || '',
                  imo: metadata.Imo?.toString() || '',
                  timestamp: Date.now()
                };

                // Update ships map
                shipsRef.current.set(ship.id, ship);
                
                // Clean up old ships (older than 30 minutes)
                const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
                shipsRef.current.forEach((shipData, shipId) => {
                  if (shipData.timestamp < thirtyMinutesAgo) {
                    shipsRef.current.delete(shipId);
                  }
                });

                // Update ship count and notify parent
                const currentShips = Array.from(shipsRef.current.values());
                setShipCount(currentShips.length);
                onShipsUpdate(currentShips);
              }
            }
          } catch (err) {
            console.error('Error parsing AIS message:', err);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('AIS WebSocket error:', error);
          setError('Using demo data - real AIS unavailable');
          setIsConnected(false);
          // Fallback to demo data
          createDemoShips();
        };

        ws.onclose = () => {
          clearTimeout(connectionTimeout);
          console.log('AIS WebSocket closed - using demo data...');
          setIsConnected(false);
          // Use demo data instead of reconnecting
          createDemoShips();
        };

      } catch (err) {
        console.error('Failed to connect to AIS Stream:', err);
        setError('Using demo ship data for testing');
        createDemoShips();
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [bounds, onShipsUpdate]);

  // Status indicator component
  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
        isConnected 
          ? 'bg-green-100 text-green-700' 
          : error 
          ? 'bg-orange-100 text-orange-700'  // Changed to orange for demo mode
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        <Ship size={14} />
        <span className="font-medium">
          {isConnected 
            ? `${shipCount} ships ${error ? '(demo)' : '(live)'}` 
            : error 
            ? 'Demo ship data'
            : 'Connecting to ships...'
          }
        </span>
        {isConnected && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}

// Utility function to get ship type name
export const getShipTypeName = (typeCode: number): string => {
  return SHIP_TYPE_NAMES[typeCode] || 'Other';
};

// Utility function to format ship speed
export const formatShipSpeed = (speedKnots: number): string => {
  return `${speedKnots.toFixed(1)} kts`;
};

// Utility function to format course/heading
export const formatCourse = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return `${degrees.toFixed(0)}° ${directions[index]}`;
};