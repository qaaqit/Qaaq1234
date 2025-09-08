import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Wrench, Phone, Mail, Globe, Star } from 'lucide-react';

interface Workshop {
  id: string;
  fullName: string;
  email: string;
  services: string;
  whatsappNumber?: string;
  homePort: string;
  businessCardPhoto?: string;
  workshopFrontPhoto?: string;
  officialWebsite?: string;
  location?: string;
  description?: string;
  isVerified: boolean;
  isActive: boolean;
  importSource?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
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
            workshopsData.workshops.map((workshop: Workshop) => (
              <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-gray-900">{workshop.fullName}</CardTitle>
                      <p className="text-gray-600 mt-1">{workshop.homePort}</p>
                      <p className="text-sm text-gray-500 mt-1">{workshop.location || 'Location not specified'}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {workshop.isVerified ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>Verified</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          <span>Unverified</span>
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        Added {new Date(workshop.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workshop.description && (
                      <div>
                        <h4 className="font-medium text-gray-900">Description</h4>
                        <p className="text-gray-600">{workshop.description}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Services & Expertise</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-700">{workshop.services}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {workshop.whatsappNumber && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>WhatsApp: {workshop.whatsappNumber}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{workshop.email}</span>
                          </div>
                          {workshop.officialWebsite && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Globe className="w-4 h-4" />
                              <a 
                                href={workshop.officialWebsite.startsWith('http') ? workshop.officialWebsite : `https://${workshop.officialWebsite}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:text-orange-700 underline"
                              >
                                {workshop.officialWebsite}
                              </a>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Home Port:</strong> {workshop.homePort}
                          </div>
                          <div className="space-y-2">
                            <Button 
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              onClick={() => window.open(`mailto:${workshop.email}?subject=Workshop Service Inquiry - ${selectedPort} ${selectedSystem ? getSystemTitle(selectedSystem) : ''}`, '_blank')}
                            >
                              Contact Workshop
                            </Button>
                            {workshop.whatsappNumber && (
                              <Button 
                                variant="outline"
                                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => window.open(`https://wa.me/${workshop.whatsappNumber?.replace(/[^\d]/g, '')}?text=Hello, I found your workshop on QaaqConnect Maritime. I'm interested in your services for ${selectedPort} ${selectedSystem ? getSystemTitle(selectedSystem) : ''}.`, '_blank')}
                              >
                                Contact via WhatsApp
                              </Button>
                            )}
                          </div>
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