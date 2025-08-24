import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Verify from "@/pages/verify";
import Discover from "@/pages/discover";
import Post from "@/pages/post";
import Admin from "@/pages/admin";
import BotRulesAdmin from "@/pages/admin/bot-rules";
import TokenLimitsAdmin from "@/pages/admin/token-limits";

import DMPage from "@/pages/dm";
import Chat1v1Page from "@/pages/Chat1v1Page";
import UserProfile from "@/pages/user-profile";
import Profile from "@/pages/profile";
import MyQuestions from "@/pages/my-questions";
import QuestionPage from "@/pages/question";
import QuestionBank from "@/pages/question-bank";
import RankGroupsPage from "@/pages/rank-groups";
import QBOTPage from "@/pages/qbot";
import MergeAccountsPage from "@/pages/merge-accounts";
import AuthTestPage from "@/pages/auth-test";
import SetPasswordPage from "@/pages/set-password";
import PasswordDemoPage from "@/pages/password-demo";
import OAuthCallback from "@/pages/oauth-callback";
import TopQProfessionalsPage from "@/pages/TopQProfessionalsPage";
import { GlossaryPage } from "@/pages/glossary";
import MachineTreePage from "@/pages/machine-tree";
import SemmEquipmentPage from "@/pages/semm-equipment";
import SemmSystemPage from "@/pages/semm-system";
import SemmMakePage from "@/pages/semm-make";
import SemmModelPage from "@/pages/semm-model";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import PremiumPage from "@/pages/premium";
import PremiumStatusPage from "@/pages/premium-status";
import PremiumSetupPage from "@/pages/premium-setup";

import NotFound from "@/pages/not-found";
import BottomNav from "@/components/bottom-nav";
import { PasswordCreationModal } from "@/components/PasswordCreationModal";
import { usePasswordCheck } from "@/hooks/usePasswordCheck";
import { getStoredToken, getStoredUser, type User } from "@/lib/auth";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check password requirements for logged-in users
  const { showPasswordModal, isRenewal, closeModal } = usePasswordCheck(user?.id);

  useEffect(() => {
    const checkAuth = async () => {
      // First check for QAAQ JWT token
      const token = getStoredToken();
      const storedUser = getStoredUser();
      
      if (token && storedUser) {
        setUser(storedUser);
        setLoading(false);
        return;
      }
      
      // Then check for Replit Auth session
      try {
        console.log('🔍 Checking Replit Auth session...');
        
        const response = await fetch('/api/auth/user', {
          credentials: 'include', // Important for session cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('🔍 Auth check response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ Auth check successful:', userData.fullName);
          
          if (userData) {
            // Convert to our User format
            const user: User = {
              id: userData.id,
              fullName: userData.fullName || userData.email || 'User',
              email: userData.email,
              userType: userData.userType || 'sailor',
              isAdmin: userData.isAdmin || false,
              nickname: userData.nickname,
              isVerified: true, // Authenticated users are verified
              loginCount: userData.loginCount || 0,
              maritimeRank: userData.maritimeRank
            };
            
            setUser(user);
            setLoading(false);
            return;
          }
        } else {
          console.log('❌ Auth check failed with status:', response.status);
        }
      } catch (error) {
        console.log('❌ Auth check error:', error);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleLogout = () => {
    // Clear QAAQ tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('qaaq_user');
    
    // Also handle Replit Auth logout
    setUser(null);
    
    // If it's a Replit user, redirect to Replit logout
    if (user && user.id && !getStoredToken()) {
      window.location.href = '/api/logout';
      return;
    }
    
    // For QAAQ users, just refresh the page
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-navy to-ocean-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-anchor text-2xl text-white"></i>
          </div>
          <p className="text-maritime-grey">Loading QaaqConnect...</p>
        </div>
      </div>
    );
  }

  // Allow access without user requirements
  const currentUser = user;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={currentUser ? "pb-16" : ""}>
        <Switch>
          <Route path="/" component={() => {
            console.log('🏠 Root route - Current user:', currentUser ? currentUser.fullName : 'None');
            return currentUser ? <QBOTPage user={currentUser} /> : <Login onSuccess={setUser} />;
          }} />
          <Route path="/login" component={() => <Login onSuccess={setUser} />} />
          <Route path="/register" component={() => <Register onSuccess={setUser} />} />
          <Route path="/verify" component={() => <Verify onSuccess={setUser} />} />
          <Route path="/oauth-callback" component={() => <OAuthCallback />} />
          <Route path="/discover" component={() => currentUser ? <Discover user={currentUser} /> : <Login onSuccess={setUser} />} />
          <Route path="/qbot" component={() => {
            console.log('🤖 QBOT route - Current user:', currentUser ? currentUser.fullName : 'None');
            if (!currentUser && !loading) {
              console.log('❌ QBOT route - No user found, redirecting to login');
            }
            return currentUser ? <QBOTPage user={currentUser} /> : <Login onSuccess={setUser} />;
          }} />
          <Route path="/post" component={() => currentUser ? <Post user={currentUser} /> : <Login onSuccess={setUser} />} />

          <Route path="/chat/:connectionId" component={() => <Chat1v1Page />} />
          <Route path="/dm" component={() => <DMPage />} />
          <Route path="/qhf" component={() => <DMPage />} />
          <Route path="/user/:userId" component={() => <UserProfile />} />
          <Route path="/user-profile/:userId" component={() => <UserProfile />} />
          <Route path="/profile" component={() => <Profile />} />
          <Route path="/my-questions" component={() => <MyQuestions />} />
          <Route path="/question-bank" component={() => <QuestionBank />} />
          <Route path="/share/question/:id" component={() => <QuestionPage />} />
          <Route path="/questions/:id" component={() => <QuestionPage />} />
          <Route path="/rank-groups" component={() => <RankGroupsPage />} />
          <Route path="/admin" component={() => <Admin />} />
          <Route path="/admin/bot-rules" component={() => <BotRulesAdmin />} />
          <Route path="/admin/token-limits" component={() => <TokenLimitsAdmin />} />
          <Route path="/merge-accounts/:sessionId" component={MergeAccountsPage} />
          <Route path="/auth-test" component={AuthTestPage} />
          <Route path="/set-password" component={SetPasswordPage} />
          <Route path="/password-demo" component={PasswordDemoPage} />
          <Route path="/top-professionals" component={TopQProfessionalsPage} />
          <Route path="/qh13" component={TopQProfessionalsPage} />
          <Route path="/glossary" component={() => <GlossaryPage />} />
          <Route path="/machinetree" component={() => <MachineTreePage />} />
          <Route path="/machine-tree" component={() => <MachineTreePage />} />
          <Route path="/machinetree/:code" component={({ params }: any) => {
            const code = params.code;
            // Determine page type based on code length
            if (code.length === 1) return <SemmSystemPage />;
            if (code.length === 2) return <SemmEquipmentPage />;
            if (code.length === 3) return <SemmMakePage />;
            if (code.length === 4) return <SemmModelPage />;
            return <SemmEquipmentPage />;
          }} />
          <Route path="/privacy-policy" component={() => <PrivacyPolicyPage />} />
          <Route path="/premium" component={() => currentUser ? <PremiumPage /> : <Login onSuccess={setUser} />} />
          <Route path="/premium-status" component={() => currentUser ? <PremiumStatusPage /> : <Login onSuccess={setUser} />} />
          <Route path="/premium-setup" component={() => <PremiumSetupPage />} />
          <Route path="/home-old" component={() => <Login onSuccess={setUser} />} />

          <Route component={NotFound} />
        </Switch>
      </div>
      
      {currentUser && <BottomNav user={currentUser} onLogout={handleLogout} />}
      
      {/* Mandatory Password Creation Modal */}
      {showPasswordModal && user && (
        <PasswordCreationModal
          isOpen={showPasswordModal}
          onClose={closeModal}
          userId={user.id}
          isRenewal={isRenewal}
        />
      )}
      
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
