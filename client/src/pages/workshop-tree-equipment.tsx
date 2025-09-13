import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Home, ChevronRight, Settings, Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Bottom edge roll out flip card animation
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 600 + (index * 150));
    
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-12 h-16' : 'w-8 h-12';
  const textSize = large ? 'text-3xl' : 'text-xl';

  return (
    <div className={`relative ${cardSize} rounded-lg overflow-hidden border-2 border-white shadow-lg`} 
         style={{ 
           perspective: '1000px',
           boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0, 0, 0, 0.2)'
         }}>
      {/* Loading state card */}
      <div
        className="absolute inset-0 bg-orange-600 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 -1px 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(145deg, #f97316, #ea580c)'
        }}
      >
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Character reveal card */}
      <div
        className="absolute inset-0 bg-orange-600 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(180deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(145deg, #f97316, #ea580c)'
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

interface WorkshopEquipment {
  code: string;
  title: string;
  taskCount: number;
  totalHours: number;
  tasks?: WorkshopTask[];
}

interface WorkshopTask {
  id: string;
  name: string;
  estimatedHours: number;
  expertise: string;
  difficulty: 'low' | 'medium' | 'high';
}

export default function WorkshopTreeEquipmentPage() {
  const { systemCode } = useParams<{ systemCode: string }>();
  const [, setLocation] = useLocation();
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());

  // Fetch equipment for system
  const { data: equipmentData, isLoading, error } = useQuery({
    queryKey: [`/api/workshop-tree/system/${systemCode}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const toggleEquipment = (equipmentCode: string) => {
    const newExpanded = new Set(expandedEquipment);
    if (newExpanded.has(equipmentCode)) {
      newExpanded.delete(equipmentCode);
    } else {
      newExpanded.add(equipmentCode);
    }
    setExpandedEquipment(newExpanded);
  };

  const navigateToTasks = (equipmentCode: string) => {
    setLocation(`/workshop-tree/equipment/${systemCode}/${equipmentCode}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading equipment...</div>
      </div>
    );
  }

  if (error || !equipmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load equipment</div>
      </div>
    );
  }

  const equipment = (equipmentData as any)?.data || [];
  const systemTitle = (equipmentData as any)?.systemTitle || 'System ' + systemCode.toUpperCase();

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
              <span className="text-gray-800 font-medium">{systemTitle}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/workshop-tree')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* System Header with FlipCard animation */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
              {systemCode.split('').map((char, index) => (
                <FlipCard key={index} char={char.toUpperCase()} index={index} large />
              ))}
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{systemTitle}</h1>
              <p className="text-orange-100">Select equipment to view workshop tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equipment.map((eq: WorkshopEquipment) => (
            <Card
              key={eq.code}
              className="overflow-hidden hover:shadow-xl transition-all cursor-pointer"
              onClick={() => navigateToTasks(eq.code)}
              data-testid={`card-equipment-${eq.code}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Settings className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {eq.taskCount} Tasks
                  </Badge>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{eq.title}</h3>
                <p className="text-sm text-gray-600 mb-4">Equipment Code: {eq.code}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>~{eq.totalHours}h total</span>
                  </div>
                  <button
                    className="text-orange-600 font-medium hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEquipment(eq.code);
                    }}
                    data-testid={`button-toggle-${eq.code}`}
                  >
                    View Tasks →
                  </button>
                </div>

                {/* Expanded Tasks Preview */}
                {expandedEquipment.has(eq.code) && eq.tasks && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    {eq.tasks.slice(0, 3).map((task: WorkshopTask) => (
                      <div key={task.id} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">{task.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.estimatedHours}h
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {eq.tasks.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{eq.tasks.length - 3} more tasks...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}