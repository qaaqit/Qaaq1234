import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Home, Building, Phone, Mail, Globe, Clock, DollarSign, Star, Shield, Award, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WorkshopDetail {
  id: string;
  name: string;
  description?: string;
  port: string;
  country: string;
  address?: string;
  expertise: string[];
  hourlyRate: number;
  shiftRate: number;
  overtimeRate?: number;
  weekendRate?: number;
  rating?: number;
  reviewCount?: number;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  experience?: string;
  certifications?: string[];
  availability?: 'available' | 'busy' | 'offline';
  establishedYear?: number;
  teamSize?: number;
  completedProjects?: number;
  specializations?: string[];
  workingHours?: {
    weekdays?: string;
    saturday?: string;
    sunday?: string;
  };
  paymentMethods?: string[];
  languages?: string[];
}

export default function WorkshopTreeDetailPage() {
  const { workshopId } = useParams<{ workshopId: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch workshop details
  const { data: workshopData, isLoading, error } = useQuery({
    queryKey: [`/api/workshop/${workshopId}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const getAvailabilityBadge = (availability?: string) => {
    switch (availability) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available Now</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-100 text-yellow-800">Busy - Check Availability</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Currently Offline</Badge>;
      default:
        return <Badge variant="outline">Check Availability</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading workshop details...</div>
      </div>
    );
  }

  if (error || !workshopData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load workshop details</div>
      </div>
    );
  }

  const workshop = (workshopData as any)?.data || {};

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
              <span className="text-gray-400">/</span>
              <button
                onClick={() => setLocation('/workshop-tree')}
                className="text-orange-600 hover:underline"
                data-testid="link-workshop-tree"
              >
                Workshop Tree
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-800 font-medium">Workshop Profile</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Workshop Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Building className="h-12 w-12 text-white" />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-2">{workshop.name}</h1>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{workshop.port}, {workshop.country}</span>
                  </div>
                  {workshop.establishedYear && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Est. {workshop.establishedYear}</span>
                    </div>
                  )}
                </div>
                {workshop.rating && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(workshop.rating!) ? 'text-yellow-400 fill-current' : 'text-white/50'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-white/90">
                      {workshop.rating} ({workshop.reviewCount} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              {getAvailabilityBadge(workshop.availability)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="expertise">Expertise</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {workshop.teamSize && (
                <Card className="p-4">
                  <p className="text-sm text-gray-500 mb-1">Team Size</p>
                  <p className="text-2xl font-bold text-gray-800">{workshop.teamSize}</p>
                </Card>
              )}
              {workshop.completedProjects && (
                <Card className="p-4">
                  <p className="text-sm text-gray-500 mb-1">Projects</p>
                  <p className="text-2xl font-bold text-gray-800">{workshop.completedProjects}+</p>
                </Card>
              )}
              {workshop.experience && (
                <Card className="p-4">
                  <p className="text-sm text-gray-500 mb-1">Experience</p>
                  <p className="text-2xl font-bold text-gray-800">{workshop.experience}</p>
                </Card>
              )}
              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-1">Base Rate</p>
                <p className="text-2xl font-bold text-orange-600">${workshop.hourlyRate}/hr</p>
              </Card>
            </div>

            {/* Description */}
            {workshop.description && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
                <p className="text-gray-600">{workshop.description}</p>
              </Card>
            )}

            {/* Working Hours */}
            {workshop.workingHours && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Working Hours</h3>
                <div className="space-y-2">
                  {workshop.workingHours.weekdays && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monday - Friday</span>
                      <span className="font-medium">{workshop.workingHours.weekdays}</span>
                    </div>
                  )}
                  {workshop.workingHours.saturday && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saturday</span>
                      <span className="font-medium">{workshop.workingHours.saturday}</span>
                    </div>
                  )}
                  {workshop.workingHours.sunday && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sunday</span>
                      <span className="font-medium">{workshop.workingHours.sunday}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Rates</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Standard Hourly Rate</p>
                      <p className="text-sm text-gray-500">Regular working hours</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-800">${workshop.hourlyRate}/hr</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="font-medium">8-Hour Shift Rate</p>
                      <p className="text-sm text-gray-500">Full day service</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-600">${workshop.shiftRate}</p>
                </div>
                {workshop.overtimeRate && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Overtime Rate</p>
                      <p className="text-sm text-gray-500">After regular hours</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800">${workshop.overtimeRate}/hr</p>
                  </div>
                )}
                {workshop.weekendRate && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Weekend Rate</p>
                      <p className="text-sm text-gray-500">Saturday & Sunday</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800">${workshop.weekendRate}/hr</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Methods */}
            {workshop.paymentMethods && workshop.paymentMethods.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Methods</h3>
                <div className="flex flex-wrap gap-2">
                  {workshop.paymentMethods.map((method: string) => (
                    <Badge key={method} variant="secondary">
                      {method}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expertise" className="space-y-6">
            {/* Expertise Areas */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Expertise Areas</h3>
              <div className="flex flex-wrap gap-2">
                {workshop.expertise.map((exp: string) => (
                  <Badge key={exp} className="bg-orange-100 text-orange-800">
                    {exp}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Specializations */}
            {workshop.specializations && workshop.specializations.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Specializations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workshop.specializations.map((spec: string) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      <span className="text-gray-700">{spec}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Certifications */}
            {workshop.certifications && workshop.certifications.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Certifications</h3>
                <div className="space-y-3">
                  {workshop.certifications.map((cert: string) => (
                    <div key={cert} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Award className="h-5 w-5 text-orange-500" />
                      <span className="font-medium text-gray-800">{cert}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
              <div className="space-y-4">
                {workshop.contactPhone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a
                        href={`tel:${workshop.contactPhone}`}
                        className="text-lg font-medium text-orange-600 hover:underline"
                        data-testid="link-phone"
                      >
                        {workshop.contactPhone}
                      </a>
                    </div>
                  </div>
                )}
                {workshop.contactEmail && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a
                        href={`mailto:${workshop.contactEmail}`}
                        className="text-lg font-medium text-orange-600 hover:underline"
                        data-testid="link-email"
                      >
                        {workshop.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {workshop.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a
                        href={workshop.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-orange-600 hover:underline"
                        data-testid="link-website"
                      >
                        {workshop.website}
                      </a>
                    </div>
                  </div>
                )}
                {workshop.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="text-lg font-medium text-gray-800">{workshop.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Languages */}
            {workshop.languages && workshop.languages.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Languages Spoken</h3>
                <div className="flex flex-wrap gap-2">
                  {workshop.languages.map((lang: string) => (
                    <Badge key={lang} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Contact Actions */}
            <div className="flex gap-4">
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => window.location.href = `tel:${workshop.contactPhone}`}
                disabled={!workshop.contactPhone}
                data-testid="button-call"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Workshop
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => window.location.href = `mailto:${workshop.contactEmail}`}
                disabled={!workshop.contactEmail}
                data-testid="button-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}