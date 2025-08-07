import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/auth";

interface BottomNavProps {
  user: User;
  onLogout?: () => void;
}

export default function BottomNav({ user, onLogout }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const handleMapRadarClick = () => {
    if (location === "/" || location === "/discover") {
      // If already on the main page, just trigger the map radar action
      window.location.hash = "#map-radar";
    } else {
      // Navigate to main page first, then trigger map radar
      setLocation("/#map-radar");
    }
  };

  const baseNavItems = [
    { 
      path: "/qbot", 
      icon: "fas fa-robot", 
      label: ["QBOT", "Chat"],
      active: location === "/qbot",
      onClick: () => setLocation("/qbot")
    },
    { 
      path: "/dm", 
      icon: "fas fa-comments", 
      label: ["Ch13", "DM"],
      active: location === "/qhf" || location === "/dm" || location === "/chat",
      onClick: () => setLocation("/dm")
    },
    { 
      path: "/rank-groups", 
      icon: "fas fa-users", 
      label: ["Ch16", "Groups"],
      active: location === "/rank-groups",
      onClick: () => setLocation("/rank-groups")
    },
    { 
      path: "/", 
      icon: "fas fa-map-marked-alt", 
      label: ["Map", "Radar"],
      active: location === "/" || location === "/discover" || location === "/users",
      onClick: handleMapRadarClick
    }
  ];

  const navItems = baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-orange-400 shadow-lg z-[1001] pb-safe">
      <div className="flex items-center justify-around py-3 px-2 relative min-h-[70px]">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-yellow-50"></div>
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={item.onClick}
            className={`relative flex flex-col items-center p-2 transition-all duration-300 ${
              item.active 
                ? "text-white bg-gradient-to-r from-red-500 to-orange-500 shadow-lg scale-105" 
                : "text-gray-700 hover:text-orange-600 hover:bg-orange-100"
            } rounded-xl min-w-[60px]`}
          >
            <i className={`${item.icon} text-lg mb-1 ${
              item.active ? "animate-bounce" : ""
            }`}></i>
            <div className="text-[10px] font-bold text-center leading-tight max-w-full">
              <div className="truncate">
                {Array.isArray(item.label) ? item.label[0] : item.label}
              </div>
              {Array.isArray(item.label) && (
                <div className={`${item.active ? "text-yellow-200" : "text-gray-500"} truncate`}>
                  {item.label[1]}
                </div>
              )}
            </div>
            {item.active && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-lg"></div>
            )}
          </Button>
        ))}
      </div>
    </nav>
  );
}
