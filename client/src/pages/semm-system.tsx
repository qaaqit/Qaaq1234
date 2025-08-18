import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

// Bottom edge roll out flip card animation
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 600 + (index * 150));
    
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-8 h-10' : 'w-8 h-12';
  const textSize = large ? 'text-2xl' : 'text-lg';

  return (
    <div className={`relative ${cardSize} rounded-lg overflow-hidden border-2 border-white shadow-lg`} 
         style={{ 
           perspective: '1000px',
           boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0, 0, 0, 0.2)'
         }}>
      {/* Loading state card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 -1px 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <div className="w-2 h-2 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Character reveal card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(180deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <span className={`${textSize} font-bold text-white font-mono tracking-wider leading-none`}
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8), 0 -1px 1px rgba(255, 255, 255, 0.2)',
                filter: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.1))'
              }}>
          {char}
        </span>
      </div>
      
      {/* Mechanical click flash effect */}
      {isFlipped && (
        <div 
          className="absolute inset-0 bg-white pointer-events-none"
          style={{
            opacity: 0,
            animation: 'flash 0.1s ease-out',
          }}
        />
      )}
      
      <style>{`
        @keyframes flash {
          0% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `}</style>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading system details...</div>
      </div>
    );
  }

  if (error || !semmData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load system data</div>
      </div>
    );
  }

  // Find the specific system by code
  const systems = Array.isArray((semmData as any)?.data) ? (semmData as any).data : (semmData as any)?.systems || [];
  const foundSystem = systems.find((system: any) => system.code === code);

  if (!foundSystem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">System with code "{code}" not found</div>
      </div>
    );
  }

  const goBack = () => {
    setLocation('/machinetree');
  };

  const goHome = () => {
    setLocation('/machinetree');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Compact Layout */}
      <div className="bg-white shadow-lg">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            {/* Back Arrow - Top Left Corner */}
            <div className="flex justify-start mb-2">
              <button
                onClick={goBack}
                className="p-1 hover:bg-orange-100 text-orange-600 rounded-full transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            
            {/* Code Card, Title & Share Icon - Compact Layout */}
            <div className="flex items-center justify-between">
              {/* Left side - Code Card */}
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-500 mb-1 tracking-widest">SYSTEM</div>
                  <FlipCard char={foundSystem.code} index={0} large={true} />
                </div>
              </div>

              {/* Center - Title */}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-black text-gray-900">
                  {foundSystem.title}
                </h1>
                <p className="text-xs text-orange-600 font-medium">MACHINE TREE</p>
              </div>

              {/* Right side - Share Icon */}
              <div className="flex items-center">
                <button
                  className="p-2 hover:bg-gray-100 text-gray-600 rounded-full transition-colors"
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Orange Horizontal Line */}
        <div className="h-1 bg-orange-400"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm mb-8" data-testid="breadcrumb-nav">
          <button 
            onClick={goHome}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            data-testid="breadcrumb-home"
          >
            Machine Tree
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="flex items-center space-x-1">
            <span className="text-gray-600 font-medium" data-testid="breadcrumb-current">
              {foundSystem.title}
            </span>
            <button 
              className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded transition-colors"
              data-testid="breadcrumb-expand"
              title="Explore equipment and components"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* Content area for future system details */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <p className="text-lg text-gray-600 leading-relaxed">
            Maritime system classification: <span className="font-bold text-orange-600">SEMM Tree Navigation</span>
          </p>
          <div className="mt-6 text-gray-500">
            System details and equipment listings will be displayed here.
          </div>
        </div>

      </div>
    </div>
  );
}