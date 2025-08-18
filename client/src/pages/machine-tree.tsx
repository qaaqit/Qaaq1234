import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ChevronRight, ChevronDown, Package, Settings, Building, Ship, Heart, Share2, RotateCcw, Edit3, Plus, GripVertical, ExternalLink } from 'lucide-react';
import { SemmReorderModal } from '@/components/semm-reorder-modal';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  count?: number;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  count?: number;
}

interface Machine {
  id: string;
  name: string;
  equipment: string;
  make: string;
  model?: string;
  description?: string;
  shareUrl?: string;
  specifications?: any;
}

export default function MachineTreePage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [showDropdowns, setShowDropdowns] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  
  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.isAdmin || user?.role === 'admin';

  // Reorder modal state
  const [reorderModal, setReorderModal] = useState<{
    isOpen: boolean;
    type: 'systems' | 'equipment';
    items: Array<{ code: string; title: string }>;
  }>({
    isOpen: false,
    type: 'systems',
    items: []
  });

  // Fetch SEMM cards from local endpoint
  const { data: semmData, isLoading: semmLoading, error: semmError } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Extract data from the parent app response
  // The API returns data as an array of systems with nested equipment/makes/models
  const systems = (semmData as any)?.data || [];
  const allEquipment = systems.flatMap((system: any) => system.equipment || []);
  const allMakes = allEquipment.flatMap((equipment: any) => equipment.makes || []);
  const allModels = allMakes.flatMap((make: any) => make.models || []);
  
  // For backwards compatibility, treat systems as categories
  const categories = systems;
  const equipment = allEquipment;
  const machines = allModels; // Models are the most specific level

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
    setSelectedCategory(categoryId);
  };

  const toggleEquipment = (equipmentId: string) => {
    const newExpanded = new Set(expandedEquipment);
    if (newExpanded.has(equipmentId)) {
      newExpanded.delete(equipmentId);
    } else {
      newExpanded.add(equipmentId);
    }
    setExpandedEquipment(newExpanded);
    setSelectedEquipment(equipmentId);
  };

  const getFilteredEquipment = (categoryId: string) => {
    const category = categories.find((cat: any) => cat.id === categoryId);
    return category?.equipment || [];
  };

  const getFilteredMachines = (equipmentId: string) => {
    const equipment = categories.flatMap((cat: any) => cat.equipment || []);
    const eq = equipment.find((e: any) => e.id === equipmentId);
    return eq?.machines || [];
  };

  const copyShareLink = async (machine: any) => {
    const shareUrl = `${window.location.origin}${machine.shareUrl}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      console.log('Share link copied:', shareUrl);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  // Admin edit functions
  const handleEditSystem = (systemId: string) => {
    console.log('Edit system:', systemId);
    // TODO: Implement edit system modal
  };

  // Admin functions - reorder systems and equipment

  const handleReorderSystems = () => {
    const systems = Array.isArray(semmData) ? semmData : (semmData as any)?.data || [];
    if (!systems.length) return;
    
    const systemItems = systems.map((system: any) => ({
      code: system.code,
      title: system.title
    }));
    
    setReorderModal({
      type: 'systems',
      isOpen: true,
      items: systemItems
    });
  };

  const handleAddNewSystem = () => {
    console.log('Add new system');
    // TODO: Implement add new system modal
  };

  const handleEditEquipment = (equipmentId: string) => {
    console.log('Edit equipment:', equipmentId);
    // TODO: Implement edit equipment modal
  };

  const handleReorderEquipment = (systemCode: string) => {
    const systems = Array.isArray(semmData) ? semmData : (semmData as any)?.data || [];
    if (!systems.length) return;
    
    const system = systems.find((s: any) => s.code === systemCode);
    if (!system?.equipment) return;
    
    const equipment = system.equipment.map((eq: any) => ({
      code: eq.code,
      title: eq.title
    }));
    
    setReorderModal({
      type: 'equipment',
      isOpen: true,
      items: equipment
    });
  };

  const handleReorderSubmit = async (orderedCodes: string[]) => {
    try {
      if (reorderModal.type === 'systems') {
        await apiRequest('/api/dev/semm/reorder-systems', 'POST', { orderedCodes });
      } else if (reorderModal.type === 'equipment') {
        const systems = Array.isArray(semmData) ? semmData : (semmData as any)?.data || [];
        const system = systems.find((s: any) => 
          s.equipment?.some((eq: any) => 
            reorderModal.items.some(item => item.code === eq.code)
          )
        );
        
        if (system) {
          await apiRequest('/api/dev/semm/reorder-equipment', 'POST', { 
            systemCode: system.code,
            orderedCodes 
          });
        }
      }
    } catch (error) {
      console.error('Reorder failed:', error);
    }
  };

  const closeReorderModal = () => {
    setReorderModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleAddNewEquipment = (systemId: string) => {
    console.log('Add new equipment to system:', systemId);
    // TODO: Implement add new equipment modal
  };

  // Navigation to individual equipment pages
  const navigateToEquipment = (equipmentCode: string) => {
    setLocation(`/machinetree/${equipmentCode}`);
  };

  // Toggle dropdown for system cards
  const toggleDropdown = (categoryCode: string) => {
    const newDropdowns = new Set(showDropdowns);
    if (newDropdowns.has(categoryCode)) {
      newDropdowns.delete(categoryCode);
    } else {
      newDropdowns.add(categoryCode);
    }
    setShowDropdowns(newDropdowns);
  };

  // Navigate to system page when clicking on card body (not chevron)
  const navigateToSystem = (categoryCode: string) => {
    setLocation(`/machinetree/system/${categoryCode}`);
  };

  if (semmLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Machine Tree...</h2>
          <p className="text-gray-500">Loading maritime equipment data...</p>
        </div>
      </div>
    );
  }

  if (semmError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">Failed to Load SEMM Data</h2>
          <p className="text-gray-500">Error: {semmError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Machine Tree (SEMM)</h1>
              <p className="text-orange-600 font-medium">System-Equipment-Make-Model Classification</p>
            </div>
          </div>
        </div>
      </div>
      {/* Stats Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{categories.length}</div>
              <div className="text-sm text-gray-600">Systems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{equipment.length}</div>
              <div className="text-sm text-gray-600">Equipment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{machines.length}</div>
              <div className="text-sm text-gray-600">Makes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{(semmData as any)?.totalMachines || machines.length}</div>
              <div className="text-sm text-gray-600">Models</div>
            </div>
          </div>

        </div>
      </div>
      {/* Main Content - Systems Cards Stacked */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header with Admin Controls */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
            <Ship className="h-6 w-6 text-red-600 mr-3" />
            Maritime Systems
            {isAdmin && (
              <button
                onClick={() => handleEditSystem('title')}
                className="ml-2 p-1 hover:bg-orange-100 rounded"
                title="Edit SEMM Title"
                data-testid="edit-semm-title"
              >
                <Edit3 className="h-4 w-4 text-orange-600" />
              </button>
            )}
          </h2>
          
          {/* Admin Controls for Systems */}
          {isAdmin && (
            <button
              onClick={handleReorderSystems}
              className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 mb-4 px-3 py-2 bg-orange-50 rounded-lg"
              data-testid="reorder-systems"
            >
              <GripVertical className="h-4 w-4" />
              <span>Reorder Systems</span>
            </button>
          )}
        </div>

        {/* Stacked Systems Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category: any) => (
            <div key={category.id} className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer flex-1"
                    onClick={() => navigateToSystem(category.code)}
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
                      <span className="text-sm font-bold text-orange-600">{category.code?.toUpperCase() || 'N/A'}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{category.title}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {category.count && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {category.count}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSystem(category.id);
                        }}
                        className="p-1 hover:bg-orange-100 rounded"
                        title="Edit System"
                        data-testid={`edit-system-${category.id}`}
                      >
                        <Edit3 className="h-3 w-3 text-orange-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Preview */}
              <div className="p-4">
                <div className="space-y-2">
                  {category.equipment?.slice(0, 3).map((equipment: any) => (
                    <button
                      key={equipment.code}
                      onClick={() => setLocation(`/machinetree/equipment/${equipment.code}`)}
                      className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded text-left"
                      data-testid={`card-equipment-${equipment.code}`}
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">{equipment.code}</span>
                      </div>
                      <span className="text-sm text-gray-700 truncate">{equipment.title}</span>
                    </button>
                  ))}
                  
                  {category.equipment?.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      +{category.equipment.length - 3} more equipment
                    </div>
                  )}
                </div>

                {/* View All Button */}
                <button
                  onClick={() => navigateToSystem(category.code)}
                  className="w-full mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  data-testid={`view-system-${category.code}`}
                >
                  View System Details →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New System Button for Admins */}
        {isAdmin && (
          <div className="mt-6">
            <button
              onClick={handleAddNewSystem}
              className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 px-4 py-3 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-400 transition-colors"
              data-testid="add-new-system"
            >
              <Plus className="h-4 w-4" />
              <span>Add New System</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Reorder Modal */}
      <SemmReorderModal
        isOpen={reorderModal.isOpen}
        onClose={closeReorderModal}
        title={reorderModal.type === 'systems' ? 'Systems' : 'Equipment'}
        items={reorderModal.items}
        onReorder={handleReorderSubmit}
      />
    </div>
  );
}