import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Users, Crown, Ship, MapPin, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DuplicateAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsAppNumber?: string;
  loginCount: number;
  lastLogin: Date;
  questionCount: number;
  answerCount: number;
  source: 'qaaq_main' | 'local_app' | 'whatsapp_bot';
  completeness: number;
  recommendation?: string;
}

interface MergeSession {
  id: string;
  accounts: DuplicateAccount[];
  expiresAt: Date;
}

export default function MergeAccountsPage() {
  const [match, params] = useRoute('/merge-accounts/:sessionId');
  const [session, setSession] = useState<MergeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (match && params?.sessionId) {
      fetchMergeSession(params.sessionId);
    }
  }, [match, params]);

  const fetchMergeSession = async (sessionId: string) => {
    try {
      const response = await apiRequest(`/api/auth/merge-session/${sessionId}`, {
        method: 'GET'
      });
      
      if (response.success) {
        setSession(response.session);
        // Auto-select the most complete account as primary
        const bestAccount = response.session.accounts[0];
        setSelectedPrimary(bestAccount.id);
        setSelectedDuplicates(response.session.accounts.slice(1).map((acc: DuplicateAccount) => acc.id));
      } else {
        setError(response.message || 'Failed to load merge session');
      }
    } catch (err) {
      setError('Failed to load merge session');
      console.error('Fetch session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeAccounts = async () => {
    if (!session || !selectedPrimary) return;
    
    setMerging(true);
    try {
      const response = await apiRequest('/api/auth/merge-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          primaryAccountId: selectedPrimary,
          duplicateAccountIds: selectedDuplicates,
          mergeStrategy: 'merge_data'
        })
      });

      if (response.success) {
        // Store token and user data
        localStorage.setItem('qaaq_token', response.token);
        localStorage.setItem('qaaq_user', JSON.stringify(response.user));
        
        // Redirect to home
        window.location.href = '/';
      } else {
        setError(response.message || 'Account merge failed');
      }
    } catch (err) {
      setError('Failed to merge accounts');
      console.error('Merge error:', err);
    } finally {
      setMerging(false);
    }
  };

  const handleSkipMerge = async (accountId: string) => {
    if (!session) return;
    
    setMerging(true);
    try {
      const response = await apiRequest('/api/auth/skip-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          selectedAccountId: accountId
        })
      });

      if (response.success) {
        localStorage.setItem('qaaq_token', response.token);
        localStorage.setItem('qaaq_user', JSON.stringify(response.user));
        window.location.href = '/';
      } else {
        setError(response.message || 'Failed to proceed with selected account');
      }
    } catch (err) {
      setError('Failed to proceed');
      console.error('Skip merge error:', err);
    } finally {
      setMerging(false);
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'qaaq_main': return 'default';
      case 'whatsapp_bot': return 'secondary';
      case 'local_app': return 'outline';
      default: return 'outline';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'qaaq_main': return <Ship className="w-4 h-4" />;
      case 'whatsapp_bot': return <MessageCircle className="w-4 h-4" />;
      case 'local_app': return <MapPin className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRecommendationColor = (recommendation?: string) => {
    if (!recommendation) return '';
    if (recommendation.includes('RECOMMENDED')) return 'text-green-600';
    if (recommendation.includes('ARCHIVE')) return 'text-red-600';
    if (recommendation.includes('MERGE')) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-600">Loading merge session...</p>
        </div>
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Session Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error || 'Merge session not found or expired.'}</p>
            <Button 
              className="w-full mt-4" 
              onClick={() => window.location.href = '/login'}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Multiple Accounts Found</h1>
          <p className="text-gray-600">We found {session.accounts.length} accounts that might be yours. Choose how to proceed:</p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This merge session expires in {Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 60000)} minutes.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {session.accounts.map((account, index) => (
            <Card 
              key={account.id}
              className={`relative transition-all duration-200 ${
                selectedPrimary === account.id ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:shadow-md'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{account.fullName}</CardTitle>
                  {index === 0 && (
                    <Crown className="w-5 h-5 text-yellow-500" title="Most Complete" />
                  )}
                </div>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(account.source)}
                    <Badge variant={getSourceBadgeVariant(account.source)}>
                      {account.source === 'qaaq_main' ? 'QAAQ Main' : 
                       account.source === 'whatsapp_bot' ? 'WhatsApp Bot' : 'Local App'}
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div><strong>Phone:</strong> {account.phone}</div>
                  {account.email && <div><strong>Email:</strong> {account.email}</div>}
                  {account.whatsAppNumber && <div><strong>WhatsApp:</strong> {account.whatsAppNumber}</div>}
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Questions: {account.questionCount}</span>
                  <span>Answers: {account.answerCount}</span>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Logins: {account.loginCount}</span>
                  <span>Complete: {account.completeness}%</span>
                </div>
                
                {account.recommendation && (
                  <p className={`text-sm font-medium ${getRecommendationColor(account.recommendation)}`}>
                    {account.recommendation}
                  </p>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <Button
                    variant={selectedPrimary === account.id ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedPrimary(account.id)}
                  >
                    {selectedPrimary === account.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Primary Account
                      </>
                    ) : (
                      'Set as Primary'
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSkipMerge(account.id)}
                    disabled={merging}
                  >
                    Use This Account Only
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Merge Options</h3>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Primary Account:</strong> {session.accounts.find(acc => acc.id === selectedPrimary)?.fullName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Accounts to merge:</strong> {selectedDuplicates.length} accounts will be merged into the primary account
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleMergeAccounts} 
              disabled={!selectedPrimary || merging}
              className="flex-1"
            >
              {merging ? 'Merging...' : 'Merge All Accounts'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/login'}
              disabled={merging}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}