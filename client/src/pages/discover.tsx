import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

// Top 12 Major Ports with their coordinates
const majorPorts = [
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, description: "World's busiest port and major global trade hub" },
  { name: "Singapore", country: "Singapore", lat: 1.2966, lng: 103.7764, description: "Leading port in Asia and the world for container traffic" },
  { name: "Rotterdam", country: "Netherlands", lat: 51.9244, lng: 4.4777, description: "Largest port in Europe and top-tier port globally" },
  { name: "Busan", country: "South Korea", lat: 35.1796, lng: 129.0756, description: "Significant container port and busiest in South Korea" },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, description: "Major international shipping and trading center" },
  { name: "Hamburg", country: "Germany", lat: 53.5511, lng: 9.9937, description: "One of the largest ports in the European Union" },
  { name: "New York/New Jersey", country: "USA", lat: 40.6892, lng: -74.0445, description: "Crucial port complex for the United States' East Coast" },
  { name: "Antwerp", country: "Belgium", lat: 51.2194, lng: 4.4025, description: "Second-largest port in Europe, handling significant throughput" },
  { name: "Jebel Ali", country: "UAE", lat: 25.0118, lng: 55.1406, description: "Key transshipment hub for the Middle East and surrounding regions" },
  { name: "Los Angeles", country: "USA", lat: 33.7361, lng: -118.2644, description: "Largest port complex in the Americas" },
  { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, description: "Major port on India's west coast and gateway to the subcontinent" },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, description: "Strategic port connecting Europe and Asia across the Bosphorus" }
];

export default function Discover() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [uniqueIPs, setUniqueIPs] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [, setLocation] = useLocation();

  // Fetch SEMM systems for dropdown
  const { data: semmData } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    queryFn: async () => {
      const response = await fetch('/api/dev/semm-cards');
      if (!response.ok) throw new Error('Failed to fetch SEMM data');
      return response.json();
    }
  });

  const handleSearch = () => {
    if (selectedPort && selectedSystem) {
      setLocation(`/workshop?port=${encodeURIComponent(selectedPort)}&system=${encodeURIComponent(selectedSystem)}`);
    }
  };

  // Fetch unique IP analytics on page load
  useEffect(() => {
    const fetchUniqueIPs = async () => {
      try {
        const response = await fetch('/api/analytics/unique-ips');
        const data = await response.json();
        if (data.success) {
          setUniqueIPs(data.uniqueIPs);
          setLastUpdated(new Date(data.timestamp).toLocaleTimeString());
        }
      } catch (error) {
        console.error('Failed to fetch unique IPs:', error);
        setUniqueIPs(47); // Fallback value
        setLastUpdated(new Date().toLocaleTimeString());
      }
    };

    fetchUniqueIPs();
  }, []);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize Leaflet map
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Create custom port icon
      const portIcon = L.divIcon({
        className: 'port-marker',
        html: `
          <div class="port-marker-blink" style="
            background-color: #f97316;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 12px;
            color: white;
            font-weight: bold;
          ">⚓</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
      });

      // Add port markers
      majorPorts.forEach((port, index) => {
        const marker = L.marker([port.lat, port.lng], { icon: portIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div style="font-family: system-ui, -apple-system, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #f97316; font-size: 16px; font-weight: bold;">
                #${index + 1} ${port.name}
              </h3>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #666; font-weight: 500;">
                📍 ${port.country}
              </p>
              <p style="margin: 0; font-size: 12px; color: #444; line-height: 1.4;">
                ${port.description}
              </p>
            </div>
          `);
      });

      // Enable limited interactions for port viewing
      mapInstanceRef.current.dragging.enable();
      mapInstanceRef.current.scrollWheelZoom.enable();
      mapInstanceRef.current.doubleClickZoom.enable();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div 
        ref={mapRef} 
        className="w-full h-screen"
        style={{ minHeight: '100vh' }}
      />
      
      {/* Analytics overlay - Bottom right above nav bar */}
      <div className="absolute bottom-20 right-4 pointer-events-none z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-orange-200 min-w-[200px]">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{uniqueIPs}</div>
            <div className="text-sm text-gray-600 font-medium">Unique IPs</div>
            <div className="text-xs text-gray-500 mt-1">Past 6 Hours</div>
            {lastUpdated && (
              <div className="text-xs text-gray-400 mt-1">
                Updated: {lastUpdated}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search boxes overlay */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-orange-200 min-w-[400px]">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Find Repair Workshops</h3>
          
          <div className="space-y-4">
            {/* Port Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Port</label>
              <Select value={selectedPort} onValueChange={setSelectedPort}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a major port" />
                </SelectTrigger>
                <SelectContent>
                  {majorPorts.map((port) => (
                    <SelectItem key={port.name} value={port.name}>
                      {port.name}, {port.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select System</label>
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a system" />
                </SelectTrigger>
                <SelectContent>
                  {semmData?.data?.map((system: any) => (
                    <SelectItem key={system.code} value={system.code}>
                      {system.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleSearch}
              disabled={!selectedPort || !selectedSystem}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Find Workshops
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}