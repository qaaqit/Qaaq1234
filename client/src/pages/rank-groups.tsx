import { useLocation } from "wouter";
import { RankGroupsPanel } from "@/components/rank-groups-panel";
import UserDropdown from "@/components/user-dropdown";
import { useAuth } from "@/hooks/useAuth";
import qaaqLogo from "@/assets/qaaq-logo.png";

export default function RankGroupsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Return early if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-600">Please log in to access rank groups.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Home Logo - Same as Discover and DM Pages */}
        <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[110] border-b-2 border-orange-400 rounded-t-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
          
          <div className="relative z-10 px-3 py-2 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setLocation('/')}
                className="flex items-center space-x-3 hover:bg-orange-100 rounded-lg p-2 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  <img 
                    src={qaaqLogo} 
                    alt="QAAQ Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">QaaqConnect</h1>
                  <p className="text-sm text-orange-600 italic font-medium">maritime groups</p>
                </div>
              </button>
              {user && <UserDropdown user={user} onLogout={() => window.location.reload()} />}
            </div>
          </div>
        </header>

        {/* Rank Groups Panel Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <RankGroupsPanel />
        </div>
      </div>
    </div>
  );
}