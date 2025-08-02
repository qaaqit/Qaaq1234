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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 maritime-shadow z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => setLocation(item.path)}
            className={`flex flex-col items-center p-3 ${
              item.active 
                ? "text-ocean-teal" 
                : "text-gray-400 hover:text-navy"
            } transition-colors`}
          >
            <i className={`${item.icon} text-xl mb-1`}></i>
            <div className="text-xs font-medium text-center leading-tight">
              <div>{Array.isArray(item.label) ? item.label[0] : item.label}</div>
              {Array.isArray(item.label) && <div>{item.label[1]}</div>}
            </div>
          </Button>
        ))}
      </div>
    </nav>
  );
}
