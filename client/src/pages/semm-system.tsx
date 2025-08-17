import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight } from 'lucide-react';
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

  const cardSize = large ? 'w-16 h-20' : 'w-8 h-12';
  const textSize = large ? 'text-4xl' : 'text-lg';

  return (
    <div className={`relative ${cardSize} bg-black rounded-lg overflow-hidden border-2 border-gray-600 shadow-2xl`} style={{ perspective: '1000px' }}>
      {/* Loading state card */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden'
        }}
      >
        <div className="w-2 h-2 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Character reveal card */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-orange-600 via-red-600 to-orange-600 flex items-center justify-center shadow-inner"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(180deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden'
        }}
      >
        <span className={`${textSize} font-bold text-white font-mono tracking-wider drop-shadow-2xl leading-none`}>
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
      
      <style jsx>{`
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

  if (error || !semmData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load system data</div>
      </div>
    );
  }

  // Find the specific system by code
  const systems = Array.isArray(semmData.data) ? semmData.data : semmData.data.systems || [];
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
      {/* Super Stylish Header with QAAQ Colors */}
      <div className="relative bg-gradient-to-r from-black via-red-900 to-orange-600 shadow-2xl overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-orange-500/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, rgba(234, 88, 12, 0.1) 0%, transparent 50%)`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Navigation */}
            <div className="flex items-center space-x-6">
              <button
                onClick={goHome}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                data-testid="button-home"
              >
                <Home className="w-5 h-5" />
                <span className="font-bold">Home</span>
              </button>
              
              <button
                onClick={goBack}
                className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-xl backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Machine Tree</span>
              </button>
            </div>

            {/* Center - QAAQ Branding */}
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-black bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent tracking-wider">
                QAAQ
              </h1>
              <p className="text-orange-200/80 text-sm font-medium tracking-widest">MACHINE TREE</p>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-4">
              <button
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                data-testid="button-share"
              >
                <Share2 className="w-5 h-5" />
                <span className="font-bold">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm mb-8" data-testid="breadcrumb-nav">
          <button 
            onClick={goHome}
            className="text-red-600 hover:text-red-800 font-medium transition-colors"
            data-testid="breadcrumb-home"
          >
            Machine Tree
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 font-medium" data-testid="breadcrumb-current">
            {foundSystem.title}
          </span>
        </nav>

        {/* System Header Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          
          {/* System Code Display */}
          <div className="mb-6">
            <div className="text-sm font-bold text-gray-500 mb-4 tracking-widest">SYSTEM</div>
            <div className="flex items-center space-x-4">
              <FlipCard char={foundSystem.code} index={0} large={true} />
            </div>
          </div>

          {/* System Title */}
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-4">
              {foundSystem.title}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Maritime system classification: <span className="font-bold text-red-600">SEMM Tree Navigation</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}