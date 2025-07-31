import { useState } from "react";
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
  Anchor, Clock, Award, Users, ArrowLeft, Save, RefreshCw, HelpCircle 
} from "lucide-react";
import { z } from "zod";

// Simplified profile update schema for the existing database
const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  nickname: z.string().optional(),
  userType: z.enum(['sailor', 'local']),
  rank: z.string().optional(),
  shipName: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);

  // Redirect to login if not authenticated
  if (!authUser) {
    setLocation('/');
    return null;
  }

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['/api/users/profile'],
  });

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    values: profile ? {
      fullName: profile.fullName || '',
      email: profile.email || '',
      nickname: profile.nickname || '',
      userType: (profile.userType as 'sailor' | 'local') || 'sailor',
      rank: profile.rank || '',
      shipName: profile.shipName || '',
      city: profile.city || '',
      country: profile.country || '',
    } : {
      fullName: '',
      email: '',
      userType: 'sailor' as const,
    },
  });

  // Update profile mutation
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

  const onSubmit = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
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
                <p className="text-sm text-gray-600">QAAQ Maritime Professional Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile && (
                <Badge variant="default" className="bg-ocean-teal text-white">
                  {profile.isVerified ? "Verified" : "Pending Verification"}
                </Badge>
              )}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
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

                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional display name" disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sailor">Maritime Professional / Sailor</SelectItem>
                            <SelectItem value="local">Local Guide</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          <Input {...field} placeholder="Captain, Chief Engineer, Officer..." disabled={!isEditing} />
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
                        <FormLabel>Current Ship Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="MV Ocean Star" disabled={!isEditing} />
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