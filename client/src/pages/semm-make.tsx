import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, ChevronDown } from 'lucide-react';
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

export default function SemmMakePage() {
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

  // Mock make data based on code - in real implementation this would come from API
  const makeData = {
    code: code,
    name: code?.includes('wartsila') ? 'Wärtsilä' : 
          code?.includes('man') ? 'MAN Energy Solutions' :
          code?.includes('caterpillar') ? 'Caterpillar' :
          code?.includes('volvo') ? 'Volvo Penta' :
          'Unknown Make',
    description: 'Leading maritime equipment manufacturer',
    country: 'Finland',
    website: 'https://www.wartsila.com',
    models: [
      { code: `${code}-w6l32`, model: 'W6L32', description: 'Medium speed marine engine' },
      { code: `${code}-w8l32`, model: 'W8L32', description: 'High power marine engine' },
      { code: `${code}-w9l32`, model: 'W9L32', description: 'Large vessel propulsion engine' }
    ]
  };

  const goHome = () => setLocation('/machine-tree');
  const goBack = () => window.history.back();

  if (!code) {
    return <div>Invalid make code</div>;
  }

  // Extract equipment and system codes from the make code
  const equipmentCode = code.split('-')[0]; // e.g., 'aa' from 'aa-wartsila'
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
                {code?.split('').map((char, index) => (
                  <FlipCard key={index} char={char.toUpperCase()} index={index} large={false} />
                ))}
              </div>
              
              {/* Title */}
              <h1 className="text-xl font-bold text-gray-900" data-testid="text-make-title">
                {makeData.name}
              </h1>
            </div>

            {/* Right: Share Icon */}
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="button-share-make"
              title="Share make"
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
        
        {/* Breadcrumb Navigation - System > Equipment > Make hierarchy */}
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
          <div className="flex items-center space-x-1">
            <span className="text-gray-600 font-medium" data-testid="breadcrumb-current">
              {makeData.name}
            </span>
            <button 
              className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded transition-colors"
              data-testid="breadcrumb-expand"
              title="Explore models and specifications"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* Make Info Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{makeData.name}</h2>
                <p className="text-gray-600 mb-4">{makeData.description}</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p><span className="font-medium">Country:</span> {makeData.country}</p>
                  <p><span className="font-medium">Website:</span> <a href={makeData.website} className="text-orange-600 hover:text-orange-800" target="_blank" rel="noopener noreferrer">{makeData.website}</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Models Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Available Models ({makeData.models.length})
              </h3>
            </div>

            {/* Models Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {makeData.models.map((model) => (
                <button
                  key={model.code}
                  onClick={() => setLocation(`/machinetree/model/${model.code}`)}
                  className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                  data-testid={`card-model-${model.code}`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-orange-100 rounded-lg p-2 group-hover:bg-orange-200 transition-colors">
                        <span className="text-orange-700 font-mono text-sm font-bold">
                          {model.model}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                        {model.model}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {model.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}