import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RegisterWorkshop from "@/pages/registerworkshop";
import Verify from "@/pages/verify";
import ForgotPasswordPage from "@/pages/forgot-password";
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
import ReadMePage from "@/pages/readme";
import WorkshopPage from "@/pages/workshop";
import WorkshopDetailPage from "@/pages/workshop-detail";
import WorkshopDashboard from "@/pages/workshop-owner-dashboard";
import WorkshopBookings from "@/pages/workshop-bookings";
import WorkshopPricing from "@/pages/workshop-pricing";
import WorkshopTasks from "@/pages/workshop-tasks";
import WorkshopTreePage from "@/pages/workshop-tree";
import WorkshopTreeEquipmentPage from "@/pages/workshop-tree-equipment";
import WorkshopTreeTasksPage from "@/pages/workshop-tree-tasks";
import WorkshopTreePortsPage from "@/pages/workshop-tree-ports";
import WorkshopTreeWorkshopsPage from "@/pages/workshop-tree-workshops";
import WorkshopTreeDetailPage from "@/pages/workshop-tree-detail";

import NotFound from "@/pages/not-found";
import BottomNav from "@/components/bottom-nav";
import { PasswordCreationModal } from "@/components/PasswordCreationModal";
import { usePasswordCheck } from "@/hooks/usePasswordCheck";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredToken, getStoredUser, type User } from "@/lib/auth";

function Router() {
  const { user, isLoading, logout } = useAuth();
  
  // Convert unified user to legacy User format for compatibility
  const currentUser: User | null = user ? {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    userType: 'sailor', // Default value
    isAdmin: user.isAdmin,
    nickname: user.fullName, // Use fullName as nickname
    isVerified: true, // Authenticated users are verified
    loginCount: 0, // Legacy field
    maritimeRank: user.rank
  } : null;
  
  // Check password requirements for logged-in users
  const { showPasswordModal, isRenewal, closeModal } = usePasswordCheck(user?.id);

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={currentUser ? "pb-16" : ""}>
        <Switch>
          <Route path="/" component={() => {
            console.log('🏠 Root route - Current user:', currentUser ? currentUser.fullName : 'None');
            return currentUser ? <QBOTPage user={currentUser} /> : <Login />;
          }} />
          <Route path="/login" component={() => <Login />} />
          <Route path="/register" component={() => <Register />} />
          <Route path="/registerworkshop" component={() => <RegisterWorkshop onSuccess={(user) => console.log('Workshop registration successful:', user)} />} />
          <Route path="/verify" component={() => <Verify />} />
          <Route path="/forgot-password" component={() => <ForgotPasswordPage />} />
          <Route path="/oauth-callback" component={() => <OAuthCallback />} />
          <Route path="/discover" component={() => currentUser ? <Discover user={currentUser} /> : <Login />} />
          <Route path="/qbot" component={() => {
            console.log('🤖 QBOT route - Current user:', currentUser ? currentUser.fullName : 'None');
            if (!currentUser && !isLoading) {
              console.log('❌ QBOT route - No user found, redirecting to login');
            }
            return currentUser ? <QBOTPage user={currentUser} /> : <Login />;
          }} />
          <Route path="/post" component={() => currentUser ? <Post user={currentUser} /> : <Login />} />

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
          <Route path="/premium" component={() => currentUser ? <PremiumPage /> : <Login />} />
          <Route path="/premium-status" component={() => currentUser ? <PremiumStatusPage /> : <Login />} />
          <Route path="/premium-setup" component={() => <PremiumSetupPage />} />
          <Route path="/readme" component={() => <ReadMePage />} />
          <Route path="/workshop" component={() => <WorkshopPage />} />
          <Route path="/workshop/:id" component={() => <WorkshopDetailPage />} />
          <Route path="/workshop-services" component={() => currentUser ? <WorkshopPage /> : <Login />} />
          <Route path="/workshop-dashboard" component={() => currentUser ? <WorkshopDashboard /> : <Login />} />
          <Route path="/workshop-bookings" component={() => currentUser ? <WorkshopBookings /> : <Login />} />
          <Route path="/workshop-pricing" component={() => currentUser ? <WorkshopPricing /> : <Login />} />
          <Route path="/workshop-tasks" component={() => currentUser ? <WorkshopTasks /> : <Login />} />
          
          {/* Workshop Tree Routes */}
          <Route path="/workshop-tree" component={() => <WorkshopTreePage />} />
          <Route path="/workshop-tree/system/:systemCode" component={() => <WorkshopTreeEquipmentPage />} />
          <Route path="/workshop-tree/equipment/:systemCode/:equipmentCode" component={() => <WorkshopTreeTasksPage />} />
          <Route path="/workshop-tree/task/:taskId/ports" component={() => <WorkshopTreePortsPage />} />
          <Route path="/workshop-tree/task/:taskId/port/:port" component={() => <WorkshopTreeWorkshopsPage />} />
          <Route path="/workshop-tree/workshop/:workshopId" component={() => <WorkshopTreeDetailPage />} />
          
          <Route path="/home-old" component={() => <Login />} />

          <Route component={NotFound} />
        </Switch>
      </div>
      
      {currentUser && <BottomNav user={currentUser} onLogout={handleLogout} />}
      
      {/* Mandatory Password Creation Modal */}
      {showPasswordModal && currentUser && (
        <PasswordCreationModal
          isOpen={showPasswordModal}
          onClose={closeModal}
          userId={currentUser.id}
          isRenewal={isRenewal}
        />
      )}
      
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
