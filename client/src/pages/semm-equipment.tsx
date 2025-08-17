import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Settings, Package, Share2, Building, ChevronRight, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

// Split-flap flip card component matching airport departure boards
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [cardFlipped, setCardFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCardFlipped(true);
    }, 800 + (index * 200)); // Stagger the flip animation
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-12 h-16' : 'w-8 h-12';
  const textSize = large ? 'text-xl' : 'text-sm';

  return (
    <div className={`relative ${cardSize} bg-black rounded-md overflow-hidden border border-gray-600 shadow-xl`}>
      {/* Center horizontal split line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gray-800 z-20 shadow-sm"></div>
      
      {/* Top half container */}
      <div className="relative h-1/2 overflow-hidden" style={{ perspective: '600px' }}>
        {/* Top half loading state */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-800 flex items-end justify-center"
          style={{
            transformOrigin: 'bottom center',
            transform: cardFlipped ? 'rotateX(-90deg)' : 'rotateX(0deg)',
            transition: 'transform 0.4s ease-in-out',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin mb-1"></div>
        </div>
        
        {/* Top half with character */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 overflow-hidden"
          style={{
            transformOrigin: 'bottom center',
            transform: cardFlipped ? 'rotateX(0deg)' : 'rotateX(90deg)',
            transition: 'transform 0.4s ease-in-out',
            transitionDelay: cardFlipped ? '0.2s' : '0s',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ height: '200%' }}>
            <span className={`${textSize} font-bold text-white font-mono tracking-wider drop-shadow-lg leading-none`} style={{ transform: 'translateY(-50%)' }}>
              {char}
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom half container */}
      <div className="relative h-1/2 overflow-hidden" style={{ perspective: '600px' }}>
        {/* Bottom half loading state */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-700 to-gray-800 flex items-start justify-center"
          style={{
            transformOrigin: 'top center',
            transform: cardFlipped ? 'rotateX(90deg)' : 'rotateX(0deg)',
            transition: 'transform 0.4s ease-in-out',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin mt-1"></div>
        </div>
        
        {/* Bottom half with character */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-800 to-blue-900 overflow-hidden"
          style={{
            transformOrigin: 'top center',
            transform: cardFlipped ? 'rotateX(0deg)' : 'rotateX(-90deg)',
            transition: 'transform 0.4s ease-in-out',
            transitionDelay: cardFlipped ? '0.2s' : '0s',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ height: '200%' }}>
            <span className={`${textSize} font-bold text-white font-mono tracking-wider drop-shadow-lg leading-none`} style={{ transform: 'translateY(-50%)' }}>
              {char}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SemmEquipmentProps {
  code: string;
}

export default function SemmEquipmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch SEMM data to find the specific equipment
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Flip animation effect on page load - must be before early returns
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 500); // Start flip after 500ms
    return () => clearTimeout(timer);
  }, []);

  // Find the equipment by code
  const findEquipmentByCode = (code: string) => {
    if (!semmData?.data) return null;
    
    for (const system of semmData.data) {
      const equipment = system.equipment?.find((eq: any) => eq.code === code);
      if (equipment) {
        return {
          equipment,
          system: system,
          breadcrumb: `${system.title} > ${equipment.title}`
        };
      }
    }
    return null;
  };

  const equipmentData = code ? findEquipmentByCode(code) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Equipment...</h2>
        </div>
      </div>
    );
  }

  if (error || !equipmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">Equipment Not Found</h2>
          <p className="text-gray-500">Equipment with code "{code}" was not found.</p>
          <button
            onClick={() => setLocation('/machine-tree')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Back to Machine Tree
          </button>
        </div>
      </div>
    );
  }

  const { equipment, system, breadcrumb } = equipmentData;

  const shareUrl = `${window.location.origin}/machinetree/${code}`;
  
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could add toast notification here
      console.log('Share link copied:', shareUrl);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };





  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => setLocation('/machine-tree')}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Machine Tree</span>
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => setLocation(`/machinetree/system/${equipmentData.system.code}`)}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              {equipmentData.system.title}
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{equipment.title}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setLocation('/machine-tree')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Machine Tree"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </button>
            
            {/* Sleek Marine Header */}
            <div className="flex-1">
              {/* Navy Header with Sleek Design */}
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white px-8 py-4 rounded-t-xl shadow-2xl border-b-2 border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-lg tracking-wide">MARITIME EQUIPMENT</span>
                      <div className="w-16 h-0.5 bg-white bg-opacity-50 mt-1"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-200 uppercase tracking-wider">Classification</div>
                    <div className="text-sm text-white font-mono">{equipment.code}</div>
                  </div>
                </div>
              </div>
              
              {/* White Background with Code Display */}
              <div className="bg-white px-8 py-6 rounded-b-xl shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  {equipment.code.split('').map((char, index) => (
                    <FlipCard key={index} char={char} index={index} large={true} />
                  ))}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{equipment.title}</h1>
                <p className="text-gray-600 text-lg">{breadcrumb}</p>
                {equipment.description && (
                  <p className="text-gray-500 mt-2">{equipment.description}</p>
                )}
              </div>
            </div>
            
            <button
              onClick={copyShareLink}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="Share this equipment"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Equipment Details */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Equipment Info */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Package className="h-5 w-5 text-blue-600 mr-2" />
                  Equipment Details
                </h3>
                <button
                  onClick={copyShareLink}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  title="Share this equipment"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Equipment Code and Title - Marine Style */}
              <div className="space-y-0 shadow-lg rounded-lg overflow-hidden border border-gray-300">
                {/* Mini Marine Header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm tracking-wider">EQUIPMENT CLASSIFICATION</span>
                  </div>
                </div>
                
                {/* White Background with Code */}
                <div className="bg-white px-6 py-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {equipment.code.split('').map((char, index) => (
                      <FlipCard key={`inline-${index}`} char={char} index={index} large={false} />
                    ))}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{equipment.title}</h2>
                    <p className="text-gray-600 text-sm">Maritime Equipment Code: {equipment.code}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">System Classification</h4>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-900 rounded-lg">
                    <span className="text-sm font-bold text-white">{system.code}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">{system.title}</div>
                    {system.description && (
                      <div className="text-sm text-gray-500">{system.description}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Description */}
              {equipment.description && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                  <p className="text-gray-600">{equipment.description}</p>
                </div>
              )}

              {/* Machines/Makes */}
              {equipment.machines && equipment.machines.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Available Makes & Models</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipment.machines.map((machine: any) => (
                      <div key={machine.id} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="font-medium text-gray-800">{machine.name}</div>
                        <div className="text-sm text-gray-600 mt-1">Make: {machine.make}</div>
                        {machine.model && (
                          <div className="text-sm text-orange-600">Model: {machine.model}</div>
                        )}
                        {machine.description && (
                          <div className="text-xs text-gray-500 mt-2">{machine.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h4 className="font-semibold text-gray-800">Quick Actions</h4>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={copyShareLink}
                  className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Equipment</span>
                </button>
                <button
                  onClick={() => setLocation('/machine-tree')}
                  className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Tree</span>
                </button>
              </div>
            </div>

            {/* Equipment Stats */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h4 className="font-semibold text-gray-800">Equipment Info</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-medium">{equipment.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">System:</span>
                  <span className="font-medium">{system.code}</span>
                </div>
                {equipment.count && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{equipment.count}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Share URL:</span>
                  <span className="text-xs text-blue-600 break-all">/machinetree/{code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}