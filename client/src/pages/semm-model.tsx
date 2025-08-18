import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, ChevronRight } from 'lucide-react';

export default function SemmModelPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading model details...</div>
      </div>
    );
  }

  if (error || !semmData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load model data</div>
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
                Model Details
              </span>
            </nav>
            
            {/* Title */}
            <h1 className="text-2xl font-black text-gray-900">
              Model Details
            </h1>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Overview</h2>
          <p className="text-gray-600">Maritime classification: System → Equipment → Make → Model hierarchy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <p className="text-lg text-gray-600 leading-relaxed">
            Final level in the SEMM hierarchy - specific model details and specifications.
          </p>
          <div className="mt-6 text-gray-500">
            Code: <span className="font-bold text-orange-600">{code}</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}