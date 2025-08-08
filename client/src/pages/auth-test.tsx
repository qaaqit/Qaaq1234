import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Users, Crown, Ship } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function AuthTestPage() {
  const [userId, setUserId] = useState('+919035283755');
  const [password, setPassword] = useState('1234koihai');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testRobustAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // Store the token for testing
        localStorage.setItem('qaaq_token_test', data.token);
        localStorage.setItem('qaaq_user_test', JSON.stringify(data.user));
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testConnections = async () => {
    const token = localStorage.getItem('qaaq_token_test');
    if (!token) {
      alert('Please login first to get a token');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/chat/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setResult({ connectionsTest: data });
    } catch (error) {
      setResult({ connectionsError: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔐 Robust Authentication System Test</CardTitle>
            <CardDescription>Test the new authentication system with duplicate detection and account merging</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">User ID</label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Phone, email, or username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={testRobustAuth} disabled={loading} className="flex-1">
                {loading ? 'Testing...' : 'Test Robust Authentication'}
              </Button>
              <Button onClick={testConnections} variant="outline" disabled={loading}>
                Test Active Connections
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Authentication Successful
                  </>
                ) : result.requiresMerge ? (
                  <>
                    <Users className="w-5 h-5 text-orange-500" />
                    Account Merge Required
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Authentication Result
                  </>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {result.success && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Login successful! User authenticated with ID: <strong>{result.user.id}</strong>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">User Details:</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {result.user.fullName}</div>
                      <div><strong>Email:</strong> {result.user.email}</div>
                      <div><strong>Type:</strong> {result.user.userType}</div>
                      {result.user.isAdmin && <Badge variant="default">Admin</Badge>}
                      {result.user.questionCount > 0 && (
                        <div><strong>Q&A Activity:</strong> {result.user.questionCount} questions, {result.user.answerCount} answers</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-medium text-blue-900">JWT Token Preview:</h5>
                    <code className="text-xs text-blue-700 break-all">
                      {result.token?.substring(0, 100)}...
                    </code>
                  </div>
                </div>
              )}
              
              {result.requiresMerge && (
                <div className="space-y-3">
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      Multiple accounts found! {result.duplicateAccounts?.length} accounts need to be merged.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    {result.duplicateAccounts?.map((account: any, index: number) => (
                      <div key={account.id} className="bg-white p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold">{account.fullName}</h5>
                          {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>ID: {account.id}</div>
                          <div>Email: {account.email}</div>
                          <div>Questions: {account.questionCount}</div>
                          <div>Completeness: {account.completeness}%</div>
                          <Badge variant="outline">{account.source}</Badge>
                        </div>
                        {account.recommendation && (
                          <div className="mt-2 text-xs font-medium text-green-600">
                            {account.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => window.open(`/merge-accounts/${result.mergeSessionId}`, '_blank')}
                    className="w-full"
                  >
                    Open Merge Interface
                  </Button>
                </div>
              )}
              
              {result.connectionsTest && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Active Connections API Test: {Array.isArray(result.connectionsTest) ? result.connectionsTest.length : 0} connections found
                    </AlertDescription>
                  </Alert>
                  
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.connectionsTest, null, 2)}
                  </pre>
                </div>
              )}
              
              {(result.error || result.connectionsError) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {result.error || result.connectionsError}
                  </AlertDescription>
                </Alert>
              )}
              
              <details className="bg-gray-50 p-3 rounded-lg">
                <summary className="cursor-pointer font-medium">Raw Response</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-60">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Test Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setUserId('+919035283755'); setPassword('1234koihai'); }}
              >
                Chiru
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setUserId('919035283755'); setPassword('1234koihai'); }}
              >
                Chiru (No +)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setUserId('pg97@rediffmail.com'); setPassword('1234koihai'); }}
              >
                Chiru Email
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setUserId('mushy.piyush@gmail.com'); setPassword('1234koihai'); }}
              >
                Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}