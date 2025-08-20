import { RankGroupsPanel } from "@/components/rank-groups-panel";
import { useAuth } from "@/hooks/useAuth";
import { useMaritimeRankConfirmation } from "@/hooks/useMaritimeRankConfirmation";
import { MaritimeRankConfirmationModal } from "@/components/MaritimeRankConfirmationModal";

export default function RankGroupsPage() {
  const { user } = useAuth();
  
  // Check maritime rank confirmation requirements for rank groups access
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

  // Show maritime rank confirmation modal if needed
  if (needsRankConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please confirm your maritime rank to access rank groups.</p>
            </div>
          </div>
        </div>
        <MaritimeRankConfirmationModal
          isOpen={needsRankConfirmation}
          userId={user.id}
          currentRank={user.maritimeRank}
          onConfirm={handleRankConfirmed}
        />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <RankGroupsPanel />
    </div>
  );
}