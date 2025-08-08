import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SetPasswordProps {
  userId: string;
  onPasswordSet: () => void;
}

export default function SetPasswordPage() {
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Get user ID from localStorage or URL params
    const storedUser = localStorage.getItem('qaaq_user_test');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserId(user.id);
    }
  }, []);

  const validatePassword = (): boolean => {
    const validationErrors: string[] = [];

    if (!newPassword) {
      validationErrors.push('Password is required');
    } else if (newPassword.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    } else if (newPassword === '1234koihai') {
      validationErrors.push('Cannot use the liberal login password as your custom password');
    }

    if (newPassword !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Clear the password fields
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect to home or login after 2 seconds
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle>Set Your Password</CardTitle>
            <CardDescription>
              Create a secure password for your QAAQ account. This will replace the temporary login method.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">User ID</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                disabled={!!userId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            <Button 
              onClick={handleSetPassword} 
              disabled={loading || !userId || !newPassword || !confirmPassword}
              className="w-full"
            >
              {loading ? (
                <>
                  <Lock className="w-4 h-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Set Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardContent className="pt-6">
              {result.success ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {result.message} Redirecting to home page...
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {result.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-900">
              <h4 className="font-medium mb-2">Password Requirements:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Minimum 6 characters</li>
                <li>Cannot be "1234koihai"</li>
                <li>Must match confirmation</li>
                <li>Will replace liberal login access</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Component for inline password setup (can be used in modals)
export function PasswordSetupModal({ userId, onPasswordSet }: SetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validatePassword = (): boolean => {
    const validationErrors: string[] = [];

    if (!newPassword) {
      validationErrors.push('Password is required');
    } else if (newPassword.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    } else if (newPassword === '1234koihai') {
      validationErrors.push('Cannot use the liberal login password');
    }

    if (newPassword !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        onPasswordSet();
      } else {
        setErrors([data.message || 'Failed to set password']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Shield className="mx-auto w-12 h-12 text-orange-500 mb-3" />
        <h3 className="text-lg font-semibold">Set Your Password</h3>
        <p className="text-sm text-gray-600">
          Create a secure password for future logins
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
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
          onClick={handleSetPassword} 
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full"
        >
          {loading ? 'Setting Password...' : 'Set Password'}
        </Button>
      </div>
    </div>
  );
}