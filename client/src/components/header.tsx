import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/auth";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 maritime-shadow z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-navy to-ocean-teal rounded-lg flex items-center justify-center">
            <i className="fas fa-anchor text-white text-sm"></i>
          </div>
          <span className="font-bold text-navy text-lg">QaaqConnect</span>
        </div>

        {/* Admin Shield - Only visible for admin users */}
        {user.isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin")}
            className={`flex items-center space-x-2 px-3 py-2 ${
              location === "/admin" 
                ? "text-ocean-teal bg-ocean-teal/10" 
                : "text-gray-600 hover:text-navy hover:bg-gray-50"
            } transition-colors`}
          >
            <i className="fas fa-shield-alt text-lg"></i>
            <span className="font-medium">Admin</span>
          </Button>
        )}
      </div>
    </header>
  );
}