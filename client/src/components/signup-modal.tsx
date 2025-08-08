import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Mail, Smartphone, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { setStoredToken, setStoredUser, type User } from "@/lib/auth";

interface SignUpModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function SignUpModal({ onClose, onSuccess }: SignUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'verify-otp' | 'success'>('signup');
  const [formData, setFormData] = useState({
    whatsappNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    otpCode: ''
  });
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [otpSent, setOtpSent] = useState(false);

  const validateBasicForm = (): boolean => {
    const validationErrors: string[] = [];

    // WhatsApp number validation
    if (!formData.whatsappNumber) {
      validationErrors.push('WhatsApp number is required');
    } else if (!/^\+\d{10,15}$/.test(formData.whatsappNumber)) {
      validationErrors.push('WhatsApp number must be in format +919xxxxxxxxx');
    }

    // Optional email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push('Please enter a valid email address');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // OTP validation
    if (step === 'verify-otp' && !formData.otpCode) {
      validationErrors.push('OTP code is required');
    } else if (step === 'verify-otp' && formData.otpCode.length !== 6) {
      validationErrors.push('OTP code must be 6 digits');
    }

    // Email validation
    if (!formData.email) {
      validationErrors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push('Please enter a valid email address');
    }

    // Password validation
    if (!formData.password) {
      validationErrors.push('Password is required');
    } else if (formData.password.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    } else if (formData.password === '1234koihai') {
      validationErrors.push('Cannot use "1234koihai" as password');
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    // Full name (optional but recommended)
    if (!formData.fullName.trim()) {
      validationErrors.push('Full name is recommended for better networking');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateBasicForm()) return;

    setLoading(true);
    setResult(null);
    setErrors([]);

    try {
      // Send OTP to WhatsApp number and email (if provided)
      const response = await fetch('/api/auth/send-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber: formData.whatsappNumber,
          email: formData.email || undefined // Include email if user entered it
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setOtpSent(true);
        setStep('verify-otp');
        setErrors([]);
      } else {
        setErrors([data.message || 'Failed to send OTP']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Network error']);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setResult(null);
    setErrors([]);

    try {
      // Verify OTP and create account
      const response = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber: formData.whatsappNumber,
          otpCode: formData.otpCode,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName.trim() || `User ${formData.whatsappNumber}`,
          userType: 'local'
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.user && data.token) {
        // Store authentication data
        setStoredToken(data.token);
        setStoredUser(data.user);
        
        setStep('success');
        setTimeout(() => {
          onSuccess(data.user);
        }, 2000);
      } else {
        setErrors([data.message || 'Failed to create account']);
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
            <UserPlus className="w-5 h-5 text-orange-600" />
            Join QaaqConnect
          </DialogTitle>
        </DialogHeader>

        {step === 'signup' && (
          <Card>
            <CardHeader>
              <CardDescription>
                Quick onboarding for maritime professionals. Connect with sailors worldwide.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+919029010070"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sailor@example.com"
                />
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name for networking"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
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
                onClick={handleSendOTP} 
                disabled={loading || !formData.whatsappNumber}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Smartphone className="w-4 h-4 mr-2 animate-pulse" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Send WhatsApp OTP
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'verify-otp' && (
          <Card>
            <CardHeader>
              <CardDescription>
                Enter the 6-digit OTP sent to your WhatsApp number and complete your account setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  OTP sent to {formData.whatsappNumber}. Check your WhatsApp for the 6-digit code.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="otpCode" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  6-Digit OTP Code
                </Label>
                <Input
                  id="otpCode"
                  value={formData.otpCode}
                  onChange={(e) => setFormData({ ...formData, otpCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sailor@example.com"
                />
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name for networking"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
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
                  onClick={() => setStep('signup')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyOTPAndSignUp} 
                  disabled={loading || !formData.otpCode || !formData.email || !formData.password}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
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
                  Welcome to QaaqConnect! Your account has been created successfully. 
                  Redirecting to discovery page...
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card className="bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-sm text-orange-900">
              <h4 className="font-medium mb-2">Why Join QaaqConnect:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Connect with maritime professionals worldwide</li>
                <li>Discover sailors and locals in any port</li>
                <li>Share experiences and maritime knowledge</li>
                <li>Access QAAQ Store for maritime essentials</li>
                <li>Get help from QBOT AI assistant</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}