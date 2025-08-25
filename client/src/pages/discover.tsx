import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
          <div style="
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
      
      {/* Center screen message overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-orange-200">
          <p className="text-xl font-semibold text-gray-800 text-center">
            Awesome features being loaded.<br />
            ETA very soon.
          </p>
        </div>
      </div>
    </div>
  );
}