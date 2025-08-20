// DISABLED FOR TESTING STABILITY - no auth requests
// import { RankGroupsPanel } from "@/components/rank-groups-panel";
// import { useAuth } from "@/hooks/useAuth";

export default function RankGroupsPage() {
  // DISABLED FOR TESTING STABILITY
  // const { user } = useAuth();

  // Return early - feature disabled
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-orange-600">Rank Groups Temporarily Disabled</h2>
            <p className="text-gray-600">This feature is temporarily disabled for system stability testing.</p>
            <p className="text-sm text-gray-500 mt-2">QRadar discovery system is now available for stable testing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}