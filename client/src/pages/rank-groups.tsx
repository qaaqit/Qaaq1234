import { useState } from "react";
import { useLocation } from "wouter";

import { RankGroupsPanel } from "@/components/rank-groups-panel";
import UserDropdown from "@/components/user-dropdown";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import qaaqLogo from "@/assets/qaaq-logo.png";

export default function RankGroupsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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
    <div className="h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col">
      {/* Header with Home Logo - Same as QBOT Page */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[110] border-b-2 border-orange-400">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
          
          <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={() => setLocation('/')}
                className="flex items-center space-x-2 sm:space-x-3 hover:bg-orange-100 rounded-lg p-1 sm:p-2 transition-colors min-w-0 flex-shrink-0"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                  <img 
                    src={qaaqLogo} 
                    alt="QAAQ Logo" 
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-gray-800 whitespace-nowrap">QaaqConnect</h1>
                  <p className="text-xs sm:text-sm text-orange-600 italic font-medium whitespace-nowrap">maritime groups</p>
                </div>
              </button>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {user && <UserDropdown user={user} onLogout={() => window.location.reload()} />}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Rank Groups Panel Content */}
            <div className="bg-white rounded-lg shadow-sm">
              <RankGroupsPanel />
            </div>
          </div>
        </div>
    </div>
  );
}