import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ChevronRight, ChevronDown, Wrench, Home, Settings, Building, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WorkshopSystem {
  code: string;
  title: string;
  taskCount: number;
  equipment?: WorkshopEquipment[];
}

interface WorkshopEquipment {
  code: string;
  title: string;
  taskCount: number;
}

export default function WorkshopTreePage() {
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  // Fetch workshop tree systems
  const { data: systems, isLoading, error } = useQuery({
    queryKey: ['/api/workshop-tree'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const toggleSystem = (systemCode: string) => {
    const newExpanded = new Set(expandedSystems);
    if (newExpanded.has(systemCode)) {
      newExpanded.delete(systemCode);
    } else {
      newExpanded.add(systemCode);
    }
    setExpandedSystems(newExpanded);
  };

  const navigateToSystem = (systemCode: string) => {
    setLocation(`/workshop-tree/system/${systemCode}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading workshop systems...</div>
      </div>
    );
  }

  if (error || !systems) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load workshop systems</div>
      </div>
    );
  }

  const workshopSystems = (systems as any)?.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header with breadcrumb */}
      <div className="bg-white shadow-md border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/')}
                  data-testid="button-home"
                >
                  <Home className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <Wrench className="h-6 w-6 text-orange-600" />
                  <h1 className="text-2xl font-bold text-gray-800">Workshop Service Tree</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm ml-12">
                <span className="text-gray-800 font-medium">20 Ports</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">12 Expertise</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Workshop Ids</span>
              </div>
            </div>
            <Badge variant="outline" className="bg-orange-50 border-orange-300">
              {workshopSystems.length} Systems Available
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {workshopSystems.map((system: WorkshopSystem) => (
            <Card key={system.code} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-4 cursor-pointer hover:bg-orange-50 transition-colors flex-1 p-2 rounded"
                    onClick={() => navigateToSystem(system.code)}
                    data-testid={`button-navigate-system-${system.code}`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{system.code.toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{system.title}</h3>
                      <p className="text-sm text-gray-600">System Code: {system.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-orange-100 text-orange-800">
                      {system.taskCount} Tasks
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSystem(system.code);
                      }}
                      data-testid={`button-toggle-system-${system.code}`}
                    >
                      {expandedSystems.has(system.code) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Equipment */}
              {expandedSystems.has(system.code) && system.equipment && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 space-y-2">
                    {system.equipment.map((equipment: WorkshopEquipment) => (
                      <div
                        key={equipment.code}
                        className="bg-white p-4 rounded-lg hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setLocation(`/workshop-tree/equipment/${system.code}/${equipment.code}`)}
                        data-testid={`button-equipment-${equipment.code}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Settings className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="font-medium text-gray-800">{equipment.title}</p>
                              <p className="text-xs text-gray-500">Code: {equipment.code}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {equipment.taskCount} Tasks
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => navigateToSystem(system.code)}
                      data-testid={`button-view-system-${system.code}`}
                    >
                      View All Equipment →
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Workshop Service Network</h3>
              <p className="text-sm text-gray-600">
                Browse through ship systems and equipment to find specialized workshop services available in ports worldwide. 
                Each task shows required expertise and estimated hours for proper maintenance and repairs.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}