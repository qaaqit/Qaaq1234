import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Lock, Clock } from "lucide-react";

interface PasswordCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isRenewal?: boolean; // true if this is a 12-month renewal, false for first-time creation
}

export function PasswordCreationModal({ isOpen, onClose, userId, isRenewal = false }: PasswordCreationModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const createPasswordMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create password' }));
        throw new Error(errorData.message || 'Failed to create password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isRenewal ? "Password Renewed" : "Password Created",
        description: isRenewal 
          ? "Your password has been successfully renewed for the next 12 months."
          : "Your secure password has been created successfully.",
        variant: "default",
      });
      onClose();
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    createPasswordMutation.mutate({ password });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {isRenewal ? (
              <>
                <Clock className="w-5 h-5 text-orange-500" />
                Password Renewal Required
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-orange-500" />
                Create Your Secure Password
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isRenewal ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">12-Month Password Renewal</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    For your security, please create a new password. This is required every 12 months to keep your account secure.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Mandatory Password Creation</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    To secure your QAAQ account, you must create a password. This will be required for future logins.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "🙈"}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Minimum 6 characters required
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={createPasswordMutation.isPending}
              >
                {createPasswordMutation.isPending ? (
                  "Creating..."
                ) : isRenewal ? (
                  "Renew Password"
                ) : (
                  "Create Password"
                )}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {isRenewal 
                ? "You cannot access the platform until your password is renewed."
                : "You cannot access the platform until you create a password."
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}