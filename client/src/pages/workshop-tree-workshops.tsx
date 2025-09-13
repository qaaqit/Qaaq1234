import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Home, ChevronRight, Building, Phone, Mail, DollarSign, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Workshop {
  id: string;
  name: string;
  expertise: string[];
  port: string;
  country: string;
  hourlyRate: number;
  shiftRate: number; // 8-hour shift rate
  rating?: number;
  reviewCount?: number;
  contactPhone?: string;
  contactEmail?: string;
  experience?: string;
  certifications?: string[];
  availability?: 'available' | 'busy' | 'offline';
}

export default function WorkshopTreeWorkshopsPage() {
  const { taskId, port } = useParams<{ taskId: string; port: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const expertise = searchParams.get('expertise') || '';
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);

  // Fetch workshops in the port
  const { data: workshopsData, isLoading, error } = useQuery({
    queryKey: [`/api/workshop-tree/task/${taskId}/port/${port}/workshops`, expertise],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const navigateToWorkshopDetail = (workshopId: string) => {
    setLocation(`/workshop-tree/workshop/${workshopId}`);
  };

  const getAvailabilityBadge = (availability?: string) => {
    switch (availability) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-100 text-yellow-800">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading workshops...</div>
      </div>
    );
  }

  if (error || !workshopsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load workshops</div>
      </div>
    );
  }

  const workshops = (workshopsData as any)?.data || [];
  const taskName = (workshopsData as any)?.taskName || 'Task';
  const portName = port.replace(/-/g, ' ');

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
              <button
                onClick={() => setLocation(`/workshop-tree/task/${taskId}/ports?expertise=${expertise}`)}
                className="text-orange-600 hover:underline"
                data-testid="link-ports"
              >
                Ports
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800 font-medium capitalize">{portName}</span>
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

      {/* Port Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Building className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold capitalize">Workshops in {portName}</h1>
              <p className="text-orange-100">{expertise} expertise for {taskName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workshops List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {workshops.map((workshop: Workshop) => (
            <Card
              key={workshop.id}
              className={`overflow-hidden hover:shadow-lg transition-all ${
                selectedWorkshop === workshop.id ? 'ring-2 ring-orange-500' : ''
              }`}
              data-testid={`card-workshop-${workshop.id}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{workshop.name}</h3>
                    <p className="text-sm text-gray-600">
                      {workshop.port}, {workshop.country}
                    </p>
                  </div>
                  {getAvailabilityBadge(workshop.availability)}
                </div>

                {/* Rating */}
                {workshop.rating && (
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(workshop.rating!) ? 'text-yellow-500 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {workshop.rating} ({workshop.reviewCount} reviews)
                    </span>
                  </div>
                )}

                {/* Pricing */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-500">Hourly Rate</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-800">${workshop.hourlyRate}/hr</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="h-4 w-4 text-orange-400" />
                      <p className="text-xs text-gray-500">8-Hour Shift</p>
                    </div>
                    <p className="text-lg font-semibold text-orange-600">${workshop.shiftRate}</p>
                  </div>
                  {workshop.experience && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Experience</p>
                      <p className="text-sm font-medium text-gray-800">{workshop.experience}</p>
                    </div>
                  )}
                </div>

                {/* Expertise Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {workshop.expertise.map((exp) => (
                    <Badge key={exp} variant="secondary" className="text-xs">
                      {exp}
                    </Badge>
                  ))}
                </div>

                {/* Certifications */}
                {workshop.certifications && workshop.certifications.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Certifications:</p>
                    <div className="flex flex-wrap gap-2">
                      {workshop.certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    {workshop.contactPhone && (
                      <a
                        href={`tel:${workshop.contactPhone}`}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-orange-600"
                        data-testid={`link-phone-${workshop.id}`}
                      >
                        <Phone className="h-4 w-4" />
                        <span>{workshop.contactPhone}</span>
                      </a>
                    )}
                    {workshop.contactEmail && (
                      <a
                        href={`mailto:${workshop.contactEmail}`}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-orange-600"
                        data-testid={`link-email-${workshop.id}`}
                      >
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    size="sm"
                    onClick={() => navigateToWorkshopDetail(workshop.id)}
                    data-testid={`button-view-details-${workshop.id}`}
                  >
                    View Details →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No workshops message */}
        {workshops.length === 0 && (
          <Card className="p-6 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Workshops Available</h3>
            <p className="text-sm text-gray-600">
              No workshops with {expertise} expertise are currently available in {portName}.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}