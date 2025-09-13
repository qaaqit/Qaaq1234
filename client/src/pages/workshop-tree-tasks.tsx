import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Home, ChevronRight, Wrench, Clock, AlertCircle, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WorkshopTask {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  expertise: string;
  difficulty: 'low' | 'medium' | 'high';
  workshopsAvailable: number;
  portsAvailable: number;
}

export default function WorkshopTreeTasksPage() {
  const { systemCode, equipmentCode } = useParams<{ systemCode: string; equipmentCode: string }>();
  const [, setLocation] = useLocation();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Fetch tasks for equipment
  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: [`/api/workshop-tree/equipment/${systemCode}/${equipmentCode}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const navigateToPortsForTask = (taskId: string, expertise: string) => {
    setLocation(`/workshop-tree/task/${taskId}/ports?expertise=${expertise}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  if (error || !tasksData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load tasks</div>
      </div>
    );
  }

  const tasks = (tasksData as any)?.data || [];
  const equipmentTitle = (tasksData as any)?.equipmentTitle || 'Equipment ' + equipmentCode.toUpperCase();
  const systemTitle = (tasksData as any)?.systemTitle || 'System ' + systemCode.toUpperCase();

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
              <button
                onClick={() => setLocation(`/workshop-tree/system/${systemCode}`)}
                className="text-orange-600 hover:underline"
                data-testid={`link-system-${systemCode}`}
              >
                {systemTitle}
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800 font-medium">{equipmentTitle}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/workshop-tree/system/${systemCode}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Wrench className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{equipmentTitle}</h1>
              <p className="text-orange-100">Workshop service tasks available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {tasks.map((task: WorkshopTask) => (
            <Card
              key={task.id}
              className={`overflow-hidden hover:shadow-lg transition-all ${
                selectedTask === task.id ? 'ring-2 ring-orange-500' : ''
              }`}
              data-testid={`card-task-${task.id}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{task.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  </div>
                  <Badge className={getDifficultyColor(task.difficulty)}>
                    {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)} Difficulty
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Est. Time</p>
                      <p className="text-sm font-medium">{task.estimatedHours} hours</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Expertise</p>
                      <p className="text-sm font-medium">{task.expertise}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Ports</p>
                      <p className="text-sm font-medium">{task.portsAvailable} available</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Workshops</p>
                      <p className="text-sm font-medium">{task.workshopsAvailable} total</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    className="text-sm text-orange-600 font-medium hover:underline"
                    onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)}
                    data-testid={`button-select-${task.id}`}
                  >
                    {selectedTask === task.id ? 'Deselect' : 'Select'} Task
                  </button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    size="sm"
                    onClick={() => navigateToPortsForTask(task.id, task.expertise)}
                    data-testid={`button-find-workshops-${task.id}`}
                  >
                    Find Workshops →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        {tasks.length === 0 && (
          <Card className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tasks Available</h3>
            <p className="text-sm text-gray-600">
              No workshop service tasks have been defined for this equipment yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}