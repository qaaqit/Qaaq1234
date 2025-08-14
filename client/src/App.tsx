import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Verify from "@/pages/verify";
import Discover from "@/pages/discover";
import Post from "@/pages/post";
import Admin from "@/pages/admin";
import BotRulesAdmin from "@/pages/admin/bot-rules";
import ChatPage from "@/pages/chat";
import DMPage from "@/pages/dm";
import UserProfile from "@/pages/user-profile";
import Profile from "@/pages/profile";
import MyQuestions from "@/pages/my-questions";
import QuestionPage from "@/pages/question";
import RankGroupsPage from "@/pages/rank-groups";
import QBOTPage from "@/pages/qbot";
import MergeAccountsPage from "@/pages/merge-accounts";
import AuthTestPage from "@/pages/auth-test";
import SetPasswordPage from "@/pages/set-password";
import PasswordDemoPage from "@/pages/password-demo";
import OAuthCallback from "@/pages/oauth-callback";
import TopQProfessionalsPage from "@/pages/TopQProfessionalsPage";
import QH13Page from "@/pages/qh13";
import { GlossaryPage } from "@/pages/glossary";

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
        const response = await fetch('/api/auth/user', {
          credentials: 'include', // Important for session cookies
        });
        
        if (response.ok) {
          const replitUser = await response.json();
          if (replitUser) {
            // Convert Replit user to our User format
            const user: User = {
              id: replitUser.id,
              fullName: replitUser.fullName || replitUser.email,
              email: replitUser.email,
              userType: replitUser.userType || 'sailor',
              isAdmin: replitUser.isAdmin || false,
              nickname: replitUser.nickname,
              isVerified: true, // Replit users are always verified
              loginCount: replitUser.loginCount || 0
            };
            setUser(user);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('No Replit Auth session found');
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
          <Route path="/" component={() => currentUser ? <QBOTPage user={currentUser} /> : <Login onSuccess={setUser} />} />
          <Route path="/login" component={() => <Login onSuccess={setUser} />} />
          <Route path="/register" component={() => <Register onSuccess={setUser} />} />
          <Route path="/verify" component={() => <Verify onSuccess={setUser} />} />
          <Route path="/oauth-callback" component={() => <OAuthCallback />} />
          <Route path="/discover" component={() => currentUser ? <Discover user={currentUser} /> : <Login onSuccess={setUser} />} />
          <Route path="/qbot" component={() => currentUser ? <QBOTPage user={currentUser} /> : <Login onSuccess={setUser} />} />
          <Route path="/post" component={() => currentUser ? <Post user={currentUser} /> : <Login onSuccess={setUser} />} />
          <Route path="/chat" component={() => <ChatPage />} />
          <Route path="/chat/:userId" component={() => <DMPage />} />
          <Route path="/dm" component={() => <DMPage />} />
          <Route path="/qhf" component={() => <DMPage />} />
          <Route path="/user/:userId" component={() => <UserProfile />} />
          <Route path="/user-profile/:userId" component={() => <UserProfile />} />
          <Route path="/profile" component={() => <Profile />} />
          <Route path="/my-questions" component={() => <MyQuestions />} />
          <Route path="/share/question/:id" component={() => <QuestionPage />} />
          <Route path="/questions/:id" component={() => <QuestionPage />} />
          <Route path="/rank-groups" component={() => <RankGroupsPage />} />
          <Route path="/admin" component={() => <Admin />} />
          <Route path="/admin/bot-rules" component={() => <BotRulesAdmin />} />
          <Route path="/merge-accounts/:sessionId" component={MergeAccountsPage} />
          <Route path="/auth-test" component={AuthTestPage} />
          <Route path="/set-password" component={SetPasswordPage} />
          <Route path="/password-demo" component={PasswordDemoPage} />
          <Route path="/top-professionals" component={TopQProfessionalsPage} />
          <Route path="/qh13" component={() => <QH13Page />} />
          <Route path="/glossary" component={() => <GlossaryPage />} />
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
