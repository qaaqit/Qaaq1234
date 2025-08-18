import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

// Bottom edge roll out flip card animation
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 600 + (index * 150));
    
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-8 h-10' : 'w-8 h-12';
  const textSize = large ? 'text-2xl' : 'text-lg';

  return (
    <div className={`relative ${cardSize} rounded-lg overflow-hidden border-2 border-white shadow-lg`} 
         style={{ 
           perspective: '1000px',
           boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0, 0, 0, 0.2)'
         }}>
      {/* Loading state card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 -1px 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <div className="w-2 h-2 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Character reveal card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(180deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <span className={`${textSize} font-bold text-white font-mono tracking-wider leading-none`}
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8), 0 -1px 1px rgba(255, 255, 255, 0.2)',
              }}>
          {char}
        </span>
      </div>
    </div>
  );
};

export default function SemmModelPage() {
  const { code } = useParams();
  const [, setLocation] = useLocation();

  const { data: semmData } = useQuery({
    queryKey: [`/api/dev/semm-cards`],
    queryFn: async () => {
      const response = await fetch(`/api/dev/semm-cards`);
      if (!response.ok) throw new Error('Failed to fetch SEMM data');
      return response.json();
    }
  });

  // Mock model data based on code - in real implementation this would come from API
  const modelData = {
    code: code,
    model: 'W6L32',
    description: 'Medium speed marine diesel engine with exceptional fuel efficiency and reliability',
    make: 'Wärtsilä',
    yearIntroduced: 2018,
    specifications: {
      power: '3,600 kW @ 720 rpm',
      cylinders: 6,
      displacement: '159 L',
      weight: '12,500 kg',
      dimensions: '4.8 x 2.1 x 3.2 m',
      fuelConsumption: '195 g/kWh',
      emissions: 'Tier III compliant'
    },
    applications: [
      'Main propulsion for medium-sized vessels',
      'Generator sets for offshore platforms',
      'Backup power systems',
      'Ferry and passenger ship propulsion'
    ],
    features: [
      'Advanced fuel injection system',
      'Optimized combustion chamber design',
      'Integrated engine management system',
      'Modular design for easy maintenance'
    ]
  };

  const goHome = () => setLocation('/machine-tree');
  const goBack = () => window.history.back();

  if (!code) {
    return <div>Invalid model code</div>;
  }

  // Extract make, equipment and system codes from the model code
  const makeCode = code?.split('-').slice(0, 2).join('-'); // e.g., 'aa-wartsila' from 'aa-wartsila-w6l32'
  const equipmentCode = code?.split('-')[0]; // e.g., 'aa' from 'aa-wartsila-w6l32'
  const systemCode = equipmentCode?.charAt(0); // e.g., 'a' from 'aa'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            
            {/* Left: Back Button */}
            <button 
              onClick={goBack}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Center: Code Card and Title */}
            <div className="flex items-center space-x-3">
              {/* Code Card - Half Size */}
              <div className="flex items-center bg-orange-500 rounded-lg px-3 py-1.5 shadow-lg">
                {code?.split('').slice(0, 6).map((char, index) => (
                  <FlipCard key={index} char={char.toUpperCase()} index={index} large={false} />
                ))}
              </div>
              
              {/* Title */}
              <h1 className="text-xl font-bold text-gray-900" data-testid="text-model-title">
                {modelData.model}
              </h1>
            </div>

            {/* Right: Share Icon */}
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="button-share-model"
              title="Share model"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Orange separator line */}
      <div className="h-0.5 bg-orange-500"></div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Breadcrumb Navigation - Complete System > Equipment > Make > Model hierarchy */}
        <nav className="flex items-center space-x-2 text-sm mb-8" data-testid="breadcrumb-nav">
          <button 
            onClick={goHome}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            data-testid="breadcrumb-home"
          >
            Machine Tree
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button 
            onClick={() => setLocation(`/machinetree/system/${systemCode}`)}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            data-testid="breadcrumb-system"
          >
            System
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button 
            onClick={() => setLocation(`/machinetree/equipment/${equipmentCode}`)}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            data-testid="breadcrumb-equipment"
          >
            Equipment
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button 
            onClick={() => setLocation(`/machinetree/make/${makeCode}`)}
            className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            data-testid="breadcrumb-make"
          >
            Make
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 font-medium" data-testid="breadcrumb-current">
            {modelData.model}
          </span>
        </nav>

        {/* Model Details Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{modelData.model}</h2>
                <p className="text-lg text-gray-600 mb-4">{modelData.description}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <p><span className="font-medium">Manufacturer:</span> {modelData.make}</p>
                  <p><span className="font-medium">Year:</span> {modelData.yearIntroduced}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Technical Specifications */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Technical Specifications</h3>
              <div className="space-y-4">
                {Object.entries(modelData.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-900 font-mono text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Applications</h3>
              <ul className="space-y-3">
                {modelData.applications.map((application, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{application}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {modelData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-800 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            data-testid="button-view-datasheet"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Datasheet
          </button>
          <button 
            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            data-testid="button-contact-supplier"
          >
            Contact Supplier
          </button>
        </div>
      </div>
    </div>
  );
}