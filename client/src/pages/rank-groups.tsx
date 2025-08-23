import { RankGroupsPanel } from "@/components/rank-groups-panel";
import { useAuth } from "@/hooks/useAuth";
import { useMaritimeRankConfirmation } from "@/hooks/useMaritimeRankConfirmation";
import { MaritimeRankToast } from "@/components/MaritimeRankToast";

export default function RankGroupsPage() {
  const { user } = useAuth();
  
  // Check maritime rank confirmation requirements for optional toast
  const { needsConfirmation: needsRankConfirmation, handleRankConfirmed } = useMaritimeRankConfirmation();

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

  // No longer blocking access - toast will show optionally

  return (
    <div className="h-screen relative">
      <RankGroupsPanel />
      
      {/* Optional Maritime Rank Toast - non-blocking */}
      {needsRankConfirmation && (
        <MaritimeRankToast
          userId={user.id}
          currentRank={user.maritimeRank}
          onConfirm={handleRankConfirmed}
        />
      )}
    </div>
  );
}