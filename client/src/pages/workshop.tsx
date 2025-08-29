import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Wrench, Phone, Mail, Globe, Star } from 'lucide-react';

interface Workshop {
  id: string;
  name: string;
  location: string;
  specialization: string;
  description: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  rating: number;
  isVerified: boolean;
}

export default function WorkshopPage() {
  const [, setLocation] = useLocation();
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const port = urlParams.get('port') || '';
    const system = urlParams.get('system') || '';
    
    setSelectedPort(port);
    setSelectedSystem(system);
  }, []);

  // Fetch workshops from API
  const { data: workshopsData, isLoading } = useQuery({
    queryKey: ['/api/workshops', selectedPort, selectedSystem],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedPort) queryParams.append('port', selectedPort);
      if (selectedSystem) queryParams.append('system', selectedSystem);
      
      const response = await fetch(`/api/workshops?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch workshops');
      return response.json();
    },
    enabled: selectedPort ? true : false
  });

  const handleBack = () => {
    setLocation('/discover');
  };

  const getSystemTitle = (systemCode: string) => {
    // Map of system codes to titles (this would ideally come from the SEMM API)
    const systemTitles: Record<string, string> = {
      'a': 'a. Propulsion',
      'b': 'b. Power Generation',
      'c': 'c. Boiler',
      'd': 'd. Compressed Air Systems',
      'e': 'e. Oil Purification',
      'f': 'f. Fresh Water & Cooling',
      'g': 'g. Automation & Control',
      'h': 'h. Cargo Systems',
      'i': 'i. Safety & Fire Fighting',
      'j': 'j. Crane & Deck Equipment',
      'k': 'k. Navigation Systems',
      'l': 'l. Pumps & Auxiliary',
      'm': 'm. HVAC Systems',
      'n': 'n. Pollution Control',
      'o': 'o. Hull & Structure',
      'p': 'p. Accommodation',
      'q': 'q. Workshop Equipment',
      'r': 'r. Communication Systems',
      's': 's. Spare Parts & Consumables'
    };
    
    return systemTitles[systemCode] || `System ${systemCode.toUpperCase()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Discover</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold text-gray-900">Repair Workshops</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Filters</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              <span className="text-gray-700">Port:</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {selectedPort || 'Not selected'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">System:</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedSystem ? getSystemTitle(selectedSystem) : 'Not selected'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Workshop Listings */}
        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading workshops...</p>
                </div>
              </CardContent>
            </Card>
          ) : workshopsData?.workshops?.length > 0 ? (
            workshopsData.workshops.map((workshop: any) => (
              <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-gray-900">{workshop.name}</CardTitle>
                      <p className="text-gray-600 mt-1">{workshop.location}</p>
                      <p className="text-sm text-gray-500 mt-1">{workshop.country}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className="bg-orange-100 text-orange-800 flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>{workshop.rating}/5.0</span>
                      </Badge>
                      <span className="text-xs text-gray-500">Est. {workshop.established}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Description</h4>
                      <p className="text-gray-600">{workshop.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Specializations</h4>
                      <div className="flex flex-wrap gap-2">
                        {workshop.specializations.map((spec: string, index: number) => (
                          <Badge key={index} variant="outline" className="border-orange-200 text-orange-800">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {workshop.services.map((service: string, index: number) => (
                          <div key={index} className="text-sm text-gray-600 flex items-center">
                            <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                            {service}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {workshop.contact.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{workshop.contact.phone}</span>
                            </div>
                          )}
                          {workshop.contact.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span>{workshop.contact.email}</span>
                            </div>
                          )}
                          {workshop.contact.website && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Globe className="w-4 h-4" />
                              <span>{workshop.contact.website}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Visa Status:</strong> {workshop.visa_status}
                          </div>
                          <Button 
                            className="w-full bg-orange-600 hover:bg-orange-700"
                            onClick={() => window.open(`mailto:${workshop.contact.email}?subject=Workshop Inquiry - ${selectedPort} ${selectedSystem}`, '_blank')}
                          >
                            Contact Workshop
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Workshop Data Coming Soon
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {selectedPort && selectedSystem ? 
                      `No workshops found for ${selectedPort} specializing in ${getSystemTitle(selectedSystem)}. Try adjusting your search criteria.` :
                      'Please select both a port and system from the discover page to find relevant workshops.'
                    }
                  </p>
                  <Button
                    onClick={handleBack}
                    className="mt-6 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Back to Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}