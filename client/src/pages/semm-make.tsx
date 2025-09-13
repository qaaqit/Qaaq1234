import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Share2, ChevronRight, Edit3, RotateCcw, ChevronUp, ChevronDown, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
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

export default function SemmMakePage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  const isAdminOrIntern = user?.isAdmin || user?.isIntern || false;
  
  // Debug admin/intern detection
  console.log('🔐 SEMM Make - User object:', user);
  console.log('🔐 SEMM Make - admin/intern check:', { isAdmin: user?.isAdmin, isIntern: user?.isIntern, canEdit: isAdminOrIntern });

  // Fetch SEMM data to find the specific make
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Admin edit functions
  const handleEditMake = (makeCode: string) => {
    console.log('Edit make:', makeCode);
    
    // Get current make title
    const currentTitle = foundMake.title;
    
    setEditMakeForm({
      makeCode: makeCode,
      makeTitle: currentTitle
    });
    setShowEditMakeModal(true);
  };

  const handleAddNewModel = () => {
    setShowAddModelForm(true);
    setAddModelForm({ modelName: '', description: '' });
  };

  const handleAddModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addModelForm.modelName.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/add-model', 'POST', {
        systemCode: parentSystem.code,
        equipmentCode: parentEquipment.code,
        makeCode: foundMake.code,
        modelName: addModelForm.modelName.trim(),
        description: addModelForm.description.trim()
      });
      
      console.log('✅ Successfully added new model');
      
      // Reset form and hide it
      setShowAddModelForm(false);
      setAddModelForm({ modelName: '', description: '' });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error adding new model:', error);
    }
  };

  const handleCancelAddModel = () => {
    setShowAddModelForm(false);
    setAddModelForm({ modelName: '', description: '' });
  };

  const handleEditMakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editMakeForm.makeTitle.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/update-make-title', 'POST', {
        code: editMakeForm.makeCode,
        title: editMakeForm.makeTitle.trim()
      });
      
      console.log('✅ Successfully updated make title');
      
      // Reset form and hide modal
      setShowEditMakeModal(false);
      setEditMakeForm({ makeCode: '', makeTitle: '' });
      
      // Refresh the data immediately
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error updating make title:', error);
      alert('Failed to update make title. Please try again.');
    }
  };

  const handleCancelEditMake = () => {
    setShowEditMakeModal(false);
    setEditMakeForm({ makeCode: '', makeTitle: '' });
  };

  const handleEditModel = (modelCode: string) => {
    console.log('Edit model:', modelCode);
    // TODO: Implement edit model modal
  };

  // Reorder functionality
  const [reorderMode, setReorderMode] = useState(false);
  const [tempModels, setTempModels] = useState<any[]>([]);
  
  // Add model state
  const [showAddModelForm, setShowAddModelForm] = useState(false);
  const [addModelForm, setAddModelForm] = useState({
    modelName: '',
    description: ''
  });
  
  // Edit make state
  const [showEditMakeModal, setShowEditMakeModal] = useState(false);
  const [editMakeForm, setEditMakeForm] = useState({
    makeCode: '',
    makeTitle: ''
  });

  const handleReorderModels = () => {
    if (!foundMake?.models) return;
    console.log('🔄 Reorder button clicked');
    console.log('📦 Model items:', foundMake.models.map((model: any) => ({ code: model.code, title: model.title })));
    
    setTempModels([...foundMake.models]);
    setReorderMode(true);
    console.log('✅ Reorder mode enabled');
  };

  const handleReorderSubmit = async () => {
    try {
      const orderedModels = tempModels.map((item, index) => ({
        modelName: item.title,
        oldCode: item.code,
        newPosition: index
      }));

      await apiRequest('/api/dev/semm/reorder-models', 'POST', { 
        systemCode: parentSystem.code, 
        equipmentCode: parentEquipment.code,
        makeCode: foundMake.code,
        orderedModels 
      });
      console.log('✅ Successfully reordered models');
      
      // Reset reorder mode and refresh data
      setReorderMode(false);
      setTempModels([]);
      
      // Invalidate and refetch the query
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error reordering models:', error);
    }
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setTempModels([]);
  };

  const moveModel = (index: number, direction: 'up' | 'down') => {
    const newModels = [...tempModels];
    if (direction === 'up' && index > 0) {
      [newModels[index], newModels[index - 1]] = [newModels[index - 1], newModels[index]];
    } else if (direction === 'down' && index < newModels.length - 1) {
      [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
    }
    setTempModels(newModels);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading make details...</div>
      </div>
    );
  }

  if (error || !semmData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load make data</div>
      </div>
    );
  }

  // Find the specific make by searching through all systems
  const systems = Array.isArray((semmData as any)?.data) ? (semmData as any).data : [];
  let foundMake: any = null;
  let parentEquipment: any = null;
  let parentSystem: any = null;

  for (const system of systems) {
    if (system.equipment) {
      for (const equipment of system.equipment) {
        if (equipment.makes) {
          const make = equipment.makes.find((m: any) => m.code === code);
          if (make) {
            foundMake = make;
            parentEquipment = equipment;
            parentSystem = system;
            break;
          }
        }
      }
      if (foundMake) break;
    }
  }

  if (!foundMake || !parentEquipment || !parentSystem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Make with code "{code}" not found</div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Back Arrow and Breadcrumb in One Line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button 
              onClick={goToEquipment}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              data-testid="button-back"
              title="Back to Equipment"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="hover:text-gray-700 cursor-pointer" onClick={goHome}>Machine Tree</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goToSystem}>{parentSystem.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goToEquipment}>{parentEquipment.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">{foundMake.title}</span>
          </div>

          {/* Share and Workshop Icons */}
          <div className="flex flex-col space-y-2">
            <button
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLocation(`/semm-tasks/${parentSystem.code}/${parentEquipment.code}/${foundMake.code}`)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              data-testid="button-workshop-tasks"
              title="Workshop Tasks"
            >
              <Wrench className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Card - Top Left */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <div className="text-xs font-bold text-gray-500 mb-2 tracking-widest">MAKE</div>
              <div className="flex items-center space-x-1">
                <FlipCard char={foundMake.code[0]} index={0} large={true} />
                <FlipCard char={foundMake.code[1]} index={1} large={true} />
                <FlipCard char={foundMake.code[2]} index={2} large={true} />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                {foundMake.title}
              </h1>
              <p className="text-sm text-gray-600">
                Maritime make classification: <span className="font-bold text-orange-600">{parentSystem.title}</span> → <span className="font-bold text-orange-600">{parentEquipment.title}</span>
              </p>
            </div>
          </div>

          {/* Admin Edit Button */}
          {isAdminOrIntern && (
            <button
              onClick={() => handleEditMake(foundMake.code)}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              title="Edit Make"
              data-testid="edit-make-btn"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Models Cards Grid */}
        {foundMake.models && foundMake.models.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Models for {foundMake.title}</h2>
              <div className="flex items-center space-x-2">
                {isAdminOrIntern && !reorderMode && (
                  <>
                    <button
                      onClick={handleReorderModels}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                      title="Reorder Models"
                      data-testid="reorder-models-btn"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleAddNewModel}
                      disabled={showAddModelForm}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add New Model"
                      data-testid="add-new-model-btn"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                )}
                {reorderMode && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={cancelReorder}
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
                )}
              </div>
            </div>
            
            {/* Add Model Form - Show when adding new model */}
            {showAddModelForm && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-4">Add New Model to {foundMake.title}</h3>
                <form onSubmit={handleAddModelSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 mb-2">
                      Model Name *
                    </label>
                    <input
                      type="text"
                      id="modelName"
                      value={addModelForm.modelName}
                      onChange={(e) => setAddModelForm(prev => ({ ...prev, modelName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., L16/24, ME-C, RT-flex96C"
                      required
                      data-testid="input-model-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="modelDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="modelDescription"
                      value={addModelForm.description}
                      onChange={(e) => setAddModelForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Brief description of this model..."
                      rows={3}
                      data-testid="input-model-description"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      data-testid="btn-save-model"
                    >
                      Add Model
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAddModel}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-model"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Edit Make Modal */}
            {showEditMakeModal && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-4">Edit Make Title</h3>
                <form onSubmit={handleEditMakeSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="makeCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Make Code
                    </label>
                    <input
                      type="text"
                      id="makeCode"
                      value={editMakeForm.makeCode}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      data-testid="input-make-code"
                    />
                  </div>
                  <div>
                    <label htmlFor="makeTitle" className="block text-sm font-medium text-gray-700 mb-2">
                      Make Title *
                    </label>
                    <input
                      type="text"
                      id="makeTitle"
                      value={editMakeForm.makeTitle}
                      onChange={(e) => setEditMakeForm(prev => ({ ...prev, makeTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Caterpillar, ABB, Siemens"
                      required
                      data-testid="input-make-title"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      data-testid="btn-save-make-title"
                    >
                      Update Make Title
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditMake}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-make-title"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(reorderMode ? tempModels : foundMake.models).map((model: any, index: number) => (
                <div 
                  key={model.code}
                  className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-shadow ${!reorderMode ? 'hover:shadow-xl cursor-pointer' : ''} group`}
                  onClick={!reorderMode ? () => setLocation(`/machinetree/${model.code}`) : undefined}
                  data-testid={`model-card-${model.code}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-xs">{model.code}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                          {model.title}
                        </h3>
                        <p className="text-sm text-gray-500">Model Type</p>
                      </div>
                    </div>
                    {reorderMode ? (
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveModel(index, 'up')}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-orange-50 transition-colors"
                          data-testid={`move-up-${model.code}`}
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveModel(index, 'down')}
                          disabled={index === tempModels.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-orange-50 transition-colors"
                          data-testid={`move-down-${model.code}`}
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
                      {model.description || `${model.title} model specification`}
                    </p>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Code: {model.code}</span>
                    </div>
                  </div>

                  {/* Admin edit button */}
                  {isAdminOrIntern && !reorderMode && (
                    <div className="mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditModel(model.code);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors w-full justify-center"
                        title="Edit Model"
                        data-testid={`edit-model-${model.code}`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Model</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <p className="text-lg text-gray-600">No models found for this make.</p>
          </div>
        )}

      </div>
    </div>
  );
}