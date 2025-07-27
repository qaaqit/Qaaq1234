import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { 
      path: "/discover", 
      icon: "fas fa-compass", 
      label: "Discover",
      active: location === "/" || location === "/discover"
    },
    { 
      path: "/map", 
      icon: "fas fa-map", 
      label: "Map",
      active: location === "/map"
    },
    { 
      path: "/post", 
      icon: "fas fa-plus-circle", 
      label: "Post",
      active: location === "/post"
    },
    { 
      path: "/community", 
      icon: "fas fa-users", 
      label: "Community",
      active: location === "/community"
    },
    { 
      path: "/profile", 
      icon: "fas fa-user", 
      label: "Profile",
      active: location === "/profile"
    },
  ];

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
