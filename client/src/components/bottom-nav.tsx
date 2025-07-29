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
      label: "QChat",
      active: location === "/qhf" || location === "/dm" || location === "/chat"
    },
    { 
      path: "/post", 
      icon: "fas fa-plus-circle", 
      label: "Post",
      active: location === "/post"
    }
  ];

  const adminNavItems = [
    ...baseNavItems,
    { 
      path: "/admin", 
      icon: "fas fa-shield-alt", 
      label: "Admin",
      active: location === "/admin"
    }
  ];

  const navItems = user.isAdmin ? adminNavItems : baseNavItems;

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
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
