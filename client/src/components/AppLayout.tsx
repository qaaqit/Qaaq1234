import { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  Home, 
  MessageCircle, 
  Users, 
  MapPin, 
  HelpCircle, 
  Settings,
  Ship,
  Anchor,
  Navigation
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";

interface AppLayoutProps {
  children: ReactNode;
  user?: User | null;
  showSidebar?: boolean;
}

const navigationItems = [
  {
    title: "Home",
    icon: Home,
    url: "/",
    description: "QBOT Chat"
  },
  {
    title: "Map Radar", 
    icon: MapPin,
    url: "/discover",
    description: "Find nearby sailors"
  },
  {
    title: "Messages",
    icon: MessageCircle, 
    url: "/chat",
    description: "Direct messaging"
  },
  {
    title: "Questions",
    icon: HelpCircle,
    url: "/my-questions", 
    description: "Your Q&A history"
  },
  {
    title: "Profile",
    icon: Users,
    url: "/profile",
    description: "Account settings"
  }
];

const maritimeFeatures = [
  {
    title: "Ship Tracker",
    icon: Ship,
    url: "/ships",
    description: "Track vessel positions"
  },
  {
    title: "Port Guide", 
    icon: Anchor,
    url: "/ports",
    description: "Port information"
  },
  {
    title: "Navigation",
    icon: Navigation,
    url: "/navigation", 
    description: "Route planning"
  }
];

export function AppSidebar({ user }: { user?: User | null }) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-4 py-2">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              QaaqConnect
            </h2>
            <p className="text-xs text-gray-500">Maritime Network</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className={cn(
                      "hover:bg-orange-50 hover:text-orange-600",
                      location === item.url && "bg-orange-100 text-orange-700 border-r-2 border-orange-500"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Maritime Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Maritime Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {maritimeFeatures.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-blue-50 hover:text-blue-600 text-gray-600"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info */}
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-4 py-3 bg-gray-50 rounded-lg mx-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-navy to-blue-800 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.fullName || 'Maritime User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.userType === 'sailor' ? 'Maritime Professional' : 'Local Contact'}
                    </p>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-gray-500 text-center border-t">
          Maritime Professional Network
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children, user, showSidebar = true }: AppLayoutProps) {
  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}