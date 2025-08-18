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
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              
              {/* Back Arrow */}
              <button
                onClick={goBack}
                className="p-2 hover:bg-orange-100 text-orange-600 rounded-full transition-colors flex-shrink-0"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500 flex-shrink-0">
                <span className="text-orange-600 font-medium">MAN B&W</span>
              </nav>

              {/* Title - Centered */}
              <div className="flex items-center space-x-3 flex-1 justify-center">
                <h1 className="text-xl font-black text-gray-900">
                  Model Details
                </h1>
              </div>

              {/* Share Icon */}
              <button
                className="p-2 hover:bg-gray-100 text-gray-600 rounded-full transition-colors flex-shrink-0"
                data-testid="button-share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="h-1 bg-orange-400"></div>
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
  );
}