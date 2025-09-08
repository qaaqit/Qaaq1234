import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, Edit3, RotateCcw, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

export default function SemmEquipmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  
  const isAdminOrIntern = user?.isAdmin || user?.isIntern || false;
  
  // Debug admin/intern detection
  console.log('🔐 SEMM Equipment - User object:', user);
  console.log('🔐 SEMM Equipment - admin/intern check:', { isAdmin: user?.isAdmin, isIntern: user?.isIntern, canEdit: isAdminOrIntern });

  // Admin state
  const [currentMakeIndex, setCurrentMakeIndex] = useState(0);
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const [reorderItems, setReorderItems] = useState<Array<{ code: string; title: string }>>([]);
  
  // Add make state
  const [showAddMakeForm, setShowAddMakeForm] = useState(false);
  const [addMakeForm, setAddMakeForm] = useState({
    makeName: '',
    description: ''
  });
  
  // Edit equipment state
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [editEquipmentForm, setEditEquipmentForm] = useState({
    equipmentCode: '',
    equipmentTitle: ''
  });

  // Fetch SEMM data to find the specific equipment
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });








  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading equipment details...</div>
      </div>
    );
  }

  if (error || !semmData) {
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
  const systems = Array.isArray((semmData as any)?.data) ? (semmData as any).data : (semmData as any)?.systems || [];
  
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

  // Admin edit and reorder functions
  const handleEditEquipment = (equipmentCode: string) => {
    console.log('Edit equipment:', equipmentCode);
    
    // Get current equipment title without any code prefix
    const currentTitle = foundEquipment.title;
    
    setEditEquipmentForm({
      equipmentCode: equipmentCode,
      equipmentTitle: currentTitle
    });
    setShowEditEquipmentModal(true);
  };

  const handleEditMake = (makeCode: string) => {
    console.log('Edit make:', makeCode);
    // TODO: Implement edit make modal
  };

  const handleAddNewMake = () => {
    setShowAddMakeForm(true);
    setAddMakeForm({ makeName: '', description: '' });
  };

  const handleAddMakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addMakeForm.makeName.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/add-make', 'POST', {
        systemCode: parentSystem.code,
        equipmentCode: foundEquipment.code,
        makeName: addMakeForm.makeName.trim(),
        description: addMakeForm.description.trim()
      });
      
      console.log('✅ Successfully added new make');
      
      // Reset form and hide it
      setShowAddMakeForm(false);
      setAddMakeForm({ makeName: '', description: '' });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error adding new make:', error);
    }
  };

  const handleCancelAddMake = () => {
    setShowAddMakeForm(false);
    setAddMakeForm({ makeName: '', description: '' });
  };

  const handleEditEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editEquipmentForm.equipmentTitle.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/update-equipment-title', 'POST', {
        code: editEquipmentForm.equipmentCode,
        title: editEquipmentForm.equipmentTitle.trim()
      });
      
      console.log('✅ Successfully updated equipment title');
      
      // Reset form and hide modal
      setShowEditEquipmentModal(false);
      setEditEquipmentForm({ equipmentCode: '', equipmentTitle: '' });
      
      // Refresh the data immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      await queryClient.refetchQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error updating equipment title:', error);
      alert('Failed to update equipment title. Please try again.');
    }
  };

  const handleCancelEditEquipment = () => {
    setShowEditEquipmentModal(false);
    setEditEquipmentForm({ equipmentCode: '', equipmentTitle: '' });
  };

  const handleReorderMakes = () => {
    if (!foundEquipment?.makes) return;
    
    const makes = foundEquipment.makes.map((make: any) => ({
      code: make.code,
      title: make.title
    }));
    
    setReorderItems(makes);
    setReorderEnabled(true);
  };

  const handleReorderSubmit = async () => {
    try {
      // Send the reordered makes with their original codes in new order
      // Backend will assign new sequential codes based on this order
      const orderedMakeData = reorderItems.map((item, index) => ({
        oldCode: item.code,
        makeName: item.title,
        newPosition: index
      }));
      
      await apiRequest('/api/dev/semm/reorder-makes', 'POST', { 
        systemCode: parentSystem.code, 
        equipmentCode: foundEquipment.code,
        orderedMakes: orderedMakeData
      });
      console.log('✅ Successfully reordered makes');
      setReorderEnabled(false);
      setReorderItems([]);
      
      // Refresh the data to show updated codes
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
    } catch (error) {
      console.error('❌ Error reordering makes:', error);
    }
  };

  const handleCancelReorder = () => {
    setReorderEnabled(false);
    setReorderItems([]);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...reorderItems];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setReorderItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === reorderItems.length - 1) return;
    const newItems = [...reorderItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setReorderItems(newItems);
  };

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
          {isAdminOrIntern && (
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
              <div className="flex items-center space-x-2">
                {isAdminOrIntern && !reorderEnabled && (
                  <>
                    <button
                      onClick={handleReorderMakes}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                      title="Reorder Makes"
                      data-testid="reorder-makes-btn"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleAddNewMake}
                      disabled={showAddMakeForm}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add New Make"
                      data-testid="add-new-make-btn"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reorder Controls - Fixed buttons when in reorder mode */}
            {reorderEnabled && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-orange-800">Reorder Makes</h3>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelReorder}
                      data-testid="cancel-reorder"
                      className="border-orange-300 text-orange-600 hover:bg-orange-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReorderSubmit}
                      data-testid="save-reorder"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Save Order
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Make Form - Show when adding new make */}
            {showAddMakeForm && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-4">Add New Make to {foundEquipment.title}</h3>
                <form onSubmit={handleAddMakeSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="makeName" className="block text-sm font-medium text-gray-700 mb-2">
                      Make Name *
                    </label>
                    <input
                      type="text"
                      id="makeName"
                      value={addMakeForm.makeName}
                      onChange={(e) => setAddMakeForm(prev => ({ ...prev, makeName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Caterpillar, ABB, Siemens"
                      required
                      data-testid="input-make-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="makeDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="makeDescription"
                      value={addMakeForm.description}
                      onChange={(e) => setAddMakeForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Brief description of this make..."
                      rows={3}
                      data-testid="input-make-description"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      data-testid="btn-save-make"
                    >
                      Add Make
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAddMake}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-make"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Edit Equipment Modal */}
            {showEditEquipmentModal && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-4">Edit Equipment Title</h3>
                <form onSubmit={handleEditEquipmentSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="equipmentCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Code
                    </label>
                    <input
                      type="text"
                      id="equipmentCode"
                      value={editEquipmentForm.equipmentCode}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      data-testid="input-equipment-code"
                    />
                  </div>
                  <div>
                    <label htmlFor="equipmentTitle" className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Title *
                    </label>
                    <input
                      type="text"
                      id="equipmentTitle"
                      value={editEquipmentForm.equipmentTitle}
                      onChange={(e) => setEditEquipmentForm(prev => ({ ...prev, equipmentTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Gearbox, Governor, Fuel Injector"
                      required
                      data-testid="input-equipment-title"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      data-testid="btn-save-equipment-title"
                    >
                      Update Equipment Title
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditEquipment}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-equipment-title"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(reorderEnabled ? reorderItems : foundEquipment.makes).map((make: any, index: number) => (
                <div 
                  key={make.code}
                  className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-shadow group ${
                    reorderEnabled ? 'cursor-default' : 'cursor-pointer hover:shadow-xl'
                  }`}
                  onClick={reorderEnabled ? undefined : () => setLocation(`/machinetree/${make.code}`)}
                  data-testid={`make-card-${make.code}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold">{make.code}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                          {make.title}
                        </h3>
                        <p className="text-sm text-gray-500">Make Type</p>
                      </div>
                    </div>
                    
                    {/* Reorder controls when in reorder mode */}
                    {reorderEnabled ? (
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveItemUp(index)}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          data-testid={`move-up-${make.code}`}
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItemDown(index)}
                          disabled={index === reorderItems.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          data-testid={`move-down-${make.code}`}
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {make.description || `${make.title} make classification`}
                    </p>
                    
                    {make.models && make.models.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Models Available</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {make.models.length} {make.models.length === 1 ? 'Model' : 'Models'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin edit button - only show when not in reorder mode */}
                  {isAdminOrIntern && !reorderEnabled && (
                    <div className="mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMake(make.code);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors w-full justify-center"
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
    </div>
  );
}