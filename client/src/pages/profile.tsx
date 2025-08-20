import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserIcon, Ship, MapPin, Calendar, 
  Anchor, Clock, Award, Users, ArrowLeft, Save, RefreshCw, HelpCircle, Eye, EyeOff 
} from "lucide-react";
import { z } from "zod";

// Maritime ranks options
const maritimeRanks = [
  { value: "captain", label: "Captain" },
  { value: "chief_officer", label: "Chief Officer" },
  { value: "second_officer", label: "2nd Officer" },
  { value: "third_officer", label: "3rd Officer" },
  { value: "chief_engineer", label: "Chief Engineer" },
  { value: "second_engineer", label: "2nd Engineer" },
  { value: "third_engineer", label: "3rd Engineer" },
  { value: "fourth_engineer", label: "4th Engineer" },
  { value: "cadet", label: "Maritime Cadet" },
  { value: "crew", label: "Ship Crew" },
  { value: "marine_superintendent", label: "Marine Superintendent" },
  { value: "technical_superintendent", label: "Technical Superintendent" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "eto", label: "ETO/Elec Superintendent" },
  { value: "other_maritime", label: "Other Maritime Professional" }
];

// Simplified profile update schema matching QAAQ database columns
const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),     // Password field
  rank: z.string().optional(),         // Will map to maritime_rank
  shipName: z.string().optional(),     // Will map to current_lastShip  
  city: z.string().optional(),         // Will map to current_city
  country: z.string().optional(),      // Will map to current_country
  countryCode: z.string().optional(),  // Country code for WhatsApp
  whatsAppNumber: z.string().optional(), // WhatsApp phone number
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export default function Profile() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Always call useQuery hook
  const { data: profile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['/api/users/profile'],
    enabled: false, // DISABLED for stability testing
  });

  // Always call useForm hook
  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    values: profile ? {
      fullName: profile.fullName || '',
      email: profile.email || '',
      password: profile.password || '',
      rank: profile.rank || '',
      shipName: profile.currentLastShip || '',
      city: profile.city || '',
      country: profile.country || '',
      countryCode: profile.countryCode || '',
      whatsAppNumber: profile.whatsAppNumber || '',
    } : {
      fullName: '',
      email: '',
      password: '',
      rank: '',
      shipName: '',
      city: '',
      country: '',
      countryCode: '',
      whatsAppNumber: '',
    },
  });

  // Always call useMutation hook
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      return apiRequest('/api/users/profile', 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your CV/Profile has been successfully updated and synced across all QAAQ apps.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated (using useEffect to avoid render-time state updates)
  useEffect(() => {
    if (!authLoading && !authUser) {
      setLocation('/');
    }
  }, [authLoading, authUser, setLocation]);

  const onSubmit = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  // Handle Enter key press to save profile when editing
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isEditing && !updateProfileMutation.isPending) {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  // Show loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please log in to access your profile.</p>
          <Button onClick={() => setLocation('/')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  // Show error state if profile not found
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <Button onClick={() => setLocation('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-navy">CV / Profile</h1>
                <p className="text-sm text-gray-600">
                  QAAQ Maritime Professional Profile
                  {isEditing && <span className="ml-2 text-orange-600">• Press Enter to save changes</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-ocean-teal text-white">
                {profile.isVerified ? "Verified" : "Pending Verification"}
              </Badge>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <UserIcon size={16} className="mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
            
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon size={20} className="text-navy" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Basic personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password field - full width */}
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"}
                              disabled={!isEditing}
                              placeholder="Enter your password"
                              className="pr-10"
                            />
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                tabIndex={-1}
                              >
                                {showPassword ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* WhatsApp Contact Information */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-700">WhatsApp Contact</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country Code</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="+91" 
                              disabled={!isEditing}
                              data-testid="input-country-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="whatsAppNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Number</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="1234567890" 
                                disabled={!isEditing}
                                data-testid="input-whatsapp-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Maritime Career Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Anchor size={20} className="text-navy" />
                  Maritime Career
                </CardTitle>
                <CardDescription>
                  Professional maritime experience and current assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maritime Rank</FormLabel>
                        <FormControl>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={!isEditing}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select your maritime rank..." />
                            </SelectTrigger>
                            <SelectContent>
                              {maritimeRanks.map((rank) => (
                                <SelectItem key={rank.value} value={rank.value}>
                                  {rank.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current/ Last Ship Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter ship name (e.g. MV Ocean Star)" disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin size={20} className="text-navy" />
                  Location Information
                </CardTitle>
                <CardDescription>
                  Current location for networking and discovery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mumbai" disabled={!isEditing} />
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
                          <Input {...field} placeholder="India" disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award size={20} className="text-navy" />
                  Profile Summary
                </CardTitle>
                <CardDescription>
                  Your QAAQ maritime professional profile across all sister apps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <HelpCircle size={24} className="mx-auto mb-2 text-ocean-teal" />
                    <div className="text-2xl font-bold text-navy">{profile.questionCount || 0}</div>
                    <div className="text-sm text-gray-600">Questions Asked</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Users size={24} className="mx-auto mb-2 text-ocean-teal" />
                    <div className="text-2xl font-bold text-navy">{profile.answerCount || 0}</div>
                    <div className="text-sm text-gray-600">Answers Given</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Calendar size={24} className="mx-auto mb-2 text-ocean-teal" />
                    <div className="text-2xl font-bold text-navy">{profile.loginCount || 0}</div>
                    <div className="text-sm text-gray-600">Login Count</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Clock size={24} className="mx-auto mb-2 text-ocean-teal" />
                    <div className="text-2xl font-bold text-navy">
                      {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="text-sm text-gray-600">Last Login</div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </form>
        </Form>
      </div>
    </div>
  );
}