import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Anchor, Shield, AlertCircle, ChevronUp, ChevronDown, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MaritimeRankToastProps {
  userId: string;
  currentRank?: string;
  onConfirm: (rank: string) => void;
}

const maritimeRanks = [
  { value: "captain", label: "Captain", description: "Ship Master and commanding officer" },
  { value: "chief_officer", label: "Chief Officer", description: "First Mate and second in command" },
  { value: "second_officer", label: "2nd Officer", description: "Navigation and watch keeping officer" },
  { value: "third_officer", label: "3rd Officer", description: "Junior deck officer and watch keeper" },
  { value: "chief_engineer", label: "Chief Engineer", description: "Senior engine room officer" },
  { value: "second_engineer", label: "2nd Engineer", description: "Senior engine room officer" },
  { value: "third_engineer", label: "3rd Engineer", description: "Junior engine room officer" },
  { value: "fourth_engineer", label: "4th Engineer", description: "Junior engine room officer" },
  { value: "cadet", label: "Maritime Cadet", description: "Trainee and maritime academy student" },
  { value: "crew", label: "Ship Crew", description: "Deck and engine room crew member" },
  { value: "marine_superintendent", label: "Marine Superintendent", description: "Shore-based marine operations manager" },
  { value: "technical_superintendent", label: "Technical Superintendent", description: "Shore-based technical manager" },
  { value: "fleet_manager", label: "Fleet Manager", description: "Ship fleet management professional" },
  { value: "eto", label: "ETO/Elec Superintendent", description: "Electro Technical Officer" },
  { value: "other_maritime", label: "Other Maritime Professional", description: "General maritime personnel" }
];

export function MaritimeRankToast({ userId, currentRank, onConfirm }: MaritimeRankToastProps) {
  const [selectedRank, setSelectedRank] = useState<string>(currentRank || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!selectedRank) {
      toast({
        title: "Maritime Rank Required",
        description: "Please select your maritime rank to continue",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Starting maritime rank confirmation:', { userId, selectedRank });
    setIsSubmitting(true);
    try {
      console.log('📡 Making API call to confirm maritime rank...');
      const response = await apiRequest('/api/user/confirm-maritime-rank', 'POST', {
        userId,
        maritimeRank: selectedRank
      });
      console.log('✅ Maritime rank API call successful:', response);
      
      toast({
        title: "Maritime Rank Confirmed",
        description: "Your maritime rank has been updated successfully",
      });
      
      onConfirm(selectedRank);
      setIsDismissed(true);
    } catch (error: any) {
      console.error('❌ Error confirming maritime rank:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: error.message || "Failed to confirm maritime rank. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Minimized state - just a small floating button
  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-orange-500 text-white shadow-lg border-orange-200 hover:bg-orange-600"
          data-testid="expand-rank-toast"
        >
          <Anchor className="h-4 w-4 mr-2" />
          Set Maritime Rank
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Full toast state
  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Card className="shadow-2xl border-orange-200 bg-white">
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Anchor className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-800">
                  Maritime Rank
                </CardTitle>
                <p className="text-sm text-gray-600">Optional - Set at your convenience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Minimize button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600 p-1"
                data-testid="minimize-rank-toast"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              
              {/* Dismiss button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-1"
                data-testid="dismiss-rank-toast"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Help us connect you with the right maritime professionals by confirming your rank.
            </p>
          </div>

          {/* Current rank display */}
          {currentRank && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current rank:</p>
              <Badge variant="outline" className="text-sm">
                {maritimeRanks.find(r => r.value === currentRank)?.label || currentRank}
              </Badge>
            </div>
          )}

          {/* Rank selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Confirm or update your maritime rank:
            </label>
            <Select value={selectedRank} onValueChange={setSelectedRank}>
              <SelectTrigger className="w-full" data-testid="select-maritime-rank">
                <SelectValue placeholder="Select your maritime rank" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {maritimeRanks.map((rank) => (
                  <SelectItem key={rank.value} value={rank.value} className="py-2">
                    <div>
                      <div className="font-medium">{rank.label}</div>
                      <div className="text-xs text-gray-500">{rank.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedRank}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-confirm-rank"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Confirming...
                </div>
              ) : (
                "Confirm Rank"
              )}
            </Button>

            <Button
              onClick={handleDismiss}
              variant="outline"
              className="px-6"
              data-testid="button-skip-rank"
            >
              Skip
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can update your rank later in your profile settings if it changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}