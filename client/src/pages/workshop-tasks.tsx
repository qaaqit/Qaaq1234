import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Wrench, 
  Clock, 
  Tag,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { MARITIME_EXPERTISE_CATEGORIES, MaritimeExpertiseCategory } from '@shared/maritime-expertise';

// Task form validation schema
const taskFormSchema = z.object({
  taskName: z.string().min(3, 'Task name must be at least 3 characters'),
  taskDescription: z.string().min(10, 'Description must be at least 10 characters'),
  systemCode: z.string().min(1, 'System is required'),
  equipmentCode: z.string().min(1, 'Equipment is required'),
  requiredExpertise: z.array(z.string()).min(1, 'At least one expertise category is required'),
  estimatedHours: z.number().min(0.1, 'Estimated hours must be at least 0.1').max(40, 'Estimated hours cannot exceed 40'),
  difficultyLevel: z.enum(['easy', 'medium', 'hard', 'expert']),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface WorkshopServiceTask {
  id: string;
  taskCode: string;
  systemCode: string;
  equipmentCode: string;
  taskSequence: number;
  taskName: string;
  taskDescription: string;
  requiredExpertise: string[];
  estimatedHours: number;
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert';
  tags: string[];
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface SEMMSystem {
  code: string;
  title: string;
  description?: string;
}

interface SEMMEquipment {
  code: string;
  systemCode: string;
  title: string;
  description?: string;
}

export default function WorkshopTasksPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSystemCode, setSelectedSystemCode] = useState<string>('');
  const [selectedEquipmentCode, setSelectedEquipmentCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkshopServiceTask | null>(null);

  // Form setup
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      taskName: '',
      taskDescription: '',
      systemCode: '',
      equipmentCode: '',
      requiredExpertise: [],
      estimatedHours: 1,
      difficultyLevel: 'medium',
      tags: [],
    }
  });

  // Fetch SEMM systems
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ['/api/semm-systems'],
    enabled: !!user?.id
  });

  // Fetch SEMM equipment
  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ['/api/semm-equipment'],
    enabled: !!user?.id
  });

  // Fetch workshop service tasks
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['/api/workshop-service-tasks', user?.id],
    enabled: !!user?.id
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      const response = await apiRequest('/api/workshop-service-tasks', 'POST', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-service-tasks'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Task created",
        description: "Workshop service task has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating task",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: TaskFormData }) => {
      const response = await apiRequest(`/api/workshop-service-tasks/${taskId}`, 'PUT', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-service-tasks'] });
      setEditingTask(null);
      form.reset();
      toast({
        title: "Task updated",
        description: "Workshop service task has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating task",
        description: error.message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/workshop-service-tasks/${taskId}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-service-tasks'] });
      toast({
        title: "Task deleted",
        description: "Workshop service task has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting task",
        description: error.message || "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleBack = () => {
    setLocation('/workshop-owner/dashboard');
  };

  const handleCreateTask = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  const handleUpdateTask = (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, taskData: data });
    }
  };

  const handleEditTask = (task: WorkshopServiceTask) => {
    setEditingTask(task);
    form.reset({
      taskName: task.taskName,
      taskDescription: task.taskDescription,
      systemCode: task.systemCode,
      equipmentCode: task.equipmentCode,
      requiredExpertise: task.requiredExpertise,
      estimatedHours: task.estimatedHours,
      difficultyLevel: task.difficultyLevel,
      tags: task.tags || [],
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'hard': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpertiseCategory = (categoryId: string): MaritimeExpertiseCategory | undefined => {
    return MARITIME_EXPERTISE_CATEGORIES.find(cat => cat.id === categoryId);
  };

  // Filter tasks based on search and filters
  const filteredTasks = (tasks?.tasks || []).filter((task: WorkshopServiceTask) => {
    const matchesSearch = !searchQuery || 
      task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSystem = !selectedSystemCode || task.systemCode === selectedSystemCode;
    const matchesEquipment = !selectedEquipmentCode || task.equipmentCode === selectedEquipmentCode;
    const matchesDifficulty = selectedDifficulty === 'all' || task.difficultyLevel === selectedDifficulty;
    
    return matchesSearch && matchesSystem && matchesEquipment && matchesDifficulty;
  });

  // Group tasks by system and equipment
  const groupedTasks = filteredTasks.reduce((acc: any, task: WorkshopServiceTask) => {
    const systemKey = task.systemCode;
    const equipmentKey = task.equipmentCode;
    
    if (!acc[systemKey]) {
      acc[systemKey] = {};
    }
    if (!acc[systemKey][equipmentKey]) {
      acc[systemKey][equipmentKey] = [];
    }
    acc[systemKey][equipmentKey].push(task);
    return acc;
  }, {});

  const getSystemTitle = (systemCode: string): string => {
    const system = systems?.systems?.find((s: SEMMSystem) => s.code === systemCode);
    return system?.title || `System ${systemCode.toUpperCase()}`;
  };

  const getEquipmentTitle = (equipmentCode: string): string => {
    const equip = equipment?.equipment?.find((e: SEMMEquipment) => e.code === equipmentCode);
    return equip?.title || `Equipment ${equipmentCode.toUpperCase()}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Please log in to access workshop task management.</p>
          <Button onClick={() => setLocation('/login')} className="bg-orange-600 hover:bg-orange-700">
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center space-x-2"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                <p className="text-gray-600">Manage your workshop service tasks organized by SEMM equipment codes</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
                  data-testid="button-create-task"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? 'Edit Workshop Service Task' : 'Create New Workshop Service Task'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(editingTask ? handleUpdateTask : handleCreateTask)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taskName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Main Engine Oil Change"
                                data-testid="input-task-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="40"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-estimated-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="taskDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Detailed description of the service task..."
                              rows={4}
                              data-testid="textarea-task-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="systemCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              data-testid="select-system"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select system" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {systems?.systems?.map((system: SEMMSystem) => (
                                  <SelectItem key={system.code} value={system.code}>
                                    {system.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="equipmentCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipment *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              data-testid="select-equipment"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select equipment" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {equipment?.equipment
                                  ?.filter((eq: SEMMEquipment) => 
                                    !form.watch('systemCode') || eq.systemCode === form.watch('systemCode')
                                  )
                                  ?.map((equip: SEMMEquipment) => (
                                    <SelectItem key={equip.code} value={equip.code}>
                                      {equip.title}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="difficultyLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty Level *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              data-testid="select-difficulty"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requiredExpertise"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Required Expertise *</FormLabel>
                            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                              {MARITIME_EXPERTISE_CATEGORIES.map((category) => (
                                <div key={category.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`expertise-${category.id}`}
                                    checked={field.value.includes(category.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, category.id]);
                                      } else {
                                        field.onChange(field.value.filter(id => id !== category.id));
                                      }
                                    }}
                                    data-testid={`checkbox-expertise-${category.id}`}
                                  />
                                  <label htmlFor={`expertise-${category.id}`} className="text-sm">
                                    {category.icon} {category.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingTask(null);
                          form.reset();
                        }}
                        data-testid="button-cancel-task"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                        data-testid="button-save-task"
                      >
                        {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                          'Saving...'
                        ) : editingTask ? (
                          'Update Task'
                        ) : (
                          'Create Task'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workshop Service Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateTask)}
              className="space-y-6"
            >
              {/* Same form content as create dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taskName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Main Engine Oil Change"
                          data-testid="input-edit-task-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="40"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-edit-estimated-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateTaskMutation.isPending}
                  data-testid="button-update-task"
                >
                  {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-orange-600" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search-tasks">Search Tasks</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search-tasks"
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-tasks"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="filter-system">System</Label>
                <Select value={selectedSystemCode} onValueChange={setSelectedSystemCode}>
                  <SelectTrigger data-testid="select-filter-system">
                    <SelectValue placeholder="All systems" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All systems</SelectItem>
                    {systems?.systems?.map((system: SEMMSystem) => (
                      <SelectItem key={system.code} value={system.code}>
                        {system.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-equipment">Equipment</Label>
                <Select value={selectedEquipmentCode} onValueChange={setSelectedEquipmentCode}>
                  <SelectTrigger data-testid="select-filter-equipment">
                    <SelectValue placeholder="All equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All equipment</SelectItem>
                    {equipment?.equipment
                      ?.filter((eq: SEMMEquipment) => 
                        !selectedSystemCode || eq.systemCode === selectedSystemCode
                      )
                      ?.map((equip: SEMMEquipment) => (
                        <SelectItem key={equip.code} value={equip.code}>
                          {equip.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-difficulty">Difficulty</Label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger data-testid="select-filter-difficulty">
                    <SelectValue placeholder="All difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {tasksLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading workshop service tasks...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {searchQuery || selectedSystemCode || selectedEquipmentCode || selectedDifficulty !== 'all' ? 
                    'No tasks match your current filters. Try adjusting your search criteria.' :
                    'You haven\'t created any service tasks yet. Create your first task to get started.'
                  }
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-first-task"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([systemCode, equipmentGroups]) => (
              <Card key={systemCode}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    <span>{getSystemTitle(systemCode)}</span>
                    <Badge variant="outline">
                      {Object.values(equipmentGroups).reduce((total: number, tasks: any) => total + tasks.length, 0)} tasks
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(equipmentGroups).map(([equipmentCode, equipmentTasks]) => (
                    <div key={equipmentCode} className="mb-6 last:mb-0">
                      <div className="flex items-center space-x-2 mb-4 pb-2 border-b">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">{getEquipmentTitle(equipmentCode)}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {(equipmentTasks as WorkshopServiceTask[]).length} tasks
                        </Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {(equipmentTasks as WorkshopServiceTask[]).map((task) => (
                          <div
                            key={task.id}
                            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            data-testid={`task-card-${task.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h5 className="font-medium text-gray-900">{task.taskName}</h5>
                                  <Badge className={getDifficultyColor(task.difficultyLevel)}>
                                    {task.difficultyLevel}
                                  </Badge>
                                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{task.estimatedHours}h</span>
                                  </div>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3">{task.taskDescription}</p>
                                
                                <div className="flex flex-wrap gap-2">
                                  {task.requiredExpertise.map((expertiseId) => {
                                    const expertise = getExpertiseCategory(expertiseId);
                                    return expertise ? (
                                      <Badge
                                        key={expertiseId}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {expertise.icon} {expertise.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                                
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Tag className="w-3 h-3 text-gray-400" />
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditTask(task)}
                                  data-testid={`button-edit-task-${task.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  data-testid={`button-delete-task-${task.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Statistics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Task Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900" data-testid="summary-total-tasks">
                  {filteredTasks.length}
                </div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="summary-avg-hours">
                  {filteredTasks.length > 0 
                    ? (filteredTasks.reduce((sum, task) => sum + task.estimatedHours, 0) / filteredTasks.length).toFixed(1)
                    : '0'
                  }h
                </div>
                <div className="text-sm text-gray-600">Avg. Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="summary-systems">
                  {Object.keys(groupedTasks).length}
                </div>
                <div className="text-sm text-gray-600">Systems Covered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600" data-testid="summary-expertise">
                  {[...new Set(filteredTasks.flatMap(task => task.requiredExpertise))].length}
                </div>
                <div className="text-sm text-gray-600">Expertise Types</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}