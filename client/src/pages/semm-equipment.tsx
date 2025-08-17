import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Settings, Package, Share2, Building, ChevronRight, Home } from 'lucide-react';

interface SemmEquipmentProps {
  code: string;
}

export default function SemmEquipmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Fetch SEMM data to find the specific equipment
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Find the equipment by code
  const findEquipmentByCode = (code: string) => {
    if (!semmData?.data) return null;
    
    for (const system of semmData.data) {
      const equipment = system.equipment?.find((eq: any) => eq.code === code);
      if (equipment) {
        return {
          equipment,
          system: system,
          breadcrumb: `${system.title} > ${equipment.title}`
        };
      }
    }
    return null;
  };

  const equipmentData = code ? findEquipmentByCode(code) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Equipment...</h2>
        </div>
      </div>
    );
  }

  if (error || !equipmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700">Equipment Not Found</h2>
          <p className="text-gray-500">Equipment with code "{code}" was not found.</p>
          <button
            onClick={() => setLocation('/machine-tree')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Back to Machine Tree
          </button>
        </div>
      </div>
    );
  }

  const { equipment, system, breadcrumb } = equipmentData;

  const shareUrl = `${window.location.origin}/machinetree/${code}`;
  
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could add toast notification here
      console.log('Share link copied:', shareUrl);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => setLocation('/machine-tree')}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => setLocation(`/machinetree/system/${equipmentData.system.code}`)}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              {equipmentData.system.title}
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{equipment.title}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLocation('/machine-tree')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to Machine Tree"
            >
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>
            {/* Navy Blue Code Indicator */}
            <div className="flex items-center justify-center w-20 h-20 bg-blue-900 rounded-lg shadow-lg">
              <span className="text-2xl font-bold text-white">{equipment.code}</span>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">{equipment.title}</h1>
              <p className="text-blue-100 mt-1">{breadcrumb}</p>
              {equipment.description && (
                <p className="text-blue-100 mt-2">{equipment.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Details */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Equipment Info */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Package className="h-5 w-5 text-blue-600 mr-2" />
                  Equipment Details
                </h3>
                <button
                  onClick={copyShareLink}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  title="Share this equipment"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Equipment Code and Title */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-900 rounded-lg">
                  <span className="text-xl font-bold text-white">{equipment.code}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{equipment.title}</h2>
                  <p className="text-gray-600">Maritime Equipment Code: {equipment.code}</p>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">System Classification</h4>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-900 rounded-lg">
                    <span className="text-sm font-bold text-white">{system.code}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">{system.title}</div>
                    {system.description && (
                      <div className="text-sm text-gray-500">{system.description}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Description */}
              {equipment.description && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                  <p className="text-gray-600">{equipment.description}</p>
                </div>
              )}

              {/* Machines/Makes */}
              {equipment.machines && equipment.machines.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Available Makes & Models</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipment.machines.map((machine: any) => (
                      <div key={machine.id} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="font-medium text-gray-800">{machine.name}</div>
                        <div className="text-sm text-gray-600 mt-1">Make: {machine.make}</div>
                        {machine.model && (
                          <div className="text-sm text-orange-600">Model: {machine.model}</div>
                        )}
                        {machine.description && (
                          <div className="text-xs text-gray-500 mt-2">{machine.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h4 className="font-semibold text-gray-800">Quick Actions</h4>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={copyShareLink}
                  className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Equipment</span>
                </button>
                <button
                  onClick={() => setLocation('/machine-tree')}
                  className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Tree</span>
                </button>
              </div>
            </div>

            {/* Equipment Stats */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h4 className="font-semibold text-gray-800">Equipment Info</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-medium">{equipment.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">System:</span>
                  <span className="font-medium">{system.code}</span>
                </div>
                {equipment.count && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{equipment.count}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Share URL:</span>
                  <span className="text-xs text-blue-600 break-all">/machinetree/{code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}