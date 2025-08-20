import { useLocation as useWouterLocation } from "wouter";
import { type User } from "@/lib/auth";
import UserDropdown from "@/components/user-dropdown";
import BottomNav from "@/components/bottom-nav";
import qaaqLogo from "@/assets/qaaq-logo.png";

interface DiscoverProps {
  user: User;
}

export default function Discover({ user }: DiscoverProps) {
  const [, setLocation] = useWouterLocation();

  return (
    <div className="h-[90vh] bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex flex-col">
      {/* Header - Mobile Optimized */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[1002] border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2 sm:space-x-3 hover:bg-white/10 rounded-lg p-1 sm:p-2 transition-colors min-w-0 flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">QaaqConnect</h1>
                <p className="text-xs sm:text-sm text-gray-600 italic font-medium whitespace-nowrap">1234 Koi Hai..</p>
              </div>
            </button>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <UserDropdown user={user} onLogout={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content Area - Disabled Features Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Q BAND RADAR</h2>
          <p className="text-gray-600 mb-4">
            All discover features have been temporarily disabled. They will be enabled one by one.
          </p>
          <div className="text-sm text-gray-500">
            <p>Disabled features:</p>
            <ul className="mt-2 space-y-1">
              <li>• User Map</li>
              <li>• Location Discovery</li>
              <li>• Post Feed</li>
              <li>• Search & Filters</li>
              <li>• WhatsApp Bot Control</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Bottom Navigation */}
      <BottomNav user={user} />
    </div>
  );
}