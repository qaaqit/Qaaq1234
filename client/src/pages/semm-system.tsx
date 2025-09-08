import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, ChevronDown, ChevronUp, GripVertical, Plus, Edit3, Ship, RotateCcw, Save, X, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { apiRequest, queryClient } from '@/lib/queryClient';
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
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const [reorderItems, setReorderItems] = useState<Array<{ code: string; title: string }>>([]);
  
  // Add equipment state
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [addEquipmentForm, setAddEquipmentForm] = useState({
    equipmentName: '',
    description: ''
  });
  
  // Edit system state
  const [showEditSystemModal, setShowEditSystemModal] = useState(false);
  const [editSystemForm, setEditSystemForm] = useState({
    systemCode: '',
    systemTitle: ''
  });

  // Edit equipment state
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [editEquipmentForm, setEditEquipmentForm] = useState({
    equipmentCode: '',
    equipmentTitle: ''
  });
  
  const { user } = useAuth();
  const isAdminOrIntern = user?.isAdmin || false;
  
  // Debug admin detection
  console.log('🔐 SEMM System - User object:', user);
  console.log('🔐 SEMM System - admin check:', { isAdmin: user?.isAdmin, canEdit: isAdminOrIntern });

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
    
    // Extract title without the code prefix (e.g., "a. Propulsion" -> "Propulsion")
    const currentTitle = foundSystem.title.replace(/^[a-z]\.\s*/, '');
    
    setEditSystemForm({
      systemCode: systemCode,
      systemTitle: currentTitle
    });
    setShowEditSystemModal(true);
  };

  const handleEditEquipment = (equipmentCode: string) => {
    console.log('Edit equipment:', equipmentCode);
    
    // Find the equipment in the current system
    const equipment = foundSystem.equipment?.find((eq: any) => eq.code === equipmentCode);
    if (!equipment) {
      console.error('Equipment not found:', equipmentCode);
      return;
    }
    
    // Extract title without the code prefix (e.g., "ha. Main Engine" -> "Main Engine")
    const currentTitle = equipment.title.replace(/^[a-z]+\.\s*/, '');
    
    setEditEquipmentForm({
      equipmentCode: equipmentCode,
      equipmentTitle: currentTitle
    });
    setShowEditEquipmentModal(true);
  };

  const handleDeleteEquipment = async (equipmentCode: string, equipmentName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${equipmentName}" (${equipmentCode})?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      console.log(`🗑️ Deleting equipment: ${equipmentCode}`);
      
      await apiRequest(`/api/dev/semm/delete-equipment/${equipmentCode}`, 'DELETE');
      
      console.log('✅ Successfully deleted equipment');
      
      // Refresh the data immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      await queryClient.refetchQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error deleting equipment:', error);
      alert('Failed to delete equipment. Please try again.');
    }
  };

  const handleAddNewEquipment = () => {
    setShowAddEquipmentForm(true);
    setAddEquipmentForm({ equipmentName: '', description: '' });
  };

  const handleAddEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addEquipmentForm.equipmentName.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/add-equipment', 'POST', {
        systemCode: foundSystem.code,
        equipmentName: addEquipmentForm.equipmentName.trim(),
        description: addEquipmentForm.description.trim()
      });
      
      console.log('✅ Successfully added new equipment');
      
      // Reset form and hide it
      setShowAddEquipmentForm(false);
      setAddEquipmentForm({ equipmentName: '', description: '' });
      
      // Refresh the data immediately and force refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      await queryClient.refetchQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error adding new equipment:', error);
    }
  };

  const handleCancelAddEquipment = () => {
    setShowAddEquipmentForm(false);
    setAddEquipmentForm({ equipmentName: '', description: '' });
  };

  const handleEditSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editSystemForm.systemTitle.trim()) return;
    
    try {
      await apiRequest('/api/dev/semm/update-system-title', 'POST', {
        code: editSystemForm.systemCode,
        title: editSystemForm.systemTitle.trim()
      });
      
      console.log('✅ Successfully updated system title');
      
      // Reset form and hide modal
      setShowEditSystemModal(false);
      setEditSystemForm({ systemCode: '', systemTitle: '' });
      
      // Refresh the data immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      await queryClient.refetchQueries({ queryKey: ['/api/dev/semm-cards'] });
      
    } catch (error) {
      console.error('❌ Error updating system title:', error);
      alert('Failed to update system title. Please try again.');
    }
  };

  const handleCancelEditSystem = () => {
    setShowEditSystemModal(false);
    setEditSystemForm({ systemCode: '', systemTitle: '' });
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

  const handleReorderEquipment = () => {
    console.log('🔄 Reorder button clicked');
    
    if (!foundSystem.equipment) {
      console.log('❌ No equipment found');
      return;
    }
    
    const equipment = foundSystem.equipment.map((eq: any) => ({
      code: eq.code,
      title: eq.title
    }));
    
    console.log('📦 Equipment items:', equipment);
    setReorderItems(equipment);
    setReorderEnabled(true);
    
    console.log('✅ Reorder mode enabled');
  };

  const handleSaveReorder = async () => {
    try {
      const orderedCodes = reorderItems.map(item => item.code);
      await apiRequest('/api/dev/semm/reorder-equipment', 'POST', { 
        systemCode: foundSystem.code,
        orderedCodes 
      });
      console.log('✅ Successfully reordered equipment');
      
      // Refresh the data to show updated codes
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
      setReorderEnabled(false);
    } catch (error) {
      console.error('❌ Error reordering equipment:', error);
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
                    <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 text-xs font-bold">{equipment.code}</span>
                    </div>
                    <span className="text-gray-800 font-medium">{equipment.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Controls Section - Always visible for admin/intern users */}
        <div className="mt-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Ship className="h-6 w-6 text-orange-600 mr-3" />
                Equipment in {foundSystem.title}
                {isAdminOrIntern && (
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
              
              {/* Admin Controls for Equipment - Right Edge */}
              {isAdminOrIntern && !reorderEnabled ? (
                <div className="flex items-center space-x-2">
                  {foundSystem.equipment && foundSystem.equipment.length > 0 && (
                    <button
                      onClick={handleReorderEquipment}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                      title="Reorder Equipment"
                      data-testid="reorder-equipment"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={handleAddNewEquipment}
                    disabled={showAddEquipmentForm}
                    className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add New Equipment"
                    data-testid="add-new-equipment-btn"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ) : isAdminOrIntern && reorderEnabled ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveReorder}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    data-testid="save-reorder"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Order</span>
                  </button>
                  <button
                    onClick={handleCancelReorder}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    data-testid="cancel-reorder"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

            {/* Add Equipment Form - Show when adding new equipment */}
            {showAddEquipmentForm && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-4">Add New Equipment to {foundSystem.title}</h3>
                <form onSubmit={handleAddEquipmentSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="equipmentName" className="block text-sm font-medium text-gray-700 mb-2">
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      id="equipmentName"
                      value={addEquipmentForm.equipmentName}
                      onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, equipmentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Gearbox, Governor, Fuel Injector"
                      required
                      data-testid="input-equipment-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="equipmentDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="equipmentDescription"
                      value={addEquipmentForm.description}
                      onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Brief description of this equipment..."
                      rows={3}
                      data-testid="input-equipment-description"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      data-testid="btn-save-equipment"
                    >
                      Add Equipment
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAddEquipment}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-equipment"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Edit System Modal */}
            {showEditSystemModal && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-4">Edit System Title</h3>
                <form onSubmit={handleEditSystemSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="systemCode" className="block text-sm font-medium text-gray-700 mb-2">
                      System Code
                    </label>
                    <input
                      type="text"
                      id="systemCode"
                      value={editSystemForm.systemCode}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      data-testid="input-system-code"
                    />
                  </div>
                  <div>
                    <label htmlFor="systemTitle" className="block text-sm font-medium text-gray-700 mb-2">
                      System Title *
                    </label>
                    <input
                      type="text"
                      id="systemTitle"
                      value={editSystemForm.systemTitle}
                      onChange={(e) => setEditSystemForm(prev => ({ ...prev, systemTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Propulsion, Power Generation, Boiler"
                      required
                      data-testid="input-system-title"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      data-testid="btn-save-system-title"
                    >
                      Update System Title
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditSystem}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-system-title"
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
                      placeholder="e.g., Main Engine"
                      required
                      data-testid="input-equipment-title-edit"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      data-testid="btn-save-equipment-edit"
                    >
                      Update Equipment
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditEquipment}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      data-testid="btn-cancel-equipment-edit"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Equipment listing conditional */}
            {foundSystem.equipment && foundSystem.equipment.length > 0 ? (
              <>
            {reorderEnabled ? (
              // Reorder Mode - Show ordered list with up/down controls
              <div className="space-y-3">
                {reorderItems.map((equipment, index) => (
                  <div 
                    key={equipment.code}
                    className="bg-white rounded-lg shadow-md border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">{equipment.code}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{equipment.title}</h3>
                        <p className="text-sm text-gray-500">Position {index + 1}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveItemUp(index)}
                        disabled={index === 0}
                        className={`p-2 rounded-lg transition-colors ${
                          index === 0 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                        data-testid={`move-up-${equipment.code}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveItemDown(index)}
                        disabled={index === reorderItems.length - 1}
                        className={`p-2 rounded-lg transition-colors ${
                          index === reorderItems.length - 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                        data-testid={`move-down-${equipment.code}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Normal Mode - Show equipment cards
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
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-orange-600 font-bold">{equipment.code}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                            {equipment.title}
                          </h3>
                          <p className="text-sm text-gray-500">Equipment Type</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {equipment.description || `${equipment.title} equipment classification`}
                      </p>
                      
                      {equipment.makes && equipment.makes.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">Makes Available</span>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              {equipment.makes.length} {equipment.makes.length === 1 ? 'Make' : 'Makes'}
                            </span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              {equipment.makes.reduce((sum: number, make: any) => sum + (make.models?.length || 0), 0)} Models
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin edit and delete buttons */}
                    {isAdminOrIntern && (
                      <div className="mt-4 pt-2 border-t border-gray-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEquipment(equipment.code);
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex-1 justify-center"
                            title="Edit Equipment"
                            data-testid={`edit-equipment-${equipment.code}`}
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEquipment(equipment.code, equipment.title);
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex-1 justify-center"
                            title="Delete Equipment"
                            data-testid={`delete-equipment-${equipment.code}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Equipment Button for Admins - Only show in normal mode */}
            {isAdminOrIntern && !reorderEnabled && (
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
              </>
            ) : (
          <div className="text-center py-12">
            <Ship className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Equipment Found</h3>
            <p className="text-gray-400 mb-6">This system doesn't have any equipment registered yet.</p>
            {!isAdminOrIntern && (
              <div className="text-sm text-gray-400">
                Contact your system administrator to add equipment to this category.
              </div>
            )}
          </div>
        )}
        
      </div>

      </div>
    </div>
  );
}