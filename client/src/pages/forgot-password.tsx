import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("code");
        toast({
          title: "Reset Code Sent!",
          description: "Please check your email for the password reset code.",
        });
      } else {
        toast({
          title: "Reset Request Failed",
          description: data.message || "Failed to send reset code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast({
        title: "Connection Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset Successful!",
          description: "You can now login with your new password.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Password Reset Failed",
          description: data.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Connection Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleRequestReset} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            className="h-12 pl-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            required
            data-testid="input-reset-email"
          />
        </div>
        <p className="text-xs text-gray-500">
          We'll send a 6-digit reset code to this email address.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !email}
        className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold"
        data-testid="button-request-reset"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Sending Reset Code...
          </div>
        ) : (
          "Send Reset Code"
        )}
      </Button>
    </form>
  );

  const renderCodeStep = () => (
    <form onSubmit={() => setStep("reset")} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
        <p className="text-sm text-gray-600">
          We've sent a 6-digit reset code to <strong>{email}</strong>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resetCode" className="text-sm font-medium text-gray-700">
          Reset Code
        </Label>
        <Input
          id="resetCode"
          type="text"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit code"
          className="h-12 text-center text-lg font-mono border-gray-300 focus:border-orange-500 focus:ring-orange-500"
          maxLength={6}
          required
          data-testid="input-reset-code"
        />
        <p className="text-xs text-gray-500">
          Code expires in 15 minutes. Check your spam folder if you don't see it.
        </p>
      </div>

      <Button
        type="submit"
        disabled={resetCode.length !== 6}
        className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold"
        data-testid="button-verify-code"
      >
        Verify Code
      </Button>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          className="text-sm text-gray-600 hover:text-gray-800"
          onClick={() => handleRequestReset({ preventDefault: () => {} } as React.FormEvent)}
          disabled={loading}
          data-testid="button-resend-code"
        >
          Didn't receive the code? Resend
        </Button>
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Password</h2>
        <p className="text-sm text-gray-600">
          Your reset code is verified. Choose a strong new password.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
            New Password
          </Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            required
            data-testid="input-new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            required
            data-testid="input-confirm-password"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !newPassword || !confirmPassword}
        className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold"
        data-testid="button-reset-password"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Resetting Password...
          </div>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img src={qaaqLogoPath} alt="QAAQ" className="w-14 h-14" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === "email" ? "Forgot Password?" : 
             step === "code" ? "Enter Reset Code" : 
             "Set New Password"}
          </h1>
          <p className="text-gray-600 text-sm">
            {step === "email" ? "Don't worry, we'll help you reset it." :
             step === "code" ? "We've sent you a verification code." :
             "You're almost done!"}
          </p>
        </div>

        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          className="mb-6 p-2 -ml-2 text-gray-600 hover:text-gray-800"
          onClick={() => {
            if (step === "code") setStep("email");
            else if (step === "reset") setStep("code");
            else navigate("/login");
          }}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === "email" ? "Back to Login" : "Back"}
        </Button>

        {/* Step Content */}
        {step === "email" && renderEmailStep()}
        {step === "code" && renderCodeStep()}
        {step === "reset" && renderResetStep()}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Remember your password?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-xs text-orange-600 hover:text-orange-700"
              onClick={() => navigate("/login")}
              data-testid="link-back-to-login"
            >
              Sign in instead
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}