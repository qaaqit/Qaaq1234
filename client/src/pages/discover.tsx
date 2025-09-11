import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

// Major Ports with Workshop Coverage
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
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, description: "Strategic port connecting Europe and Asia across the Bosphorus" },
  // Additional ports with workshop coverage
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, description: "Major Middle Eastern port and shipping hub" },
  { name: "Bhavnagar", country: "India", lat: 21.7645, lng: 72.1519, description: "Major ship recycling and repair hub in Gujarat" },
  { name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707, description: "Important port city on India's east coast" },
  { name: "Port Said", country: "Egypt", lat: 31.2653, lng: 32.3019, description: "Strategic port at the northern entrance of Suez Canal" },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, description: "Major port serving southern Africa" },
  { name: "Dalian", country: "China", lat: 38.9140, lng: 121.6147, description: "Important port city in northern China" },
  { name: "Dammam", country: "Saudi Arabia", lat: 26.4207, lng: 50.0888, description: "Major port on the Persian Gulf" },
  { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, description: "Principal commercial port of eastern India" }
];

export default function Discover() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [isWorkshopFinderMinimized, setIsWorkshopFinderMinimized] = useState<boolean>(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

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
    const params = new URLSearchParams();
    if (selectedPort) {
      params.append('port', selectedPort);
    }
    if (selectedSystem) {
      params.append('system', selectedSystem);
    }
    setLocation(`/workshop?${params.toString()}`);
  };


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
      {/* Header */}
      {user && <Header user={user as any} />}
      
      <div 
        ref={mapRef} 
        className="w-full h-screen"
        style={{ minHeight: '100vh' }}
      />
      {/* Mobile-Friendly Search Bar */}
      <div className="absolute top-20 sm:top-24 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-auto px-4 w-full max-w-[95vw] sm:max-w-none">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 sm:p-6 border border-orange-200 w-full sm:min-w-[600px]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex-1 text-center">Workshop Finder</h3>
            <button
              onClick={() => setIsWorkshopFinderMinimized(!isWorkshopFinderMinimized)}
              className="p-1 rounded-full hover:bg-orange-100 transition-colors"
              title={isWorkshopFinderMinimized ? "Expand Workshop Finder" : "Minimize Workshop Finder"}
            >
              <ChevronDown 
                className={`w-5 h-5 text-orange-600 transition-transform duration-200 ${
                  isWorkshopFinderMinimized ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
          
          {!isWorkshopFinderMinimized && (
            <>
          
          {/* Responsive Search Bar with Text and Dropdowns */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center space-y-3 sm:space-y-0 sm:space-x-2 text-base sm:text-lg">
            
            {/* Mobile: Stacked Layout */}
            <div className="flex flex-col sm:hidden space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 font-medium flex-shrink-0">I need a</span>
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                  <SelectTrigger className="flex-1 bg-orange-50 border-orange-300 hover:bg-orange-100">
                    <SelectValue placeholder="Automation/ Hydraulic/ Mechanical" />
                  </SelectTrigger>
                  <SelectContent className="z-[1100]">
                    {semmData?.data?.map((system: any) => (
                      <SelectItem key={system.code} value={system.code}>
                        {system.title} Systems
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 font-medium flex-shrink-0">workshop in</span>
                <Select value={selectedPort} onValueChange={setSelectedPort}>
                  <SelectTrigger className="flex-1 bg-orange-50 border-orange-300 hover:bg-orange-100">
                    <SelectValue placeholder="Port" />
                  </SelectTrigger>
                  <SelectContent className="z-[1100]">
                    {majorPorts.map((port) => (
                      <SelectItem key={port.name} value={port.name}>
                        {port.name}, {port.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Desktop: Horizontal Layout */}
            <div className="hidden sm:flex sm:items-center sm:space-x-2">
              <span className="text-gray-700 font-medium">I need a</span>
              
              {/* Machine Search Dropdown */}
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="w-[200px] bg-orange-50 border-orange-300 hover:bg-orange-100">
                  <SelectValue placeholder="Automation/ Hydraulic/ Mechanical" />
                </SelectTrigger>
                <SelectContent className="z-[1100]">
                  {semmData?.data?.map((system: any) => (
                    <SelectItem key={system.code} value={system.code}>
                      {system.title} Systems
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-gray-700 font-medium">workshop in</span>
              
              {/* Port Dropdown */}
              <Select value={selectedPort} onValueChange={setSelectedPort}>
                <SelectTrigger className="w-[200px] bg-orange-50 border-orange-300 hover:bg-orange-100">
                  <SelectValue placeholder="Port" />
                </SelectTrigger>
                <SelectContent className="z-[1100]">
                  {majorPorts.map((port) => (
                    <SelectItem key={port.name} value={port.name}>
                      {port.name}, {port.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={handleSearch}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 sm:px-8 py-2 w-full sm:w-auto"
            >
              Find Workshops
            </Button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}