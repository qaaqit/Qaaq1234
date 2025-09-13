import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  MapPin,
  Ship,
  User,
  DollarSign,
  AlertTriangle,
  Filter,
  Search,
  FileText,
  MessageSquare,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { MARITIME_EXPERTISE_CATEGORIES } from '@shared/maritime-expertise';

// API Response Types
interface BookingsApiResponse {
  success: boolean;
  bookings: WorkshopBooking[];
  message?: string;
}

interface BookingUpdateResponse {
  success: boolean;
  booking: WorkshopBooking;
  message?: string;
}

// Booking response schema
const bookingResponseSchema = z.object({
  response: z.enum(['accept', 'decline']),
  quotedAmount: z.number().min(0, 'Amount must be positive').optional(),
  estimatedStartTime: z.string().optional(),
  estimatedDuration: z.number().min(1, 'Duration must be at least 1 hour').optional(),
  responseNotes: z.string().optional(),
});

// Booking update schema
const bookingUpdateSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
  actualHours: z.number().min(0.1, 'Actual hours must be at least 0.1').optional(),
  finalAmount: z.number().min(0, 'Amount must be positive').optional(),
  completionNotes: z.string().optional(),
});

type BookingResponseData = z.infer<typeof bookingResponseSchema>;
type BookingUpdateData = z.infer<typeof bookingUpdateSchema>;

interface WorkshopBooking {
  id: string;
  shipManagerId: string;
  shipName: string;
  shipImo?: string;
  port: string;
  requestedExpertise: string[];
  taskDescription: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  preferredStartDate: string;
  estimatedDuration: number;
  contactEmail: string;
  contactPhone?: string;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  quotedAmount?: number;
  finalAmount?: number;
  actualHours?: number;
  estimatedStartTime?: string;
  responseNotes?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  shipManager?: {
    fullName: string;
    email: string;
  };
}

export default function WorkshopBookingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBooking, setSelectedBooking] = useState<WorkshopBooking | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form setup for booking response
  const responseForm = useForm<BookingResponseData>({
    resolver: zodResolver(bookingResponseSchema),
    defaultValues: {
      response: 'accept',
      quotedAmount: 0,
      estimatedDuration: 8,
      responseNotes: '',
    }
  });

  // Form setup for booking update
  const updateForm = useForm<BookingUpdateData>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      status: 'in_progress',
      actualHours: 0,
      finalAmount: 0,
      completionNotes: '',
    }
  });

  // Fetch workshop bookings
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery<BookingsApiResponse>({
    queryKey: ['/api/workshop-bookings', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds for real-time updates
  });

  // Respond to booking mutation
  const respondToBookingMutation = useMutation({
    mutationFn: async ({ bookingId, responseData }: { bookingId: string; responseData: BookingResponseData }) => {
      const response = await apiRequest(`/api/workshop-bookings/${bookingId}/respond`, 'POST', responseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-bookings'] });
      setIsResponseDialogOpen(false);
      setSelectedBooking(null);
      responseForm.reset();
      toast({
        title: "Response sent",
        description: "Your response to the booking request has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending response",
        description: error.message || "Failed to send response. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, updateData }: { bookingId: string; updateData: BookingUpdateData }) => {
      const response = await apiRequest(`/api/workshop-bookings/${bookingId}/update`, 'PUT', updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-bookings'] });
      setIsUpdateDialogOpen(false);
      setSelectedBooking(null);
      updateForm.reset();
      toast({
        title: "Booking updated",
        description: "The booking status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating booking",
        description: error.message || "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleBack = () => {
    setLocation('/workshop-owner/dashboard');
  };

  const handleViewBooking = (booking: WorkshopBooking) => {
    setSelectedBooking(booking);
  };

  const handleRespondToBooking = (booking: WorkshopBooking) => {
    setSelectedBooking(booking);
    responseForm.reset({
      response: 'accept',
      quotedAmount: 0,
      estimatedDuration: booking.estimatedDuration,
      responseNotes: '',
    });
    setIsResponseDialogOpen(true);
  };

  const handleUpdateBooking = (booking: WorkshopBooking) => {
    setSelectedBooking(booking);
    updateForm.reset({
      status: booking.status === 'accepted' ? 'in_progress' : 'completed',
      actualHours: booking.actualHours || booking.estimatedDuration,
      finalAmount: booking.finalAmount || booking.quotedAmount || 0,
      completionNotes: '',
    });
    setIsUpdateDialogOpen(true);
  };

  const submitResponse = (data: BookingResponseData) => {
    if (selectedBooking) {
      respondToBookingMutation.mutate({ bookingId: selectedBooking.id, responseData: data });
    }
  };

  const submitUpdate = (data: BookingUpdateData) => {
    if (selectedBooking) {
      updateBookingMutation.mutate({ bookingId: selectedBooking.id, updateData: data });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpertiseNames = (expertiseIds: string[]) => {
    return expertiseIds
      .map(id => {
        const category = MARITIME_EXPERTISE_CATEGORIES.find(cat => cat.id === id);
        return category ? `${category.icon} ${category.name}` : id;
      })
      .join(', ');
  };

  // Filter bookings
  const filteredBookings = (bookingsData?.bookings || []).filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesSearch = !searchQuery || 
      booking.shipName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.port.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.taskDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Group bookings by status
  const pendingBookings = filteredBookings.filter((b) => b.status === 'pending');
  const activeBookings = filteredBookings.filter((b) => ['accepted', 'in_progress'].includes(b.status));
  const completedBookings = filteredBookings.filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Please log in to access booking management.</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
                <p className="text-gray-600">Manage incoming requests and active bookings</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-orange-600">
                {pendingBookings.length} Pending
              </Badge>
              <Badge variant="outline" className="text-green-600">
                {activeBookings.length} Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Booking Request</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{selectedBooking.shipName}</h4>
                  <Badge className={getUrgencyColor(selectedBooking.urgencyLevel)}>
                    {selectedBooking.urgencyLevel}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{selectedBooking.taskDescription}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{selectedBooking.port}</span>
                  <span>•</span>
                  <span>{selectedBooking.estimatedDuration}h estimated</span>
                  <span>•</span>
                  <span>{new Date(selectedBooking.preferredStartDate).toLocaleDateString()}</span>
                </div>
              </div>

              <Form {...responseForm}>
                <form onSubmit={responseForm.handleSubmit(submitResponse)} className="space-y-6">
                  <FormField
                    control={responseForm.control}
                    name="response"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          data-testid="select-response"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select response" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="accept">Accept Request</SelectItem>
                            <SelectItem value="decline">Decline Request</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {responseForm.watch('response') === 'accept' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={responseForm.control}
                          name="quotedAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quoted Amount ($) *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-quoted-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={responseForm.control}
                          name="estimatedDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Duration (hours) *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.5"
                                  min="1"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-estimated-duration"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={responseForm.control}
                        name="estimatedStartTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Start Time</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                data-testid="input-start-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={responseForm.control}
                    name="responseNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Additional notes or requirements..."
                            rows={3}
                            data-testid="textarea-response-notes"
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
                      onClick={() => setIsResponseDialogOpen(false)}
                      data-testid="button-cancel-response"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={responseForm.watch('response') === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                      disabled={respondToBookingMutation.isPending}
                      data-testid="button-send-response"
                    >
                      {respondToBookingMutation.isPending ? 'Sending...' : `${responseForm.watch('response') === 'accept' ? 'Accept' : 'Decline'} Request`}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(submitUpdate)} className="space-y-6">
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      data-testid="select-update-status"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in_progress">Start Work</SelectItem>
                        <SelectItem value="completed">Complete Job</SelectItem>
                        <SelectItem value="cancelled">Cancel Job</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(updateForm.watch('status') === 'completed') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={updateForm.control}
                      name="actualHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Hours Worked *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.1"
                              min="0.1"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-actual-hours"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={updateForm.control}
                      name="finalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Final Amount ($) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-final-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <FormField
                control={updateForm.control}
                name="completionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Work completed, issues found, recommendations..."
                        rows={4}
                        data-testid="textarea-completion-notes"
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
                  onClick={() => setIsUpdateDialogOpen(false)}
                  data-testid="button-cancel-update"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateBookingMutation.isPending}
                  data-testid="button-save-update"
                >
                  {updateBookingMutation.isPending ? 'Updating...' : 'Update Booking'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking && !isResponseDialogOpen && !isUpdateDialogOpen} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Ship className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedBooking.shipName}</h3>
                    <p className="text-sm text-gray-600">{selectedBooking.port}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(selectedBooking.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Booking Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Job Details</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Task Description:</div>
                      <div className="text-sm text-gray-900 mt-1">{selectedBooking.taskDescription}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Required Expertise:</div>
                      <div className="text-sm text-gray-900 mt-1">{getExpertiseNames(selectedBooking.requestedExpertise)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Urgency:</div>
                        <Badge className={getUrgencyColor(selectedBooking.urgencyLevel)} variant="outline">
                          {selectedBooking.urgencyLevel}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Est. Duration:</div>
                        <div className="text-sm text-gray-900">{selectedBooking.estimatedDuration}h</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Contact & Schedule</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{selectedBooking.contactEmail}</span>
                    </div>
                    {selectedBooking.contactPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-900">{selectedBooking.contactPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        Preferred: {new Date(selectedBooking.preferredStartDate).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedBooking.estimatedStartTime && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          Scheduled: {new Date(selectedBooking.estimatedStartTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              {(selectedBooking.quotedAmount || selectedBooking.finalAmount) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Financial Details</h4>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedBooking.quotedAmount && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Quoted Amount:</div>
                          <div className="text-lg font-bold text-green-600">${selectedBooking.quotedAmount.toLocaleString()}</div>
                        </div>
                      )}
                      {selectedBooking.finalAmount && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Final Amount:</div>
                          <div className="text-lg font-bold text-green-600">${selectedBooking.finalAmount.toLocaleString()}</div>
                        </div>
                      )}
                      {selectedBooking.actualHours && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Actual Hours:</div>
                          <div className="text-sm text-gray-900">{selectedBooking.actualHours}h</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {(selectedBooking.responseNotes || selectedBooking.completionNotes) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                  <div className="space-y-3">
                    {selectedBooking.responseNotes && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-900 mb-1">Response Notes:</div>
                        <div className="text-sm text-blue-800">{selectedBooking.responseNotes}</div>
                      </div>
                    )}
                    {selectedBooking.completionNotes && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-900 mb-1">Completion Notes:</div>
                        <div className="text-sm text-green-800">{selectedBooking.completionNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedBooking.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleRespondToBooking(selectedBooking)}
                      data-testid="button-respond-booking"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Respond
                    </Button>
                  </>
                )}
                {['accepted', 'in_progress'].includes(selectedBooking.status) && (
                  <Button
                    onClick={() => handleUpdateBooking(selectedBooking)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-update-booking"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Update Status
                  </Button>
                )}
              </div>
            </div>
          )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by ship name, port, or task..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-bookings"
                  />
                </div>
              </div>

              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center space-x-2" data-testid="tab-pending">
              <Clock className="w-4 h-4" />
              <span>Pending ({pendingBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center space-x-2" data-testid="tab-active">
              <CheckCircle className="w-4 h-4" />
              <span>Active ({activeBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2" data-testid="tab-completed">
              <FileText className="w-4 h-4" />
              <span>Completed ({completedBookings.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Pending Bookings */}
          <TabsContent value="pending">
            <BookingsList 
              bookings={pendingBookings}
              isLoading={bookingsLoading}
              emptyMessage="No pending booking requests"
              emptyDescription="New booking requests will appear here when ship managers submit them."
              onView={handleViewBooking}
              onRespond={handleRespondToBooking}
              showResponseActions={true}
            />
          </TabsContent>

          {/* Active Bookings */}
          <TabsContent value="active">
            <BookingsList 
              bookings={activeBookings}
              isLoading={bookingsLoading}
              emptyMessage="No active bookings"
              emptyDescription="Accepted bookings that are in progress will appear here."
              onView={handleViewBooking}
              onUpdate={handleUpdateBooking}
              showUpdateActions={true}
            />
          </TabsContent>

          {/* Completed Bookings */}
          <TabsContent value="completed">
            <BookingsList 
              bookings={completedBookings}
              isLoading={bookingsLoading}
              emptyMessage="No completed bookings"
              emptyDescription="Completed, declined, and cancelled bookings will appear here."
              onView={handleViewBooking}
              showHistoryOnly={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// BookingsList Component
interface BookingsListProps {
  bookings: WorkshopBooking[];
  isLoading: boolean;
  emptyMessage: string;
  emptyDescription: string;
  onView: (booking: WorkshopBooking) => void;
  onRespond?: (booking: WorkshopBooking) => void;
  onUpdate?: (booking: WorkshopBooking) => void;
  showResponseActions?: boolean;
  showUpdateActions?: boolean;
  showHistoryOnly?: boolean;
}

function BookingsList({ 
  bookings, 
  isLoading, 
  emptyMessage, 
  emptyDescription, 
  onView,
  onRespond,
  onUpdate,
  showResponseActions = false,
  showUpdateActions = false,
  showHistoryOnly = false
}: BookingsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpertiseNames = (expertiseIds: string[]) => {
    return expertiseIds
      .map(id => {
        const category = MARITIME_EXPERTISE_CATEGORIES.find(cat => cat.id === id);
        return category ? `${category.icon} ${category.name}` : id;
      })
      .join(', ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
            <p className="text-gray-600 max-w-md mx-auto">{emptyDescription}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {bookings.map((booking) => (
        <Card key={booking.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Ship className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{booking.shipName}</h3>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                  <Badge className={getUrgencyColor(booking.urgencyLevel)} variant="outline">
                    {booking.urgencyLevel}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{booking.taskDescription}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{booking.port}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{booking.estimatedDuration}h estimated</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {new Date(booking.preferredStartDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Expertise:</strong> {getExpertiseNames(booking.requestedExpertise)}
                </div>

                {booking.quotedAmount && (
                  <div className="mt-2 text-sm">
                    <strong className="text-green-600">Quoted: ${booking.quotedAmount.toLocaleString()}</strong>
                    {booking.finalAmount && booking.finalAmount !== booking.quotedAmount && (
                      <span className="text-gray-600 ml-2">
                        (Final: ${booking.finalAmount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(booking)}
                  data-testid={`button-view-booking-${booking.id}`}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                
                {showResponseActions && onRespond && (
                  <Button
                    size="sm"
                    onClick={() => onRespond(booking)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid={`button-respond-booking-${booking.id}`}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Respond
                  </Button>
                )}
                
                {showUpdateActions && onUpdate && (
                  <Button
                    size="sm"
                    onClick={() => onUpdate(booking)}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-update-booking-${booking.id}`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Update
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}