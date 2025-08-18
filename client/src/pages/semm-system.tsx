import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, ChevronDown, GripVertical, Plus, Edit3, Ship } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SemmReorderModal } from '@/components/semm-reorder-modal';
import { apiRequest } from '@/lib/queryClient';
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
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [reorderModal, setReorderModal] = useState<{
    isOpen: boolean;
    items: Array<{ code: string; title: string }>;
    type: string;
  }>({
    isOpen: false,
    items: [],
    type: ''
  });
  
  const { data: user } = useAuth();
  const isAdmin = user?.isAdmin || false;

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

  const handleEditSystem = (systemCode: string) => {
    console.log('Edit system:', systemCode);
  };

  const handleEditEquipment = (equipmentCode: string) => {
    console.log('Edit equipment:', equipmentCode);
  };

  const handleAddNewEquipment = () => {
    console.log('Add new equipment');
  };

  const handleReorderEquipment = () => {
    if (!foundSystem.equipment) return;
    
    const equipment = foundSystem.equipment.map((eq: any) => ({
      code: eq.code,
      title: eq.title
    }));
    
    setReorderModal({
      isOpen: true,
      type: 'equipment',
      items: equipment
    });
  };

  const handleReorderSubmit = async (orderedCodes: string[]) => {
    try {
      await apiRequest('/api/dev/semm/reorder-equipment', 'POST', { 
        systemCode: foundSystem.code,
        orderedCodes 
      });
      console.log('✅ Successfully reordered equipment');
    } catch (error) {
      console.error('❌ Error reordering equipment:', error);
    }
  };

  const closeReorderModal = () => {
    setReorderModal(prev => ({ ...prev, isOpen: false }));
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
              title="Back to Machine Tree"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="hover:text-gray-700 cursor-pointer" onClick={goBack}>Machine Tree</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">{foundSystem.title}</span>
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
              <div className="text-xs font-bold text-gray-500 mb-2 tracking-widest">SYSTEM</div>
              <FlipCard char={foundSystem.code} index={0} large={true} />
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                {foundSystem.title}
              </h1>
              <p className="text-sm text-gray-600">Maritime system classification</p>
            </div>
          </div>

          {/* Equipment Dropdown */}
          <div className="relative">
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              data-testid="dropdown-equipment"
              title="Show equipment in this system"
              onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* Equipment Dropdown Menu */}
            {showEquipmentDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
                {foundSystem.equipment?.map((equipment: any) => (
                  <button
                    key={equipment.code}
                    onClick={() => {
                      setLocation(`/machinetree/${equipment.code}`);
                      setShowEquipmentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                    data-testid={`dropdown-equipment-${equipment.code}`}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-bold">{equipment.code}</span>
                    </div>
                    <span className="text-gray-800 font-medium">{equipment.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Equipment Cards Grid */}
        {foundSystem.equipment && foundSystem.equipment.length > 0 ? (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
                <Ship className="h-6 w-6 text-blue-600 mr-3" />
                Equipment in {foundSystem.title}
                {isAdmin && (
                  <button
                    onClick={() => handleEditSystem(foundSystem.code)}
                    className="ml-2 p-1 hover:bg-orange-100 rounded"
                    title="Edit System"
                    data-testid="edit-system"
                  >
                    <Edit3 className="h-4 w-4 text-orange-600" />
                  </button>
                )}
              </h2>
              
              {/* Admin Controls for Equipment */}
              {isAdmin && (
                <button
                  onClick={handleReorderEquipment}
                  className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 mb-4 px-3 py-2 bg-orange-50 rounded-lg"
                  data-testid="reorder-equipment"
                >
                  <GripVertical className="h-4 w-4" />
                  <span>Reorder Equipment</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {foundSystem.equipment.map((equipment: any) => (
                <div 
                  key={equipment.code}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/machinetree/${equipment.code}`)}
                  data-testid={`equipment-card-${equipment.code}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold">{equipment.code}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {equipment.title}
                        </h3>
                        <p className="text-sm text-gray-500">Equipment Type</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {equipment.description || `${equipment.title} equipment classification`}
                    </p>
                    
                    {equipment.makes && equipment.makes.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Makes Available</span>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {equipment.makes.length} {equipment.makes.length === 1 ? 'Make' : 'Makes'}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {equipment.makes.reduce((sum: number, make: any) => sum + (make.models?.length || 0), 0)} Models
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin edit button */}
                  {isAdmin && (
                    <div className="mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEquipment(equipment.code);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors w-full justify-center"
                        title="Edit Equipment"
                        data-testid={`edit-equipment-${equipment.code}`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Equipment</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Equipment Button for Admins */}
            {isAdmin && (
              <div className="mt-6">
                <button
                  onClick={handleAddNewEquipment}
                  className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 px-4 py-3 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-400 transition-colors"
                  data-testid="add-new-equipment"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Equipment</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <p className="text-lg text-gray-600">No equipment found for this system.</p>
          </div>
        )}

      </div>
      
      {/* Reorder Modal */}
      <SemmReorderModal
        isOpen={reorderModal.isOpen}
        onClose={closeReorderModal}
        title="Equipment"
        items={reorderModal.items}
        onReorder={handleReorderSubmit}
      />
    </div>
  );
}