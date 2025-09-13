import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Home, ChevronRight, MapPin, Building, Globe, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PortWithWorkshops {
  port: string;
  country: string;
  region: string;
  workshopCount: number;
  distance?: number;
  isLocal?: boolean;
  workshops: {
    id: string;
    name: string;
    expertise: string[];
  }[];
}

export default function WorkshopTreePortsPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const expertise = searchParams.get('expertise') || '';
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  // Fetch ports with workshops for the task
  const { data: portsData, isLoading, error } = useQuery({
    queryKey: [`/api/workshop-tree/task/${taskId}/ports`, expertise],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const navigateToWorkshops = (port: string) => {
    setLocation(`/workshop-tree/task/${taskId}/port/${port}?expertise=${expertise}`);
  };

  const getDistanceBadge = (port: PortWithWorkshops) => {
    if (port.isLocal) {
      return <Badge className="bg-green-100 text-green-800">Local Port</Badge>;
    }
    if (port.distance && port.distance < 500) {
      return <Badge className="bg-blue-100 text-blue-800">Nearby</Badge>;
    }
    return <Badge variant="outline">Remote</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Finding ports with workshops...</div>
      </div>
    );
  }

  if (error || !portsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load ports</div>
      </div>
    );
  }

  const ports = (portsData as any)?.data || [];
  const taskName = (portsData as any)?.taskName || 'Task';

  // Sort ports by local first, then by workshop count
  const sortedPorts = [...ports].sort((a: PortWithWorkshops, b: PortWithWorkshops) => {
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return b.workshopCount - a.workshopCount;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header with breadcrumb */}
      <div className="bg-white shadow-md border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-home"
              >
                <Home className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => setLocation('/workshop-tree')}
                className="text-orange-600 hover:underline"
                data-testid="link-workshop-tree"
              >
                Workshop Tree
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Task</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800 font-medium">Select Port</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Task Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">Ports with {expertise} Expertise</h1>
              <p className="text-orange-100">For: {taskName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ports Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPorts.map((port: PortWithWorkshops) => (
            <Card
              key={port.port}
              className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                selectedPort === port.port ? 'ring-2 ring-orange-500' : ''
              } ${port.isLocal ? 'border-green-500' : ''}`}
              onClick={() => navigateToWorkshops(port.port)}
              data-testid={`card-port-${port.port}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-7 w-7 text-white" />
                  </div>
                  {getDistanceBadge(port)}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-1">{port.port}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {port.country} • {port.region}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {port.workshopCount} {port.workshopCount === 1 ? 'Workshop' : 'Workshops'}
                    </span>
                  </div>
                  {port.distance && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Navigation className="h-4 w-4" />
                      <span>~{port.distance}km</span>
                    </div>
                  )}
                </div>

                {/* Workshop Preview */}
                {port.workshops && port.workshops.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Available workshops:</p>
                    <div className="space-y-1">
                      {port.workshops.slice(0, 2).map((workshop) => (
                        <div key={workshop.id} className="text-xs text-gray-700">
                          • {workshop.name}
                        </div>
                      ))}
                      {port.workshops.length > 2 && (
                        <p className="text-xs text-gray-500 italic">
                          +{port.workshops.length - 2} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                  size="sm"
                  data-testid={`button-view-workshops-${port.port}`}
                >
                  View Workshops →
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* No ports message */}
        {sortedPorts.length === 0 && (
          <Card className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Workshops Found</h3>
            <p className="text-sm text-gray-600">
              No workshops with {expertise} expertise are currently available for this task.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}