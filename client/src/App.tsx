import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

import QBOTHome from "@/pages/qbot-home";
import Home from "@/pages/home";
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
import { RankGroupsPanel } from "@/components/rank-groups-panel";

import NotFound from "@/pages/not-found";
import BottomNav from "@/components/bottom-nav";
import { getStoredToken, getStoredUser, type User } from "@/lib/auth";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we're in Replit preview mode
    const isPreview = window.location.hostname.includes('.id.repl.co') || 
                     window.location.hostname.includes('.replit.dev') ||
                     window.location.hostname.includes('localhost');
    
    // Force landing page in preview if requested
    const forceHome = new URLSearchParams(window.location.search).get('forceHome');
    
    if (!forceHome) {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      
      if (token && storedUser) {
        setUser(storedUser);
      }
    }
    setLoading(false);
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={user ? "pb-16" : ""}>
        <Switch>
          <Route path="/" component={QBOTHome} />
          <Route path="/login" component={() => <Home onSuccess={setUser} />} />
          <Route path="/home" component={() => <Home onSuccess={setUser} />} />
          <Route path="/landing" component={() => <Home onSuccess={setUser} />} />
          <Route path="/register" component={() => <Register onSuccess={setUser} />} />
          <Route path="/verify" component={() => <Verify onSuccess={setUser} />} />
          <Route path="/discover" component={() => user ? <Discover user={user} /> : <Home onSuccess={setUser} />} />
          <Route path="/post" component={() => user ? <Post user={user} /> : <Home />} />
          <Route path="/chat" component={() => user ? <ChatPage /> : <Home />} />
          <Route path="/chat/:userId" component={() => user ? <DMPage /> : <Home />} />
          <Route path="/dm" component={() => user ? <DMPage /> : <Home />} />
          <Route path="/qhf" component={() => user ? <DMPage /> : <Home />} />
          <Route path="/user/:userId" component={() => user ? <UserProfile /> : <Home />} />
          <Route path="/user-profile/:userId" component={() => user ? <UserProfile /> : <Home />} />
          <Route path="/profile" component={() => user ? <Profile /> : <Home />} />
          <Route path="/my-questions" component={() => user ? <MyQuestions /> : <Home />} />
          <Route path="/share/question/:id" component={() => user ? <QuestionPage /> : <Home />} />
          <Route path="/rank-groups" component={() => user ? <RankGroupsPanel /> : <Home />} />
          <Route path="/admin" component={() => user ? <Admin /> : <Home />} />
          <Route path="/admin/bot-rules" component={() => user ? <BotRulesAdmin /> : <Home />} />

          <Route component={NotFound} />
        </Switch>
      </div>
      
      {user && <BottomNav user={user} />}
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
