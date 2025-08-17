import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Package, Settings, Building, Ship } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  count?: number;
}

interface Make {
  id: string;
  name: string;
  category?: string;
  country?: string;
  count?: number;
}

interface Machine {
  id: string;
  name: string;
  make: string;
  category: string;
  model?: string;
  description?: string;
  specifications?: any;
}

export default function MachineTreePage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/export/categories'],
    queryFn: async () => {
      const response = await fetch('/api/export/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch makes
  const { data: makes = [], isLoading: makesLoading } = useQuery({
    queryKey: ['/api/export/makes'],
    queryFn: async () => {
      const response = await fetch('/api/export/makes');
      if (!response.ok) throw new Error('Failed to fetch makes');
      return response.json();
    }
  });

  // Fetch machines
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['/api/export/machines'],
    queryFn: async () => {
      const response = await fetch('/api/export/machines');
      if (!response.ok) throw new Error('Failed to fetch machines');
      return response.json();
    }
  });

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

  const toggleMake = (makeId: string) => {
    const newExpanded = new Set(expandedMakes);
    if (newExpanded.has(makeId)) {
      newExpanded.delete(makeId);
    } else {
      newExpanded.add(makeId);
    }
    setExpandedMakes(newExpanded);
    setSelectedMake(makeId);
  };

  const getFilteredMakes = (categoryName: string) => {
    return makes.filter((make: any) => 
      !selectedCategory || 
      make.category === categoryName || 
      categoryName.toLowerCase().includes(make.category?.toLowerCase()) ||
      make.category?.toLowerCase().includes(categoryName.toLowerCase())
    );
  };

  const getFilteredMachines = (makeName: string, categoryName?: string) => {
    return machines.filter((machine: any) => 
      machine.make === makeName && 
      (!categoryName || machine.category === categoryName)
    );
  };

  if (categoriesLoading || makesLoading || machinesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Machine Tree...</h2>
          <p className="text-gray-500">Organizing maritime equipment database</p>
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
              <h1 className="text-2xl font-bold text-white">Machine Tree</h1>
              <p className="text-orange-100">Maritime Equipment Classification System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{categories.length}</div>
              <div className="text-sm text-gray-600">System Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{makes.length}</div>
              <div className="text-sm text-gray-600">Equipment Makes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{machines.length}</div>
              <div className="text-sm text-gray-600">Total Machines</div>
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
                      <Package className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-800">{category.name}</div>
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
                  
                  {/* Makes under this category */}
                  {expandedCategories.has(category.id) && (
                    <div className="bg-gray-50 px-6 py-2">
                      {getFilteredMakes(category.name).map((make: any) => (
                        <div key={make.id} className="py-2 border-b border-gray-200 last:border-b-0">
                          <button
                            onClick={() => toggleMake(make.id)}
                            className="w-full text-left flex items-center justify-between hover:text-orange-600 transition-colors"
                            data-testid={`make-${make.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <Building className="h-3 w-3 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">{make.name}</span>
                              {make.country && (
                                <span className="text-xs text-gray-500">({make.country})</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {make.count && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                  {make.count}
                                </span>
                              )}
                              {expandedMakes.has(make.id) ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </button>
                          
                          {/* Machines under this make */}
                          {expandedMakes.has(make.id) && (
                            <div className="ml-6 mt-2 space-y-1">
                              {getFilteredMachines(make.name, category.name).map((machine: any) => (
                                <div
                                  key={machine.id}
                                  className="p-2 bg-white rounded border text-sm hover:shadow-sm transition-shadow"
                                  data-testid={`machine-${machine.id}`}
                                >
                                  <div className="font-medium text-gray-800">{machine.name}</div>
                                  {machine.model && (
                                    <div className="text-xs text-orange-600">Model: {machine.model}</div>
                                  )}
                                  {machine.description && (
                                    <div className="text-xs text-gray-500 mt-1">{machine.description}</div>
                                  )}
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
                      {categories.find((c: any) => c.id === selectedCategory)?.name}
                    </h4>
                    <p className="text-gray-600">
                      {categories.find((c: any) => c.id === selectedCategory)?.description || 
                       'Explore the equipment and manufacturers in this maritime system category.'}
                    </p>
                  </div>
                  
                  {selectedMake && (
                    <div className="border-t pt-6">
                      <h5 className="text-md font-semibold text-gray-800 mb-3">
                        {makes.find((m: any) => m.id === selectedMake)?.name} Equipment
                      </h5>
                      <div className="grid gap-4">
                        {getFilteredMachines(
                          makes.find((m: any) => m.id === selectedMake)?.name || '',
                          categories.find((c: any) => c.id === selectedCategory)?.name
                        ).map((machine: any) => (
                          <div
                            key={machine.id}
                            className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-medium text-gray-800">{machine.name}</h6>
                              {machine.model && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                                  {machine.model}
                                </span>
                              )}
                            </div>
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