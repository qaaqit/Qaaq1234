import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, ChevronRight, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Bottom edge roll out flip card animation
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 600 + (index * 150));
    
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-16 h-20' : 'w-10 h-14';
  const textSize = large ? 'text-4xl' : 'text-xl';

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
        <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
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

export default function SemmModelPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.isAdmin || user?.role === 'admin';

  // Fetch SEMM data to find the specific model
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Admin edit functions
  const handleEditModel = (modelCode: string) => {
    console.log('Edit model:', modelCode);
    // TODO: Implement edit model modal
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading model details...</div>
      </div>
    );
  }

  if (error || !semmData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load model data</div>
      </div>
    );
  }

  // Find the specific model by searching through all systems
  const systems = Array.isArray((semmData as any)?.data) ? (semmData as any).data : [];
  let foundModel: any = null;
  let parentMake: any = null;
  let parentEquipment: any = null;
  let parentSystem: any = null;

  for (const system of systems) {
    if (system.equipment) {
      for (const equipment of system.equipment) {
        if (equipment.makes) {
          for (const make of equipment.makes) {
            if (make.models) {
              const model = make.models.find((m: any) => m.code === code);
              if (model) {
                foundModel = model;
                parentMake = make;
                parentEquipment = equipment;
                parentSystem = system;
                break;
              }
            }
          }
          if (foundModel) break;
        }
      }
      if (foundModel) break;
    }
  }

  if (!foundModel || !parentMake || !parentEquipment || !parentSystem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Model with code "{code}" not found</div>
      </div>
    );
  }

  const goHome = () => {
    setLocation('/machinetree');
  };

  const goToSystem = () => {
    setLocation(`/machinetree/${parentSystem.code}`);
  };

  const goToEquipment = () => {
    setLocation(`/machinetree/${parentEquipment.code}`);
  };

  const goToMake = () => {
    setLocation(`/machinetree/${parentMake.code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Back Arrow and Breadcrumb in One Line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button 
              onClick={goToMake}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              data-testid="button-back"
              title="Back to Make"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="hover:text-gray-700 cursor-pointer" onClick={goHome}>Machine Tree</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goToSystem}>{parentSystem.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goToEquipment}>{parentEquipment.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goToMake}>{parentMake.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">{foundModel.title}</span>
          </div>

          {/* Share Icon */}
          <button
            className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Code Card - Top Left */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <div className="text-xs font-bold text-gray-500 mb-2 tracking-widest">MODEL</div>
              <div className="flex items-center space-x-1">
                <FlipCard char={foundModel.code[0]} index={0} large={true} />
                <FlipCard char={foundModel.code[1]} index={1} large={true} />
                <FlipCard char={foundModel.code[2]} index={2} large={true} />
                <FlipCard char={foundModel.code[3]} index={3} large={true} />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                {foundModel.title}
              </h1>
              <p className="text-sm text-gray-600">
                Maritime model specification: <span className="font-bold text-orange-600">{parentSystem.title}</span> → <span className="font-bold text-blue-600">{parentEquipment.title}</span> → <span className="font-bold text-purple-600">{parentMake.title}</span>
              </p>
            </div>
          </div>

          {/* Admin Edit Button */}
          {isAdmin && (
            <button
              onClick={() => handleEditModel(foundModel.code)}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              title="Edit Model"
              data-testid="edit-model-btn"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Model Details Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Model Specifications</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Model Code</span>
                  <p className="text-lg font-semibold text-gray-900">{foundModel.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Model Name</span>
                  <p className="text-lg font-semibold text-gray-900">{foundModel.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Make</span>
                  <p className="text-lg text-purple-600 font-medium">{parentMake.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Equipment Type</span>
                  <p className="text-lg text-blue-600 font-medium">{parentEquipment.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">System Category</span>
                  <p className="text-lg text-orange-600 font-medium">{parentSystem.title}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Technical Information</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 leading-relaxed">
                  {foundModel.description || `Detailed specifications and technical documentation for the ${foundModel.title} model are available through the maritime equipment database. This model is part of the ${parentMake.title} product line for ${parentEquipment.title} applications.`}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}