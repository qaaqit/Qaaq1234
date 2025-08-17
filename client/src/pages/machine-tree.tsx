import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Package, Settings, Building, Ship, Heart, Share2, RotateCcw } from 'lucide-react';

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

  // Fetch SEMM cards from parent app
  const { data: semmData, isLoading: semmLoading } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    queryFn: async () => {
      const response = await fetch('https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev/api/dev/semm-cards');
      if (!response.ok) throw new Error('Failed to fetch SEMM data');
      return response.json();
    }
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

  if (semmLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Machine Tree...</h2>
          <p className="text-gray-500">Loading SEMM data from parent app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Machine Tree (SEMM)</h1>
              <p className="text-orange-100">System-Equipment-Make-Model Classification | Data from Parent App</p>
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
              <div className="text-xs font-bold text-blue-600">PARENT APP</div>
              <div className="text-sm text-gray-600">Data Source</div>
            </div>
          </div>
          {semmData?.usage && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-center">
              <span className="text-xs text-blue-600">Connected to: {semmData.usage.endpoint} | Version: {semmData.version}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Categories Panel */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Ship className="h-5 w-5 text-red-600 mr-2" />
                Maritime Systems
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {categories.map((category: any) => (
                <div key={category.id} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full px-6 py-4 text-left hover:bg-orange-50 transition-colors flex items-center justify-between group"
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                        <span className="text-sm font-bold text-orange-600">{category.code}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{category.code}. {category.title}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500">{category.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {category.count && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {category.count}
                        </span>
                      )}
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Equipment under this category */}
                  {expandedCategories.has(category.id) && (
                    <div className="bg-gray-50 px-6 py-2">
                      <div className="flex items-center space-x-2 mb-3 p-2 bg-orange-50 rounded">
                        <RotateCcw className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">Reorder Equipment</span>
                      </div>
                      
                      {getFilteredEquipment(category.id).map((eq: any) => (
                        <div key={eq.id} className="py-2 border-b border-gray-200 last:border-b-0">
                          <button
                            onClick={() => toggleEquipment(eq.id)}
                            className="w-full text-left flex items-center justify-between hover:text-orange-600 transition-colors"
                            data-testid={`equipment-${eq.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center justify-center w-6 h-6 bg-white rounded border">
                                <span className="text-xs font-bold text-gray-600">{eq.code}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-700">{eq.code} {eq.title}</span>
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
                          </button>
                          
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
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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