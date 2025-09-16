import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Wrench, Phone, Mail, Globe, Star } from 'lucide-react';

interface Workshop {
  id: string;
  display_id: string; // Anonymous workshop identifier (e.g., wDubai1)
  full_name: string;
  email: string;
  services: string;
  whatsapp_number?: string;
  home_port: string;
  business_card_photo?: string;
  workshop_front_photo?: string;
  official_website?: string;
  websitePreviewImage?: string; // Automated website preview/screenshot URL
  location?: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
  import_source?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
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
    }
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
              <Card 
                key={workshop.id} 
                className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden"
                onClick={() => setLocation(`/workshop/${workshop.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    {/* Workshop Images Area - Two 16:9 images side by side */}
                    <div className="w-full flex gap-0">
                      {/* First Image */}
                      <div className="w-1/2 aspect-video bg-orange-100 flex items-center justify-center overflow-hidden relative">
                        {workshop.business_card_photo ? (
                          <img 
                            src={workshop.business_card_photo} 
                            alt={`${workshop.display_id} business card`}
                            className="w-full h-full object-cover"
                          />
                        ) : workshop.websitePreviewImage ? (
                          <div className="w-full h-full relative">
                            <img 
                              src={workshop.websitePreviewImage} 
                              alt={`${workshop.display_id} website preview`}
                              className="w-full h-full object-cover blur-md opacity-40"
                            />
                            <div className="absolute inset-0 bg-orange-100/60 flex items-center justify-center">
                              <div className="text-orange-700 font-bold text-center">
                                <Wrench className="w-6 h-6 mx-auto mb-1" />
                                <span className="text-xs">WORKSHOP<br />FRONT</span>
                              </div>
                            </div>
                          </div>
                        ) : workshop.official_website ? (
                          <div className="w-full h-full relative">
                            <img 
                              src={`https://image.thum.io/get/width/400/crop/400/allowJPG/wait/20/noanimate/${workshop.official_website}`}
                              alt={`${workshop.display_id} website screenshot`}
                              className="w-full h-full object-cover blur-md opacity-40"
                            />
                            <div className="absolute inset-0 bg-orange-100/60 flex items-center justify-center">
                              <div className="text-orange-700 font-bold text-center">
                                <Wrench className="w-6 h-6 mx-auto mb-1" />
                                <span className="text-xs">WORKSHOP<br />FRONT</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-orange-600 font-bold text-center">
                            <Wrench className="w-6 h-6 mx-auto mb-1" />
                            <span className="text-xs">WORKSHOP<br />FRONT</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Second Image */}
                      <div className="w-1/2 aspect-video bg-orange-50 flex items-center justify-center overflow-hidden relative">
                        {workshop.workshop_front_photo ? (
                          <img 
                            src={workshop.workshop_front_photo} 
                            alt={`${workshop.display_id} workshop front`}
                            className="w-full h-full object-cover"
                          />
                        ) : workshop.websitePreviewImage ? (
                          <div className="w-full h-full relative">
                            <img 
                              src={workshop.websitePreviewImage} 
                              alt={`${workshop.display_id} website preview`}
                              className="w-full h-full object-cover blur-md opacity-30"
                            />
                            <div className="absolute inset-0 bg-orange-50/70 flex items-center justify-center">
                              <div className="text-orange-700 font-bold text-center">
                                <Wrench className="w-6 h-6 mx-auto mb-1" />
                                <span className="text-xs">WORK</span>
                              </div>
                            </div>
                          </div>
                        ) : workshop.official_website ? (
                          <div className="w-full h-full relative">
                            <img 
                              src={`https://image.thum.io/get/width/400/crop/400/allowJPG/wait/20/noanimate/${workshop.official_website}`}
                              alt={`${workshop.display_id} website screenshot`}
                              className="w-full h-full object-cover blur-md opacity-30"
                            />
                            <div className="absolute inset-0 bg-orange-50/70 flex items-center justify-center">
                              <div className="text-orange-700 font-bold text-center">
                                <Wrench className="w-6 h-6 mx-auto mb-1" />
                                <span className="text-xs">WORK</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-orange-600 font-bold text-center">
                            <Wrench className="w-6 h-6 mx-auto mb-1" />
                            <span className="text-xs">WORK</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Workshop Details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Display ID - Orange and prominent */}
                          <div className="text-xs font-medium text-orange-600 mb-1">
                            {workshop.display_id}
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            Maritime Workshop
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {workshop.home_port}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {workshop.services}
                          </p>
                        </div>
                        
                        {/* Status Badge and Arrow */}
                        <div className="flex items-center space-x-2 ml-4">
                          {workshop.is_verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">
                              <Star className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
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
                    {selectedPort || selectedSystem ? 
                      `No workshops found${selectedPort ? ` in ${selectedPort}` : ''}${selectedSystem ? ` specializing in ${getSystemTitle(selectedSystem)}` : ''}. Try adjusting your search criteria.` :
                      'No workshops found. Please check back later as more workshops join our platform.'
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