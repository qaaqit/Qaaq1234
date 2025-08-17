import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Settings, Package, Share2, Building, ChevronRight, ChevronDown, Home, ExternalLink } from 'lucide-react';
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

  const cardSize = large ? 'w-16 h-20' : 'w-8 h-10';
  const textSize = large ? 'text-2xl' : 'text-sm';

  return (
    <div className={`relative ${cardSize} bg-black rounded-lg overflow-hidden border border-gray-600 shadow-2xl`}>
      {/* Center horizontal split line */}
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-800 z-20 shadow-lg"></div>
      
      {/* Top half container */}
      <div className="relative h-1/2 overflow-hidden" style={{ perspective: '800px' }}>
        {/* Top half loading state */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-800 flex items-end justify-center pb-1"
          style={{
            transformOrigin: 'bottom center',
            transform: cardFlipped ? 'rotateX(-90deg)' : 'rotateX(0deg)',
            transition: 'transform 0.4s ease-in-out',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Top half with character */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center overflow-hidden"
          style={{
            transformOrigin: 'bottom center',
            transform: cardFlipped ? 'rotateX(0deg)' : 'rotateX(90deg)',
            transition: 'transform 0.4s ease-in-out',
            transitionDelay: cardFlipped ? '0.2s' : '0s',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-full h-full flex items-center justify-center" style={{ clipPath: 'inset(0 0 50% 0)' }}>
            <span className={`${textSize} font-bold text-white font-mono tracking-wider drop-shadow-lg`}>
              {char}
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom half container */}
      <div className="relative h-1/2 overflow-hidden" style={{ perspective: '800px' }}>
        {/* Bottom half loading state */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-700 to-gray-800 flex items-start justify-center pt-1"
          style={{
            transformOrigin: 'top center',
            transform: cardFlipped ? 'rotateX(90deg)' : 'rotateX(0deg)',
            transition: 'transform 0.4s ease-in-out',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Bottom half with character */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center overflow-hidden"
          style={{
            transformOrigin: 'top center',
            transform: cardFlipped ? 'rotateX(0deg)' : 'rotateX(-90deg)',
            transition: 'transform 0.4s ease-in-out',
            transitionDelay: cardFlipped ? '0.2s' : '0s',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-full h-full flex items-center justify-center" style={{ clipPath: 'inset(50% 0 0 0)' }}>
            <span className={`${textSize} font-bold text-white font-mono tracking-wider drop-shadow-lg`}>
              {char}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SemmSystemPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();



  // Fetch SEMM data to find the specific system
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Find the system by code
  const findSystemByCode = (code: string) => {
    if (!semmData?.data) return null;
    
    return semmData.data.find((system: any) => system.code === code);
  };

  const systemData = code ? findSystemByCode(code) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading System...</h2>
        </div>
      </div>
    );
  }

  if (error || !systemData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">System Not Found</h2>
          <p className="text-gray-500">System with code "{code}" was not found.</p>
          <button
            onClick={() => setLocation('/machine-tree')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Machine Tree
          </button>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/machinetree/system/${code}`;
  
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      console.log('Share link copied:', shareUrl);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const navigateToEquipment = (equipmentCode: string) => {
    setLocation(`/machinetree/${equipmentCode}`);
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
            <span className="text-gray-700">{systemData.title}</span>
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
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-lg tracking-wide">MARITIME SYSTEM</span>
                      <div className="w-16 h-0.5 bg-white bg-opacity-50 mt-1"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-200 uppercase tracking-wider">Classification</div>
                    <div className="text-sm text-white font-mono">{systemData.code}</div>
                  </div>
                </div>
              </div>
              
              {/* White Background with Code Display */}
              <div className="bg-white px-8 py-6 rounded-b-xl shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  {systemData.code.split('').map((char, index) => (
                    <FlipCard key={index} char={char} index={index} large={true} />
                  ))}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
                  {systemData.title}
                  <ChevronDown className="h-6 w-6 ml-3 text-gray-500" />
                </h1>
                <p className="text-gray-600 text-lg">
                  {systemData.equipment?.length || 0} equipment types • {systemData.count || 0} questions
                </p>
                {systemData.description && (
                  <p className="text-gray-500 mt-2">{systemData.description}</p>
                )}
              </div>
            </div>
            
            <button
              onClick={copyShareLink}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="Share this system"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              Equipment Types
            </h3>
          </div>
          
          <div className="p-6">
            {systemData.equipment && systemData.equipment.length > 0 ? (
              <div className="space-y-4">
                {systemData.equipment.map((equipment: any) => (
                  <div
                    key={equipment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors group cursor-pointer"
                    onClick={() => navigateToEquipment(equipment.code)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Airport Analog Card Style Equipment Code */}
                      <div className="flex items-center space-x-1">
                        {equipment.code.split('').map((char, charIndex) => (
                          <FlipCard key={`eq-${equipment.id}-${charIndex}`} char={char} index={charIndex} large={false} />
                        ))}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-blue-900 group-hover:text-blue-700 transition-colors">
                          {equipment.title}
                        </h4>
                        {equipment.description && (
                          <p className="text-sm text-gray-500 mt-1">{equipment.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {equipment.count && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {equipment.count} machines
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToEquipment(equipment.code);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View Equipment Details"
                      >
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                      </button>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">No Equipment Found</h4>
                <p className="text-gray-500">This system doesn't have any equipment types configured yet.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* System Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equipment Types</p>
                <p className="text-2xl font-semibold text-gray-900">{systemData.equipment?.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Settings className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Machines</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemData.equipment?.reduce((total: number, eq: any) => total + (eq.count || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Questions</p>
                <p className="text-2xl font-semibold text-gray-900">{systemData.count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}