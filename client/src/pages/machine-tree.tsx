import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ChevronRight, ChevronDown, Package, Settings, Building, Ship, Heart, Share2, RotateCcw, Edit3, Plus, GripVertical, ExternalLink } from 'lucide-react';
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

  // Fetch SEMM cards from local endpoint
  const { data: semmData, isLoading: semmLoading, error: semmError } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Extract data from the parent app response
  const categories = semmData?.data || [];
  const equipment = categories.flatMap((cat: any) => cat.equipment || []);
  const machines = equipment.flatMap((eq: any) => eq.machines || []);

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

  const handleReorderSystems = () => {
    console.log('Reorder systems');
    // TODO: Implement reorder systems modal
  };

  const handleAddNewSystem = () => {
    console.log('Add new system');
    // TODO: Implement add new system modal
  };

  const handleEditEquipment = (equipmentId: string) => {
    console.log('Edit equipment:', equipmentId);
    // TODO: Implement edit equipment modal
  };

  const handleReorderEquipment = (systemId: string) => {
    console.log('Reorder equipment for system:', systemId);
    // TODO: Implement reorder equipment modal
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
              <div className="text-sm text-gray-600">Machines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{semmData?.totalMachines || 0}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>

        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Categories Panel */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Ship className="h-5 w-5 text-red-600 mr-2" />
                  Maritime Systems
                  {isAdmin && (
                    <button
                      onClick={handleEditSystem}
                      className="ml-2 p-1 hover:bg-orange-100 rounded"
                      title="Edit SEMM Title"
                      data-testid="edit-semm-title"
                    >
                      <Edit3 className="h-4 w-4 text-orange-600" />
                    </button>
                  )}
                </h3>
              </div>
            </div>
            
            {/* Admin Controls for Systems */}
            {isAdmin && (
              <div className="px-6 py-3 bg-gray-50 border-b">
                <button
                  onClick={handleReorderSystems}
                  className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 mb-2"
                  data-testid="reorder-systems"
                >
                  <GripVertical className="h-4 w-4" />
                  <span>Reorder Systems</span>
                </button>
              </div>
            )}
            <div className="max-h-[600px] overflow-y-auto">
              {categories.map((category: any) => (
                <div key={category.id} className="border-b border-gray-100 last:border-b-0 relative">
                  <div className="flex items-center px-6 py-4 hover:bg-orange-50 transition-colors group">
                    
                    {/* Clickable card body - goes to system page */}
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => navigateToSystem(category.code)}
                      data-testid={`category-${category.id}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                        <span className="text-sm font-bold text-orange-600">{category.code}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-800">{category.title}</div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSystem(category.id);
                              }}
                              className="p-1 hover:bg-orange-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit System"
                              data-testid={`edit-system-${category.id}`}
                            >
                              <Edit3 className="h-3 w-3 text-orange-600" />
                            </button>
                          )}
                        </div>
                        {category.description && (
                          <div className="text-sm text-gray-500">{category.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Chevron dropdown - shows equipment list */}
                    <div className="relative flex items-center space-x-2">
                      {category.count && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {category.count}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(category.code);
                        }}
                        className="p-2 hover:bg-orange-100 rounded-full transition-colors"
                        data-testid={`dropdown-${category.code}`}
                        title="Show equipment in this system"
                      >
                        {showDropdowns.has(category.code) ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>

                      {/* Equipment Dropdown */}
                      {showDropdowns.has(category.code) && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
                          {category.equipment?.map((equipment: any) => (
                            <button
                              key={equipment.code}
                              onClick={() => {
                                setLocation(`/machinetree/equipment/${equipment.code}`);
                                setShowDropdowns(new Set());
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
                  
                  {/* Equipment under this category */}
                  {expandedCategories.has(category.id) && (
                    <div className="bg-gray-50 px-6 py-2">
                      {/* Admin Controls for Equipment */}
                      {isAdmin && (
                        <div className="mb-3 p-2 bg-orange-50 rounded">
                          <button
                            onClick={() => handleReorderEquipment(category.id)}
                            className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 mb-2"
                            data-testid={`reorder-equipment-${category.id}`}
                          >
                            <GripVertical className="h-4 w-4" />
                            <span>Reorder Equipment</span>
                          </button>
                        </div>
                      )}
                      
                      {getFilteredEquipment(category.id).map((eq: any) => (
                        <div key={eq.id} className="py-2 border-b border-gray-200 last:border-b-0">
                          <div
                            className="w-full text-left flex items-center justify-between hover:text-orange-600 transition-colors cursor-pointer group"
                            onClick={() => toggleEquipment(eq.id)}
                            data-testid={`equipment-${eq.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center justify-center w-6 h-6 bg-white rounded border">
                                <span className="text-xs font-bold text-gray-600">{eq.code}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">{eq.title}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToEquipment(eq.code);
                                }}
                                className="p-1 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="View Equipment Page"
                                data-testid={`view-equipment-${eq.id}`}
                              >
                                <ExternalLink className="h-3 w-3 text-blue-600" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEquipment(eq.id);
                                  }}
                                  className="p-1 hover:bg-orange-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit Equipment"
                                  data-testid={`edit-equipment-${eq.id}`}
                                >
                                  <Edit3 className="h-3 w-3 text-orange-600" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {eq.count && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                  {eq.count}
                                </span>
                              )}
                              {expandedEquipment.has(eq.id) ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          {/* Machines under this equipment */}
                          {expandedEquipment.has(eq.id) && (
                            <div className="ml-8 mt-2 space-y-2">
                              {getFilteredMachines(eq.id).map((machine: any) => (
                                <div
                                  key={machine.id}
                                  className="p-3 bg-white rounded border hover:shadow-sm transition-shadow"
                                  data-testid={`machine-${machine.id}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800">{machine.name}</div>
                                      <div className="text-xs text-gray-500 mt-1">Make: {machine.make}</div>
                                      {machine.model && (
                                        <div className="text-xs text-orange-600">Model: {machine.model}</div>
                                      )}
                                      {machine.description && (
                                        <div className="text-xs text-gray-500 mt-1">{machine.description}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-3">
                                      <button
                                        onClick={() => copyShareLink(machine)}
                                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                                        title="Share machine"
                                      >
                                        <Share2 className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                                      </button>
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Add New Equipment Button */}
                      {isAdmin && (
                        <div className="mt-3 p-2">
                          <button
                            onClick={() => handleAddNewEquipment(category.id)}
                            className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 w-full justify-center py-2 border-2 border-dashed border-orange-300 rounded hover:border-orange-400 transition-colors"
                            data-testid={`add-equipment-${category.id}`}
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add New Equipment</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add New System Button */}
              {isAdmin && (
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleAddNewSystem}
                    className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 w-full justify-center py-3 border-2 border-dashed border-orange-300 rounded hover:border-orange-400 transition-colors"
                    data-testid="add-new-system"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New System</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-red-50">
              <h3 className="text-lg font-semibold text-gray-800">Equipment Details</h3>
            </div>
            <div className="p-6">
              {!selectedCategory ? (
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">Select a System Category</h4>
                  <p className="text-gray-500">Choose a maritime system category to explore equipment and manufacturers</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      {categories.find((c: any) => c.id === selectedCategory)?.title}
                    </h4>
                    <p className="text-gray-600">
                      {categories.find((c: any) => c.id === selectedCategory)?.description || 
                       'Explore the equipment and manufacturers in this maritime system category.'}
                    </p>
                  </div>
                  
                  {selectedEquipment && (
                    <div className="border-t pt-6">
                      <h5 className="text-md font-semibold text-gray-800 mb-3">
                        {equipment.find((eq: any) => eq.id === selectedEquipment)?.title} Machines (from Parent App)
                      </h5>
                      <div className="grid gap-4">
                        {getFilteredMachines(selectedEquipment).map((machine: any) => (
                          <div
                            key={machine.id}
                            className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-medium text-gray-800">{machine.name}</h6>
                              <div className="flex items-center space-x-2">
                                {machine.model && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                                    {machine.model}
                                  </span>
                                )}
                                <button
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Add to favorites"
                                >
                                  <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                </button>
                                <button
                                  onClick={() => copyShareLink(machine)}
                                  className="p-1 hover:bg-blue-50 rounded transition-colors"
                                  title="Share machine"
                                >
                                  <Share2 className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">Make: {machine.make}</div>
                            {machine.description && (
                              <p className="text-gray-600 text-sm mb-2">{machine.description}</p>
                            )}
                            {machine.specifications && (
                              <div className="text-xs text-gray-500">
                                <strong>Specifications:</strong> {JSON.stringify(machine.specifications)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}