import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/auth";

interface BottomNavProps {
  user: User;
}

export default function BottomNav({ user }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { 
      path: "/discover", 
      icon: "fas fa-compass", 
      label: "Discover",
      active: location === "/" || location === "/discover"
    },
    { 
      path: "/qhf", 
      icon: "fas fa-comments", 
      label: "QChat",
      active: location === "/qhf" || location === "/dm" || location === "/chat"
    },
    { 
      path: "https://wa.me/905363694997?text=Hello!%20I%20found%20you%20through%20QaaqConnect%20maritime%20platform.%20Can%20we%20connect%20for%20maritime%20events%20and%20services?", 
      icon: "fab fa-whatsapp", 
      label: "Events",
      active: false,
      external: true
    },
    { 
      path: "/post", 
      icon: "fas fa-plus-circle", 
      label: "Post",
      active: location === "/post"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 maritime-shadow z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-3 text-green-600 hover:text-green-700 transition-colors"
            >
              <i className={`${item.icon} text-xl mb-1`}></i>
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          ) : (
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
          )
        ))}
      </div>
    </nav>
  );
}
