import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Home, ChevronRight, ChevronDown, Filter, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface SemmTasksPageProps {}

interface Task {
  id: string;
  task: string;
  systemCode: string;
  equipmentCode: string;
  description?: string;
}

interface ExpertiseArea {
  id: string;
  name: string;
  taskCount: number;
}

interface Port {
  id: string;
  name: string;
  country: string;
  workshopCount: number;
}

interface Workshop {
  id: string;
  name: string;
  port: string;
  country: string;
  expertise: string[];
  rating: number;
  isActive: boolean;
}

export default function SemmTasksPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  // URL pattern: /semm-tasks/systemCode/equipmentCode?/makeCode?/modelCode?
  const systemCode = params.systemCode || '';
  const equipmentCode = params.equipmentCode || '';
  const makeCode = params.makeCode || '';
  const modelCode = params.modelCode || '';

  // State for dropdown navigation
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('');
  const [selectedPort, setSelectedPort] = useState('');

  // Determine the SEMM level and build breadcrumb
  let semmLevel = 'system';
  let semmParams = systemCode;
  if (equipmentCode) {
    semmLevel = 'equipment';
    semmParams += `/${equipmentCode}`;
  }
  if (makeCode) {
    semmLevel = 'make';
    semmParams += `/${makeCode}`;
  }
  if (modelCode) {
    semmLevel = 'model';
    semmParams += `/${modelCode}`;
  }

  // Fetch tasks for the specific SEMM item
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/semm-tasks', semmParams],
    staleTime: 5 * 60 * 1000,
  });

  // Mock data for dropdowns (these would come from APIs)
  const mockExpertise: ExpertiseArea[] = [
    { id: 'mechanical', name: 'Mechanical Repair', taskCount: 15 },
    { id: 'electrical', name: 'Electrical Systems', taskCount: 8 },
    { id: 'hydraulic', name: 'Hydraulic Systems', taskCount: 6 },
    { id: 'automation', name: 'Automation & Control', taskCount: 4 },
    { id: 'welding', name: 'Welding & Fabrication', taskCount: 7 },
    { id: 'machining', name: 'Precision Machining', taskCount: 5 },
    { id: 'testing', name: 'Testing & Calibration', taskCount: 3 },
    { id: 'maintenance', name: 'Preventive Maintenance', taskCount: 12 },
    { id: 'overhaul', name: 'Complete Overhaul', taskCount: 9 },
    { id: 'diagnostics', name: 'Fault Diagnostics', taskCount: 6 },
    { id: 'installation', name: 'Installation Services', taskCount: 4 },
    { id: 'inspection', name: 'Technical Inspection', taskCount: 8 }
  ];

  const mockPorts: Port[] = [
    { id: 'singapore', name: 'Singapore', country: 'Singapore', workshopCount: 45 },
    { id: 'rotterdam', name: 'Rotterdam', country: 'Netherlands', workshopCount: 38 },
    { id: 'shanghai', name: 'Shanghai', country: 'China', workshopCount: 52 },
    { id: 'hamburg', name: 'Hamburg', country: 'Germany', workshopCount: 31 },
    { id: 'dubai', name: 'Dubai', country: 'UAE', workshopCount: 29 },
    { id: 'busan', name: 'Busan', country: 'South Korea', workshopCount: 24 },
    { id: 'antwerp', name: 'Antwerp', country: 'Belgium', workshopCount: 22 },
    { id: 'losangeles', name: 'Los Angeles', country: 'USA', workshopCount: 35 },
    { id: 'london', name: 'London', country: 'UK', workshopCount: 27 },
    { id: 'hong-kong', name: 'Hong Kong', country: 'China', workshopCount: 33 },
    { id: 'mumbai', name: 'Mumbai', country: 'India', workshopCount: 19 },
    { id: 'tokyo', name: 'Tokyo', country: 'Japan', workshopCount: 28 },
    { id: 'piraeus', name: 'Piraeus', country: 'Greece', workshopCount: 16 },
    { id: 'panama', name: 'Panama City', country: 'Panama', workshopCount: 14 },
    { id: 'istanbul', name: 'Istanbul', country: 'Turkey', workshopCount: 18 },
    { id: 'genoa', name: 'Genoa', country: 'Italy', workshopCount: 21 },
    { id: 'valencia', name: 'Valencia', country: 'Spain', workshopCount: 17 },
    { id: 'algeciras', name: 'Algeciras', country: 'Spain', workshopCount: 15 },
    { id: 'kaohsiung', name: 'Kaohsiung', country: 'Taiwan', workshopCount: 20 },
    { id: 'felixstowe', name: 'Felixstowe', country: 'UK', workshopCount: 13 }
  ];

  const tasks = tasksData?.data || [];
  const semmTitle = tasksData?.semmTitle || `${semmLevel.toUpperCase()} ${semmParams.toUpperCase()}`;

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-blue-600 animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  const getWorkshopCount = () => {
    if (selectedPort && selectedExpertise) {
      const port = mockPorts.find(p => p.id === selectedPort);
      return Math.floor((port?.workshopCount || 0) * 0.3); // Assuming 30% have specific expertise
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header with breadcrumb */}
      <div className="bg-white shadow-md border-b border-blue-200">
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
                onClick={() => setLocation(`/machinetree/${systemCode}`)}
                className="text-blue-600 hover:underline"
                data-testid="link-semm-system"
              >
                Task
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800 font-medium">Expertise</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Port</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Workshop</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/machinetree/${systemCode}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* SEMM Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Filter className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{semmTitle}</h1>
              <p className="text-blue-100">Workshop Task Discovery</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dropdown Navigation */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Task Selection */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Select Task</h3>
                <p className="text-sm text-gray-600">{tasks.length} available</p>
              </div>
            </div>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a task..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task: Task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.task}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Expertise Selection */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Select Expertise</h3>
                <p className="text-sm text-gray-600">12 specializations</p>
              </div>
            </div>
            <Select value={selectedExpertise} onValueChange={setSelectedExpertise} disabled={!selectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="Choose expertise..." />
              </SelectTrigger>
              <SelectContent>
                {mockExpertise.map((expertise) => (
                  <SelectItem key={expertise.id} value={expertise.id}>
                    {expertise.name} ({expertise.taskCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Port Selection */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Select Port</h3>
                <p className="text-sm text-gray-600">20 major ports</p>
              </div>
            </div>
            <Select value={selectedPort} onValueChange={setSelectedPort} disabled={!selectedExpertise}>
              <SelectTrigger>
                <SelectValue placeholder="Choose port..." />
              </SelectTrigger>
              <SelectContent>
                {mockPorts.map((port) => (
                  <SelectItem key={port.id} value={port.id}>
                    {port.name}, {port.country} ({port.workshopCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </div>

        {/* Results */}
        {selectedPort && selectedExpertise && selectedTask && (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {getWorkshopCount()} Workshops Found
              </h3>
              <p className="text-gray-600 mb-6">
                Available workshops with {mockExpertise.find(e => e.id === selectedExpertise)?.name} expertise in{' '}
                {mockPorts.find(p => p.id === selectedPort)?.name}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                  {tasks.find((t: Task) => t.id === selectedTask)?.task}
                </Badge>
                <Badge variant="outline" className="bg-green-50 border-green-200">
                  {mockExpertise.find(e => e.id === selectedExpertise)?.name}
                </Badge>
                <Badge variant="outline" className="bg-orange-50 border-orange-200">
                  {mockPorts.find(p => p.id === selectedPort)?.name}
                </Badge>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation(`/workshops?task=${selectedTask}&expertise=${selectedExpertise}&port=${selectedPort}`)}
              >
                View Available Workshops
              </Button>
            </div>
          </Card>
        )}

        {/* Available Tasks List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: Task) => (
            <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setSelectedTask(task.id)}>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">{task.task}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Badge variant="outline" className="text-xs">
                      {task.systemCode.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.equipmentCode.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}