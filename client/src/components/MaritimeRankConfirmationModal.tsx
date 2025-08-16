import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Anchor, Shield, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MaritimeRankConfirmationModalProps {
  isOpen: boolean;
  userId: string;
  currentRank?: string;
  onConfirm: (rank: string) => void;
  onClose?: () => void;
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

export function MaritimeRankConfirmationModal({ 
  isOpen, 
  userId, 
  currentRank, 
  onConfirm, 
  onClose 
}: MaritimeRankConfirmationModalProps) {
  const [selectedRank, setSelectedRank] = useState<string>(currentRank || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);
    try {
      await apiRequest('/api/user/confirm-maritime-rank', 'POST', {
        userId,
        maritimeRank: selectedRank
      });
      
      toast({
        title: "Maritime Rank Confirmed",
        description: "Your maritime rank has been updated successfully",
      });
      
      onConfirm(selectedRank);
    } catch (error: any) {
      console.error('Error confirming maritime rank:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm maritime rank. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRankData = maritimeRanks.find(rank => rank.value === selectedRank);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md mx-auto">
        <Card className="border-2 border-orange-400 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Anchor className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Confirm Maritime Rank
            </CardTitle>
            <DialogDescription className="text-gray-600 mt-2">
              To access QBOT and other features, please confirm your current maritime rank. This helps us provide relevant content and connect you with professionals in your field.
            </DialogDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Select Your Current Maritime Rank <span className="text-red-500">*</span>
              </label>
              
              <Select value={selectedRank} onValueChange={setSelectedRank}>
                <SelectTrigger className="w-full border-2 border-orange-200 focus:border-orange-400" data-testid="select-maritime-rank">
                  <SelectValue placeholder="Choose your maritime rank..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {maritimeRanks.map((rank) => (
                    <SelectItem key={rank.value} value={rank.value} data-testid={`rank-option-${rank.value}`}>
                      <span className="font-medium">{rank.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRankData && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Badge className="bg-orange-100 text-orange-800 mb-2">
                    {selectedRankData.label}
                  </Badge>
                  <p className="text-sm text-gray-600">{selectedRankData.description}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Why do we need this?</p>
                  <ul className="text-xs space-y-1">
                    <li>• Connect you with peers in your rank group</li>
                    <li>• Provide relevant maritime content and discussions</li>
                    <li>• Enable rank-specific features and networking</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!selectedRank || isSubmitting}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
              data-testid="button-confirm-rank"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Confirming...
                </div>
              ) : (
                "Confirm Maritime Rank"
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              You can update your rank later in your profile settings if it changes.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}