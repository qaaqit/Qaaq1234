import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  ArrowLeft, 
  DollarSign, 
  Edit, 
  Save,
  TrendingUp,
  Clock,
  Calculator,
  AlertCircle,
  CheckCircle2,
  History,
  Plus,
  Minus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { MARITIME_EXPERTISE_CATEGORIES, MaritimeExpertiseCategory } from '@shared/maritime-expertise';

// API Response Types
interface PricingApiResponse {
  success: boolean;
  pricing: WorkshopPricing[];
  message?: string;
}

interface PricingCreateResponse {
  success: boolean;
  pricing: WorkshopPricing;
  message?: string;
}

// Pricing form validation schema
const pricingFormSchema = z.object({
  expertiseCategoryId: z.string().min(1, 'Expertise category is required'),
  hourlyRate: z.number().min(10, 'Hourly rate must be at least $10').max(1000, 'Hourly rate cannot exceed $1000'),
  eightHourShiftRate: z.number().min(50, 'Shift rate must be at least $50').max(8000, 'Shift rate cannot exceed $8000'),
  overtimeMultiplier: z.number().min(1.0, 'Overtime multiplier must be at least 1.0').max(3.0, 'Overtime multiplier cannot exceed 3.0'),
  minimumHours: z.number().min(1, 'Minimum hours must be at least 1').max(24, 'Minimum hours cannot exceed 24'),
  notes: z.string().optional(),
});

type PricingFormData = z.infer<typeof pricingFormSchema>;

interface WorkshopPricing {
  id: string;
  expertiseCategoryId: string;
  hourlyRate: number;
  eightHourShiftRate: number;
  overtimeMultiplier: number;
  minimumHours: number;
  notes?: string;
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
}

interface PriceCalculation {
  hours: number;
  regularHours: number;
  overtimeHours: number;
  regularCost: number;
  overtimeCost: number;
  totalCost: number;
  breakdown: string[];
}

export default function WorkshopPricingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingPricing, setEditingPricing] = useState<WorkshopPricing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [calculatorHours, setCalculatorHours] = useState<number>(8);
  const [selectedCategoryForCalc, setSelectedCategoryForCalc] = useState<string>('');

  // Form setup
  const form = useForm<PricingFormData>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      expertiseCategoryId: '',
      hourlyRate: 50,
      eightHourShiftRate: 400,
      overtimeMultiplier: 1.5,
      minimumHours: 4,
      notes: '',
    }
  });

  // Watch hourly rate to auto-calculate shift rate
  const watchedHourlyRate = form.watch('hourlyRate');
  const watchedOvertimeMultiplier = form.watch('overtimeMultiplier');

  // Auto-calculate 8-hour shift rate when hourly rate changes
  useState(() => {
    if (watchedHourlyRate && watchedHourlyRate > 0) {
      const calculated = watchedHourlyRate * 8;
      if (form.getValues('eightHourShiftRate') !== calculated) {
        form.setValue('eightHourShiftRate', calculated);
      }
    }
  });

  // Fetch workshop pricing
  const { data: pricingData, isLoading: pricingLoading, refetch: refetchPricing } = useQuery<PricingApiResponse>({
    queryKey: ['/api/workshop-pricing', user?.id],
    enabled: !!user?.id
  });

  // Create pricing mutation
  const createPricingMutation = useMutation({
    mutationFn: async (pricingData: PricingFormData) => {
      const response = await apiRequest('/api/workshop-pricing', 'POST', pricingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-pricing'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Pricing created",
        description: "Workshop pricing has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating pricing",
        description: error.message || "Failed to create pricing. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async ({ pricingId, pricingData }: { pricingId: string; pricingData: PricingFormData }) => {
      const response = await apiRequest(`/api/workshop-pricing/${pricingId}`, 'PUT', pricingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-pricing'] });
      setEditingPricing(null);
      form.reset();
      toast({
        title: "Pricing updated",
        description: "Workshop pricing has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating pricing",
        description: error.message || "Failed to update pricing. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleBack = () => {
    setLocation('/workshop-owner/dashboard');
  };

  const handleCreatePricing = (data: PricingFormData) => {
    createPricingMutation.mutate(data);
  };

  const handleUpdatePricing = (data: PricingFormData) => {
    if (editingPricing) {
      updatePricingMutation.mutate({ pricingId: editingPricing.id, pricingData: data });
    }
  };

  const handleEditPricing = (pricing: WorkshopPricing) => {
    setEditingPricing(pricing);
    form.reset({
      expertiseCategoryId: pricing.expertiseCategoryId,
      hourlyRate: pricing.hourlyRate,
      eightHourShiftRate: pricing.eightHourShiftRate,
      overtimeMultiplier: pricing.overtimeMultiplier,
      minimumHours: pricing.minimumHours,
      notes: pricing.notes || '',
    });
  };

  const getExpertiseCategory = (categoryId: string): MaritimeExpertiseCategory | undefined => {
    return MARITIME_EXPERTISE_CATEGORIES.find(cat => cat.id === categoryId);
  };

  const calculatePrice = (pricing: WorkshopPricing, hours: number): PriceCalculation => {
    const regularHours = Math.min(hours, 8);
    const overtimeHours = Math.max(0, hours - 8);
    
    const regularCost = regularHours * pricing.hourlyRate;
    const overtimeCost = overtimeHours * pricing.hourlyRate * pricing.overtimeMultiplier;
    const totalCost = regularCost + overtimeCost;

    const breakdown: string[] = [];
    if (regularHours > 0) {
      breakdown.push(`${regularHours}h × $${pricing.hourlyRate} = $${regularCost.toFixed(2)}`);
    }
    if (overtimeHours > 0) {
      breakdown.push(`${overtimeHours}h × $${pricing.hourlyRate} × ${pricing.overtimeMultiplier} = $${overtimeCost.toFixed(2)}`);
    }

    return {
      hours,
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalCost,
      breakdown
    };
  };

  const existingPricingCategories = pricingData?.pricing?.map((p) => p.expertiseCategoryId) || [];
  const availableCategories = MARITIME_EXPERTISE_CATEGORIES.filter(
    cat => !existingPricingCategories.includes(cat.id)
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Please log in to access workshop pricing management.</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
                <p className="text-gray-600">Set and update your 8-hour shift rates for different expertise categories</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
                  disabled={availableCategories.length === 0}
                  data-testid="button-create-pricing"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Pricing</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Pricing Category</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreatePricing)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="expertiseCategoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expertise Category *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            data-testid="select-expertise-category"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select expertise category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.icon} {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate ($) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="10"
                                max="1000"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-hourly-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eightHourShiftRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>8-Hour Shift Rate ($) *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="50"
                                max="8000"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-shift-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="overtimeMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overtime Multiplier *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.1"
                                min="1.0"
                                max="3.0"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-overtime-multiplier"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minimumHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Hours *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="1"
                                max="24"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-minimum-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Optional notes about this pricing category..."
                              rows={3}
                              data-testid="textarea-pricing-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          form.reset();
                        }}
                        data-testid="button-cancel-pricing"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={createPricingMutation.isPending}
                        data-testid="button-save-pricing"
                      >
                        {createPricingMutation.isPending ? 'Saving...' : 'Save Pricing'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Edit Pricing Dialog */}
      <Dialog open={!!editingPricing} onOpenChange={(open) => !open && setEditingPricing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pricing Category</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdatePricing)}
              className="space-y-6"
            >
              {/* Same form fields as create dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="10"
                          max="1000"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-edit-hourly-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eightHourShiftRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>8-Hour Shift Rate ($) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="50"
                          max="8000"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-edit-shift-rate"
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
                  onClick={() => setEditingPricing(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updatePricingMutation.isPending}
                  data-testid="button-update-pricing"
                >
                  {updatePricingMutation.isPending ? 'Updating...' : 'Update Pricing'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="pricing" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing" data-testid="tab-pricing">Current Pricing</TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator">Price Calculator</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-6">
            {pricingLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading pricing information...</p>
                  </div>
                </CardContent>
              </Card>
            ) : pricingData?.pricing?.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No pricing set up yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      Set up your pricing for different expertise categories to start receiving booking requests.
                    </p>
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-create-first-pricing"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Pricing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {pricingData?.pricing?.map((pricing) => {
                  const category = getExpertiseCategory(pricing.expertiseCategoryId);
                  const calculation8h = calculatePrice(pricing, 8);
                  const calculation12h = calculatePrice(pricing, 12);
                  
                  return (
                    <Card key={pricing.id} className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl">
                              {category?.icon || '🔧'}
                            </div>
                            <div>
                              <CardTitle className="text-lg text-gray-900">
                                {category?.name || 'Unknown Category'}
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                Last updated {new Date(pricing.lastUpdated).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-600 text-white" data-testid={`status-${pricing.id}`}>
                              Active
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPricing(pricing)}
                              data-testid={`button-edit-pricing-${pricing.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Basic Rates */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Basic Rates</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Hourly Rate:</span>
                                <span className="font-medium" data-testid={`hourly-rate-${pricing.id}`}>
                                  ${pricing.hourlyRate}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">8-Hour Shift:</span>
                                <span className="font-medium text-green-600" data-testid={`shift-rate-${pricing.id}`}>
                                  ${pricing.eightHourShiftRate}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Overtime (×{pricing.overtimeMultiplier}):</span>
                                <span className="font-medium" data-testid={`overtime-rate-${pricing.id}`}>
                                  ${(pricing.hourlyRate * pricing.overtimeMultiplier).toFixed(0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Minimum Hours:</span>
                                <span className="font-medium">{pricing.minimumHours}h</span>
                              </div>
                            </div>
                          </div>

                          {/* Sample Calculations */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Sample Calculations</h4>
                            <div className="space-y-3">
                              <div className="p-3 bg-white rounded-lg border">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-600">8-Hour Job:</span>
                                  <span className="font-medium text-green-600" data-testid={`calc-8h-${pricing.id}`}>
                                    ${calculation8h.totalCost.toFixed(0)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">{calculation8h.breakdown.join(', ')}</div>
                              </div>
                              
                              <div className="p-3 bg-white rounded-lg border">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-600">12-Hour Job:</span>
                                  <span className="font-medium text-orange-600" data-testid={`calc-12h-${pricing.id}`}>
                                    ${calculation12h.totalCost.toFixed(0)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">{calculation12h.breakdown.join(', ')}</div>
                              </div>
                            </div>
                          </div>

                          {/* Notes & Actions */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Details</h4>
                            <div className="space-y-3">
                              {pricing.notes && (
                                <div className="p-3 bg-white rounded-lg border">
                                  <div className="text-sm text-gray-600">Notes:</div>
                                  <div className="text-sm text-gray-900 mt-1">{pricing.notes}</div>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>Created {new Date(pricing.createdAt).toLocaleDateString()}</span>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                Description: {category?.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  <span>Price Calculator</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="calc-category">Select Expertise Category</Label>
                      <Select value={selectedCategoryForCalc} onValueChange={setSelectedCategoryForCalc}>
                        <SelectTrigger data-testid="select-calc-category">
                          <SelectValue placeholder="Choose a category to calculate pricing" />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingData?.pricing?.map((pricing) => {
                            const category = getExpertiseCategory(pricing.expertiseCategoryId);
                            return (
                              <SelectItem key={pricing.id} value={pricing.expertiseCategoryId}>
                                {category?.icon} {category?.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="calc-hours">Number of Hours</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCalculatorHours(Math.max(1, calculatorHours - 1))}
                          data-testid="button-decrease-hours"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={calculatorHours}
                          onChange={(e) => setCalculatorHours(Number(e.target.value) || 1)}
                          min="1"
                          max="24"
                          className="text-center"
                          data-testid="input-calc-hours"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCalculatorHours(Math.min(24, calculatorHours + 1))}
                          data-testid="button-increase-hours"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[4, 8, 12].map(hours => (
                        <Button
                          key={hours}
                          variant={calculatorHours === hours ? "default" : "outline"}
                          onClick={() => setCalculatorHours(hours)}
                          data-testid={`button-preset-${hours}h`}
                        >
                          {hours}h
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    {selectedCategoryForCalc && pricingData?.pricing ? (
                      (() => {
                        const pricing = pricingData.pricing.find((p: WorkshopPricing) => 
                          p.expertiseCategoryId === selectedCategoryForCalc
                        );
                        if (!pricing) return <div>Pricing not found</div>;
                        
                        const calculation = calculatePrice(pricing, calculatorHours);
                        const category = getExpertiseCategory(selectedCategoryForCalc);
                        
                        return (
                          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="text-2xl">{category?.icon}</div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{category?.name}</h3>
                                <p className="text-sm text-gray-600">{calculatorHours} hours calculation</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-green-200">
                                <span className="text-sm text-gray-600">Regular Hours ({calculation.regularHours}h):</span>
                                <span className="font-medium" data-testid="calc-regular-cost">
                                  ${calculation.regularCost.toFixed(2)}
                                </span>
                              </div>
                              
                              {calculation.overtimeHours > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-green-200">
                                  <span className="text-sm text-gray-600">
                                    Overtime ({calculation.overtimeHours}h × {pricing.overtimeMultiplier}):
                                  </span>
                                  <span className="font-medium text-orange-600" data-testid="calc-overtime-cost">
                                    ${calculation.overtimeCost.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
                                <span className="font-semibold text-gray-900">Total Cost:</span>
                                <span className="text-2xl font-bold text-green-600" data-testid="calc-total-cost">
                                  ${calculation.totalCost.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 p-3 bg-white rounded border">
                              <div className="text-sm font-medium text-gray-900 mb-2">Calculation Breakdown:</div>
                              <div className="space-y-1">
                                {calculation.breakdown.map((line, index) => (
                                  <div key={index} className="text-xs text-gray-600">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                        <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Select an expertise category to see pricing calculation</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Pricing Analytics
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Pricing analytics and market comparison features coming soon. Track your competitive positioning and pricing trends.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Statistics */}
        {pricingData?.pricing?.length && pricingData.pricing.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Pricing Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900" data-testid="summary-categories">
                    {pricingData.pricing.length}
                  </div>
                  <div className="text-sm text-gray-600">Categories Priced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="summary-avg-hourly">
                    ${pricingData?.pricing ? Math.round(pricingData.pricing.reduce((sum, p) => sum + p.hourlyRate, 0) / pricingData.pricing.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Hourly Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600" data-testid="summary-avg-shift">
                    ${pricingData?.pricing ? Math.round(pricingData.pricing.reduce((sum, p) => sum + p.eightHourShiftRate, 0) / pricingData.pricing.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Shift Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="summary-available">
                    {availableCategories.length}
                  </div>
                  <div className="text-sm text-gray-600">Categories Available</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}