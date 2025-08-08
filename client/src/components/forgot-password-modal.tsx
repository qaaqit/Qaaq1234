import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Smartphone, Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordModal({ onClose, onSuccess }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleRequestReset = async () => {
    if (!formData.userId) {
      setErrors(['User ID is required']);
      return;
    }

    setLoading(true);
    setResult(null);
    setErrors([]);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: formData.userId })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setStep('verify');
      } else {
        setErrors([data.message || 'Failed to send reset code']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Network error']);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    const validationErrors: string[] = [];

    if (!formData.resetCode) {
      validationErrors.push('Reset code is required');
    }

    if (!formData.newPassword) {
      validationErrors.push('New password is required');
    } else if (formData.newPassword.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    } else if (formData.newPassword === '1234koihai') {
      validationErrors.push('Cannot use the liberal login password');
    }

    if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setResult(null);
    setErrors([]);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId,
          resetCode: formData.resetCode,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setErrors([data.message || 'Failed to reset password']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Network error']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            Reset Password via WhatsApp
          </DialogTitle>
        </DialogHeader>

        {step === 'request' && (
          <Card>
            <CardHeader>
              <CardDescription>
                Enter your User ID to receive a password reset code on your WhatsApp number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID (WhatsApp Number)</Label>
                <Input
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="e.g., +919029010070"
                />
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleRequestReset} 
                disabled={loading || !formData.userId}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Smartphone className="w-4 h-4 mr-2 animate-pulse" />
                    Sending Reset Code...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Send Reset Code to WhatsApp
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'verify' && (
          <Card>
            <CardHeader>
              <CardDescription>
                Check your WhatsApp for a 6-digit reset code and enter it below with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Reset code sent to {formData.userId}. Code expires in 15 minutes.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="resetCode">6-Digit Reset Code</Label>
                <Input
                  id="resetCode"
                  value={formData.resetCode}
                  onChange={(e) => setFormData({ ...formData, resetCode: e.target.value })}
                  placeholder="Enter 6-digit code from WhatsApp"
                  maxLength={6}
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your new password"
                />
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setStep('request')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyAndReset} 
                  disabled={loading || !formData.resetCode || !formData.newPassword}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Shield className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Password reset successfully! You can now login with your new password.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-sm text-green-900">
              <h4 className="font-medium mb-2">How WhatsApp Reset Works:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter your User ID (WhatsApp number)</li>
                <li>Receive 6-digit code on WhatsApp</li>
                <li>Enter code and set new password</li>
                <li>Code expires in 15 minutes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}