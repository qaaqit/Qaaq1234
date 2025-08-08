import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertTriangle, Shield, Key, Users, ArrowRight } from 'lucide-react';

export default function PasswordDemoPage() {
  const [demoResult, setDemoResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const runCompleteDemo = async () => {
    setLoading(true);
    setDemoResult(null);
    
    const results = [];
    const testUser = '+919029010070'; // Piyush Gupta
    
    try {
      // Step 1: Reset user for clean demo (in production, this wouldn't exist)
      setCurrentStep('Preparing demo environment...');
      
      // Step 2: First liberal login
      setCurrentStep('Testing first-time liberal login...');
      const firstLoginResponse = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser, password: '1234koihai' })
      });
      const firstLogin = await firstLoginResponse.json();
      results.push({
        step: 'First Liberal Login',
        input: { userId: testUser, password: '1234koihai' },
        result: firstLogin,
        expected: 'Success with requiresPasswordSetup: true'
      });

      if (!firstLogin.success || !firstLogin.requiresPasswordSetup) {
        // User already has password set, let's test with different scenario
        results.push({
          step: 'Note',
          result: { message: 'User already has password set - testing existing password flow' },
          expected: 'Different flow for users with existing passwords'
        });
      }

      // Step 3: Set password
      setCurrentStep('Setting custom password...');
      const setPasswordResponse = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser, newPassword: 'demo123456' })
      });
      const setPassword = await setPasswordResponse.json();
      results.push({
        step: 'Set Password',
        input: { userId: testUser, newPassword: 'demo123456' },
        result: setPassword,
        expected: 'Success message'
      });

      // Step 4: Try liberal login again (should fail)
      setCurrentStep('Testing liberal login after password set...');
      const liberalRetryResponse = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser, password: '1234koihai' })
      });
      const liberalRetry = await liberalRetryResponse.json();
      results.push({
        step: 'Liberal Login Retry',
        input: { userId: testUser, password: '1234koihai' },
        result: liberalRetry,
        expected: 'Should fail - liberal password already used'
      });

      // Step 5: Login with custom password
      setCurrentStep('Testing custom password login...');
      const customLoginResponse = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser, password: 'demo123456' })
      });
      const customLogin = await customLoginResponse.json();
      results.push({
        step: 'Custom Password Login',
        input: { userId: testUser, password: 'demo123456' },
        result: customLogin,
        expected: 'Success with requiresPasswordSetup: false'
      });

      // Step 6: Test wrong password
      setCurrentStep('Testing wrong password...');
      const wrongPasswordResponse = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser, password: 'wrongpassword' })
      });
      const wrongPassword = await wrongPasswordResponse.json();
      results.push({
        step: 'Wrong Password Test',
        input: { userId: testUser, password: 'wrongpassword' },
        result: wrongPassword,
        expected: 'Should fail with invalid credentials'
      });

      setDemoResult({
        success: true,
        message: 'Complete password management demonstration completed!',
        results
      });

    } catch (error) {
      setDemoResult({
        success: false,
        message: error instanceof Error ? error.message : 'Demo failed',
        results
      });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const getStatusBadge = (result: any, expected: string) => {
    const isSuccess = result.success || result.message?.includes('success');
    const expectedSuccess = expected.includes('Success') || expected.includes('success');
    const expectedFail = expected.includes('fail') || expected.includes('Should fail');
    
    if ((isSuccess && expectedSuccess) || (!isSuccess && expectedFail)) {
      return <Badge className="bg-green-100 text-green-800">✓ Expected</Badge>;
    } else if (isSuccess && expectedFail) {
      return <Badge variant="destructive">✗ Unexpected Success</Badge>;
    } else if (!isSuccess && expectedSuccess) {
      return <Badge variant="destructive">✗ Unexpected Failure</Badge>;
    } else {
      return <Badge variant="secondary">~ Partial</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Password Management System Demo</CardTitle>
            <CardDescription>
              Complete demonstration of individual password functionality with liberal authentication framework
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center">
            <Button 
              onClick={runCompleteDemo} 
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Key className="w-5 h-5 mr-2 animate-spin" />
                  Running Demo... {currentStep}
                </>
              ) : (
                <>
                  <Key className="w-5 h-5 mr-2" />
                  Run Complete Demo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Password Management Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700">✅ Implemented Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Individual password management per user</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Liberal password "1234koihai" works only once</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Password setup prompt after first liberal login</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Custom password validation and enforcement</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Memory-based storage (database compatible)</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Liberal login count tracking</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700">🔄 Authentication Flow</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs mr-2">1</div>
                    Liberal login with "1234koihai"
                  </div>
                  <div className="flex items-center">
                    <ArrowRight className="w-4 h-4 mx-1 text-gray-400" />
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs mr-2">2</div>
                    Prompt to set custom password
                  </div>
                  <div className="flex items-center">
                    <ArrowRight className="w-4 h-4 mx-1 text-gray-400" />
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs mr-2">3</div>
                    Future logins use custom password only
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Results */}
        {demoResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {demoResult.success ? (
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                )}
                Demo Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={demoResult.success ? '' : 'border-red-200 bg-red-50'}>
                <AlertDescription className="text-base">
                  {demoResult.message}
                </AlertDescription>
              </Alert>

              {demoResult.results && (
                <div className="mt-6 space-y-4">
                  {demoResult.results.map((test: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">{test.step}</h4>
                          {getStatusBadge(test.result, test.expected)}
                        </div>
                        
                        {test.input && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-600 mb-1">Input:</p>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {JSON.stringify(test.input, null, 2)}
                            </code>
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600 mb-1">Result:</p>
                          <Alert className={test.result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                            <AlertDescription>
                              <strong>Message:</strong> {test.result.message}
                              {test.result.requiresPasswordSetup !== undefined && (
                                <><br /><strong>Requires Password Setup:</strong> {test.result.requiresPasswordSetup ? 'Yes' : 'No'}</>
                              )}
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <strong>Expected:</strong> {test.expected}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}