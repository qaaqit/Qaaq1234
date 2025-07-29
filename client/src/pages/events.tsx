import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, Users, Clock, Ship, Anchor } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMaritimeEventSchema, type MaritimeEvent, type InsertMaritimeEvent } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function EventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch events with filters
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/events', selectedCity, selectedCountry, selectedEventType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedEventType) params.append('eventType', selectedEventType);
      params.append('status', 'upcoming');
      
      const response = await apiRequest(`/api/events?${params.toString()}`);
      return Array.isArray(response) ? response : [];
    }
  });

  const form = useForm<InsertMaritimeEvent>({
    resolver: zodResolver(insertMaritimeEventSchema),
    defaultValues: {
      title: '',
      description: '',
      eventType: 'maritime_meetup',
      location: '',
      city: '',
      country: '',
      latitude: 0,
      longitude: 0,
      startTime: new Date(),
      endTime: new Date(),
      maxAttendees: 10,
      contactInfo: '',
      requirements: ''
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: InsertMaritimeEvent) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Event created successfully!",
        description: "Your maritime event is now live and accepting registrations."
      });
    },
    onError: () => {
      toast({
        title: "Failed to create event",
        description: "Please check your details and try again.",
        variant: "destructive"
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Registration successful!",
        description: "You're now registered for this maritime event."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to register for this event.",
        variant: "destructive"
      });
    }
  });

  const onCreateEvent = (data: InsertMaritimeEvent) => {
    createEventMutation.mutate(data);
  };

  const handleRegister = (eventId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to register for events.",
        variant: "destructive"
      });
      return;
    }
    registerMutation.mutate(eventId);
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'maritime_meetup': return <Ship className="h-4 w-4" />;
      case 'port_tour': return <MapPin className="h-4 w-4" />;
      case 'shore_dining': return <Users className="h-4 w-4" />;
      case 'cultural_experience': return <Anchor className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'maritime_meetup': return 'bg-blue-100 text-blue-800';
      case 'port_tour': return 'bg-green-100 text-green-800';
      case 'shore_dining': return 'bg-orange-100 text-orange-800';
      case 'cultural_experience': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <Ship className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Maritime Events</h1>
          <p className="text-gray-600 mb-6">Please log in to view and register for maritime events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Ship className="h-8 w-8 text-blue-600" />
              Maritime Events
            </h1>
            <p className="text-gray-600 mt-1">Discover and organize maritime meetups worldwide</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Maritime Event</DialogTitle>
                <DialogDescription>
                  Organize a meetup for maritime professionals and locals in your area.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateEvent)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Mumbai Port Maritime Networking" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="maritime_meetup">Maritime Meetup</SelectItem>
                              <SelectItem value="port_tour">Port Tour</SelectItem>
                              <SelectItem value="shore_dining">Shore Dining</SelectItem>
                              <SelectItem value="cultural_experience">Cultural Experience</SelectItem>
                              <SelectItem value="professional_networking">Professional Networking</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxAttendees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Attendees</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="100" 
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue/Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Gateway of India" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Mumbai" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., India" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date & Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field}
                              value={field.value instanceof Date ? 
                                field.value.toISOString().slice(0, 16) : 
                                field.value}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date & Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field}
                              value={field.value instanceof Date ? 
                                field.value.toISOString().slice(0, 16) : 
                                field.value}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your maritime event, what to expect, who should attend..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Information</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="WhatsApp number, email, or other contact method" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special requirements, dress code, or items to bring..."
                            className="min-h-[60px]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createEventMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Netherlands">Netherlands</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="China">China</SelectItem>
                  <SelectItem value="Brazil">Brazil</SelectItem>
                  <SelectItem value="Panama">Panama</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cities</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                  <SelectItem value="Dubai">Dubai</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Houston">Houston</SelectItem>
                  <SelectItem value="Rotterdam">Rotterdam</SelectItem>
                  <SelectItem value="Hamburg">Hamburg</SelectItem>
                  <SelectItem value="Yokohama">Yokohama</SelectItem>
                  <SelectItem value="Shanghai">Shanghai</SelectItem>
                  <SelectItem value="Santos">Santos</SelectItem>
                  <SelectItem value="Panama City">Panama City</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Event Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Event Types</SelectItem>
                  <SelectItem value="maritime_meetup">Maritime Meetup</SelectItem>
                  <SelectItem value="port_tour">Port Tour</SelectItem>
                  <SelectItem value="shore_dining">Shore Dining</SelectItem>
                  <SelectItem value="cultural_experience">Cultural Experience</SelectItem>
                  <SelectItem value="professional_networking">Professional Networking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !Array.isArray(events) || events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6">
                {selectedCity || selectedCountry || selectedEventType 
                  ? 'No events match your current filters. Try adjusting your search criteria.'
                  : 'No maritime events are currently scheduled. Be the first to create one!'
                }
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(events) && events.map((event: MaritimeEvent) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {event.city}, {event.country}
                      </CardDescription>
                    </div>
                    <Badge className={`${getEventTypeBadgeColor(event.eventType)} flex items-center gap-1`}>
                      {getEventTypeIcon(event.eventType)}
                      {event.eventType.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{event.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(event.startTime), 'PPp')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    
                    {event.maxAttendees && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{event.currentAttendees || 0}/{event.maxAttendees} attendees</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {event.status}
                    </Badge>
                    
                    <Button 
                      size="sm"
                      onClick={() => handleRegister(event.id)}
                      disabled={registerMutation.isPending || 
                        (event.maxAttendees && (event.currentAttendees || 0) >= event.maxAttendees)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {registerMutation.isPending ? 'Registering...' : 
                       (event.maxAttendees && (event.currentAttendees || 0) >= event.maxAttendees) ? 
                       'Full' : 'Register'
                      }
                    </Button>
                  </div>
                  
                  {event.requirements && (
                    <div className="text-xs text-gray-500 border-t pt-2">
                      <strong>Requirements:</strong> {event.requirements}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}