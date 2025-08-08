import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";

interface VerifyProps {
  onSuccess: (user: User) => void;
}

export default function Verify({ onSuccess }: VerifyProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      setLocation('/register');
    }
  }, [setLocation]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.verify(email, code);
      
      if (result.token) {
        setStoredToken(result.token);
        setStoredUser(result.user);
        onSuccess(result.user);
      }
      
      setLocation("/discover");
      toast({
        title: "Verified! 🎉",
        description: "Welcome to QaaqConnect",
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please check your code and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      await authApi.login(email);
      toast({
        title: "Code sent",
        description: "Check your email for a new verification code",
      });
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md maritime-shadow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-envelope text-2xl text-white"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Check Your Email
          </CardTitle>
          <p className="text-gray-600">
            We sent a 6-digit verification code to<br />
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full gradient-bg text-white hover:shadow-lg transition-all transform hover:scale-[1.02]"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : null}
            Verify Email 🚀
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="link"
              onClick={resendCode}
              className="ocean-teal font-medium p-0"
            >
              Send new code
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setLocation('/register')}
              className="text-gray-500 text-sm p-0"
            >
              ← Back to registration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
