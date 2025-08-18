import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function SemmMakePage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading make details...</div>
      </div>
    );
  }

  if (error || !semmData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load make data</div>
      </div>
    );
  }

  const goBack = () => {
    setLocation('/machinetree');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Breadcrumb and Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm">
              <button 
                onClick={goBack}
                className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
                data-testid="breadcrumb-home"
              >
                Machine Tree
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 font-medium" data-testid="breadcrumb-current">
                Make Details
              </span>
            </nav>
            
            {/* Title and Chevron */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-gray-900">
                Make Details
              </h1>

              {/* Chevron Down with Model Dropdown */}
              <div className="relative">
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  data-testid="dropdown-models"
                  title="Show models for this make"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                >
                  <ChevronDown className="w-5 h-5" />
                </button>

                  {/* Models Dropdown Menu */}
                  {showModelDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
                      <div className="px-4 py-3 text-center text-gray-500">
                        <span className="text-sm">Models data coming soon...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Share Icon */}
          <button
            className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Make Overview</h2>
          <p className="text-gray-600">Maritime classification: System → Equipment → Make → Model hierarchy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <p className="text-lg text-gray-600 leading-relaxed">
            Make details and model listings will be displayed here.
          </p>
          <div className="mt-6 text-gray-500">
            Code: <span className="font-bold text-orange-600">{code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}