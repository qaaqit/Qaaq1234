import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Wrench, Globe, Star } from 'lucide-react';

interface Workshop {
  id: string;
  full_name: string;
  email: string;
  services: string;
  whatsapp_number?: string;
  home_port: string;
  business_card_photo?: string;
  workshop_front_photo?: string;
  official_website?: string;
  location?: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
  import_source?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export default function WorkshopDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const workshopId = params.id;

  // Fetch current user for admin check
  const { data: user } = useQuery({
    queryKey: ['/api/auth/verify-token'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Token verification failed');
      const data = await response.json();
      return data.user;
    },
    retry: false
  });

  // Check if user is admin
  const isAdmin = user?.isAdmin || user?.isIntern || 
    ['workship.ai@gmail.com', 'mushy.piyush@gmail.com'].includes(user?.email);

  // Fetch individual workshop details
  const { data: workshop, isLoading, error } = useQuery({
    queryKey: ['/api/workshops', workshopId],
    queryFn: async () => {
      const response = await fetch(`/api/workshops/${workshopId}`);
      if (!response.ok) throw new Error('Failed to fetch workshop details');
      return response.json();
    },
    enabled: !!workshopId
  });

  const handleBack = () => {
    setLocation('/workshop');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workshop details...</p>
        </div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Workshop Not Found</h2>
          <p className="text-gray-600 mb-6">The workshop you're looking for doesn't exist.</p>
          <Button onClick={handleBack} className="bg-orange-600 hover:bg-orange-700">
            Back to Workshops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Results</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Workshop Images Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full flex gap-0 rounded-lg overflow-hidden shadow-md">
          {/* First Image - Business Card / Workshop Front */}
          <div className="w-1/2 aspect-video bg-orange-100 flex items-center justify-center overflow-hidden">
            {workshop.business_card_photo ? (
              <img 
                src={workshop.business_card_photo} 
                alt="Workshop business reference"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-orange-600 font-bold text-center">
                <Wrench className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm">WORKSHOP<br />FRONT</span>
              </div>
            )}
          </div>
          
          {/* Second Image - Workshop Front / Work */}
          <div className="w-1/2 aspect-video bg-orange-50 flex items-center justify-center overflow-hidden">
            {workshop.workshop_front_photo ? (
              <img 
                src={workshop.workshop_front_photo} 
                alt="Workshop facilities"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-orange-600 font-bold text-center">
                <Wrench className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm">WORK</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workshop Details */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-cream-50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl text-gray-900 mb-2">
                  {isAdmin ? workshop.full_name : 'WORKSHOP FRONT & WORK'}
                </CardTitle>
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{workshop.home_port}</span>
                  </div>
                  {workshop.location && (
                    <span className="text-sm">• {workshop.location}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {workshop.is_verified ? (
                  <Badge className="bg-green-100 text-green-800 flex items-center space-x-1 mb-2">
                    <Star className="w-3 h-3" />
                    <span>Verified</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600 mb-2">
                    <span>Unverified</span>
                  </Badge>
                )}
                <div className="text-sm text-gray-500">
                  Listed {new Date(workshop.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Description */}
              {workshop.description && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-700 leading-relaxed">{workshop.description}</p>
                </div>
              )}
              
              {/* Services */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Services & Expertise</h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">{workshop.services}</p>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Location Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Home Port: {workshop.home_port}</span>
                    </div>
                    {workshop.location && (
                      <div className="text-gray-600 pl-6">
                        Full Location: {workshop.location}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Info</h3>
                  <div className="space-y-2">
                    {isAdmin && workshop.official_website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={workshop.official_website.startsWith('http') ? workshop.official_website : `https://${workshop.official_website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 underline"
                        >
                          {workshop.official_website}
                        </a>
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="text-sm text-gray-500">
                        Contact details available through secure messaging
                      </div>
                    )}
                    {workshop.import_source && (
                      <div className="text-sm text-gray-500">
                        Source: {workshop.import_source}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Section - Anonymous */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Workshop</h3>
                <div className="bg-orange-50 p-6 rounded-lg text-center">
                  <Wrench className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Interested in this workshop?
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Contact this workshop through our secure messaging platform to maintain privacy and prevent spam.
                  </p>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8">
                    Send Message
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Messages are routed through QaaqConnect Maritime
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}