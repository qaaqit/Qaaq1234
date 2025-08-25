import { RankGroupsPanel } from "@/components/rank-groups-panel";
import { useAuth } from "@/contexts/AuthContext";

export default function RankGroupsPage() {
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
    <div className="h-screen relative">
      <RankGroupsPanel />
    </div>
  );
}