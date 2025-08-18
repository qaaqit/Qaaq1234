import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, Edit3, RotateCcw } from 'lucide-react';
import { SemmReorderModal } from '@/components/semm-reorder-modal';
import { apiRequest } from '@/lib/queryClient';
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
      

    </div>
  );
};

export default function SemmEquipmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.isAdmin || user?.role === 'admin';

  // Fetch SEMM data to find the specific equipment
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Admin edit and reorder functions
  const [reorderModal, setReorderModal] = useState<{
    isOpen: boolean;
    items: Array<{ code: string; title: string }>;
  }>({
    isOpen: false,
    items: []
  });

  const handleEditEquipment = (equipmentCode: string) => {
    console.log('Edit equipment:', equipmentCode);
    // TODO: Implement edit equipment modal
  };

  const handleEditMake = (makeCode: string) => {
    console.log('Edit make:', makeCode);
    // TODO: Implement edit make modal
  };

  const handleReorderMakes = () => {
    if (!foundEquipment?.makes) return;
    
    const makes = foundEquipment.makes.map((make: any) => ({
      code: make.code,
      title: make.title
    }));
    
    setReorderModal({
      isOpen: true,
      items: makes
    });
  };

  const handleReorderSubmit = async (orderedCodes: string[]) => {
    await apiRequest('/api/dev/semm/reorder-makes', {
      method: 'POST',
      body: { 
        systemCode: parentSystem.code, 
        equipmentCode: foundEquipment.code,
        orderedCodes 
      }
    });
  };

  const closeReorderModal = () => {
    setReorderModal(prev => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading equipment details...</div>
      </div>
    );
  }

  if (error || !semmData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load equipment data</div>
      </div>
    );
  }

  // Find the specific equipment by code
  let foundEquipment = null;
  let parentSystem = null;

  // Check if semmData.data is an array of systems or has a systems property
  const systems = Array.isArray(semmData.data) ? semmData.data : semmData.data.systems || [];
  
  for (const system of systems) {
    if (system.equipment && Array.isArray(system.equipment)) {
      for (const equipment of system.equipment) {
        if (equipment.code === code) {
          foundEquipment = equipment;
          parentSystem = system;
          break;
        }
      }
    }
    if (foundEquipment) break;
  }

  if (!foundEquipment || !parentSystem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Equipment with code "{code}" not found</div>
      </div>
    );
  }

  const goBack = () => {
    setLocation(`/machinetree/${parentSystem.code}`);
  };

  const goHome = () => {
    setLocation('/machinetree');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Back Arrow and Breadcrumb in One Line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button 
              onClick={goBack}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              data-testid="button-back"
              title="Back to System"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="hover:text-gray-700 cursor-pointer" onClick={goHome}>Machine Tree</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goBack}>{parentSystem.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">{foundEquipment.title}</span>
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
              <div className="text-xs font-bold text-gray-500 mb-2 tracking-widest">EQUIPMENT</div>
              <div className="flex items-center space-x-1">
                <FlipCard char={foundEquipment.code[0]} index={0} large={true} />
                <FlipCard char={foundEquipment.code[1]} index={1} large={true} />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                {foundEquipment.title}
              </h1>
              <p className="text-sm text-gray-600">
                Maritime equipment classification: <span className="font-bold text-orange-600">{parentSystem.title}</span>
              </p>
            </div>
          </div>

          {/* Admin Edit Button */}
          {isAdmin && (
            <button
              onClick={() => handleEditEquipment(foundEquipment.code)}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              title="Edit Equipment"
              data-testid="edit-equipment-btn"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Makes Cards Grid */}
        {foundEquipment.makes && foundEquipment.makes.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Makes for {foundEquipment.title}</h2>
              {isAdmin && (
                <button
                  onClick={handleReorderMakes}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  title="Reorder Makes"
                  data-testid="reorder-makes-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reorder Makes</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {foundEquipment.makes.map((make: any) => (
                <div 
                  key={make.code}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/machinetree/make/${make.code}`)}
                  data-testid={`make-card-${make.code}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-bold">{make.code}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                          {make.title}
                        </h3>
                        <p className="text-sm text-gray-500">Make Type</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {make.description || `${make.title} make classification`}
                    </p>
                    
                    {make.models && make.models.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Models Available</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {make.models.length} {make.models.length === 1 ? 'Model' : 'Models'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin edit button */}
                  {isAdmin && (
                    <div className="mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMake(make.code);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors w-full justify-center"
                        title="Edit Make"
                        data-testid={`edit-make-${make.code}`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Make</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <p className="text-lg text-gray-600">No makes found for this equipment.</p>
          </div>
        )}

      </div>
      
      {/* Reorder Modal */}
      <SemmReorderModal
        isOpen={reorderModal.isOpen}
        onClose={closeReorderModal}
        title="Makes"
        items={reorderModal.items}
        onReorder={handleReorderSubmit}
      />
    </div>
  );
}