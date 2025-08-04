import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/auth";

interface BottomNavProps {
  user: User;
}

export default function BottomNav({ user }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const baseNavItems = [
    { 
      path: "/dm", 
      icon: "fas fa-comments", 
      label: ["Ch13", "DM"],
      active: location === "/qhf" || location === "/dm" || location === "/chat"
    },
    { 
      path: "/rank-groups", 
      icon: "fas fa-users", 
      label: ["Ch16", "Groups"],
      active: location === "/rank-groups"
    },
    { 
      path: "/", 
      icon: "fas fa-map-marked-alt", 
      label: ["Map", "Radar"],
      active: location === "/" || location === "/discover" || location === "/users"
    }
  ];

  const navItems = baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-50 to-yellow-50 border-t-2 border-orange-300 shadow-lg z-50">
      <div className="flex items-center justify-around py-2 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-orange-400/10 to-yellow-400/10 animate-pulse"></div>
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => setLocation(item.path)}
            className={`relative flex flex-col items-center p-3 transition-all duration-300 ${
              item.active 
                ? "text-orange-600 bg-gradient-to-br from-yellow-200/50 to-orange-200/50 shadow-md scale-105" 
                : "text-red-500 hover:text-orange-500 hover:bg-yellow-100/50"
            } rounded-xl`}
          >
            <i className={`${item.icon} text-xl mb-1 ${
              item.active ? "animate-bounce" : ""
            }`}></i>
            <div className="text-xs font-bold text-center leading-tight">
              <div className={`${item.active ? "text-orange-700" : ""}`}>
                {Array.isArray(item.label) ? item.label[0] : item.label}
              </div>
              {Array.isArray(item.label) && (
                <div className={`${item.active ? "text-yellow-600" : "text-red-400"}`}>
                  {item.label[1]}
                </div>
              )}
            </div>
            {item.active && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full"></div>
            )}
          </Button>
        ))}
      </div>
    </nav>
  );
}
