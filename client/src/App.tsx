import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import Home from "@/pages/home-old";
import Landing from "@/pages/Landing";
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

import NotFound from "@/pages/not-found";
import BottomNav from "@/components/bottom-nav";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
      <div className={isAuthenticated ? "pb-16" : ""}>
        <Switch>
          {isLoading || !isAuthenticated ? (
            <Route path="/" component={Landing} />
          ) : (
            <>
              <Route path="/" component={QBOTPage} />
              <Route path="/discover" component={Discover} />
              <Route path="/qbot" component={QBOTPage} />
              <Route path="/post" component={Post} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/chat/:userId" component={DMPage} />
              <Route path="/dm" component={DMPage} />
              <Route path="/qhf" component={DMPage} />
              <Route path="/user/:userId" component={UserProfile} />
              <Route path="/user-profile/:userId" component={UserProfile} />
              <Route path="/profile" component={Profile} />
              <Route path="/my-questions" component={MyQuestions} />
              <Route path="/share/question/:id" component={QuestionPage} />
              <Route path="/questions/:id" component={QuestionPage} />
              <Route path="/rank-groups" component={RankGroupsPage} />
              <Route path="/admin" component={Admin} />
              <Route path="/admin/bot-rules" component={BotRulesAdmin} />
              <Route path="/merge-accounts/:sessionId" component={MergeAccountsPage} />
              <Route path="/auth-test" component={AuthTestPage} />
              <Route path="/set-password" component={SetPasswordPage} />
              <Route path="/password-demo" component={PasswordDemoPage} />
              <Route path="/home-old" component={Home} />
            </>
          )}
          
          {/* Public routes available to non-authenticated users */}
          <Route path="/register" component={Register} />
          <Route path="/verify" component={Verify} />
          
          <Route component={NotFound} />
        </Switch>
      </div>
      
      {isAuthenticated && <BottomNav onLogout={() => window.location.href = "/api/logout"} />}
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
