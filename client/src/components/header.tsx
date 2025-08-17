import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/auth";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 maritime-shadow z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo with Dropdown Menu */}
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-8 h-8 bg-gradient-to-br from-navy to-ocean-teal rounded-lg flex items-center justify-center hover:from-ocean-teal hover:to-navy transition-all duration-200 transform hover:scale-105"
                data-testid="button-main-menu"
              >
                <i className="fas fa-anchor text-white text-sm"></i>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem 
                onClick={() => setLocation("/")}
                className="cursor-pointer flex items-center space-x-2"
                data-testid="menu-item-home"
              >
                <i className="fas fa-home text-navy"></i>
                <span>Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/glossary")}
                className="cursor-pointer flex items-center space-x-2"
                data-testid="menu-item-dictionary"
              >
                <i className="fas fa-ship text-navy"></i>
                <span>Shipping Dictionary</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/my-questions")}
                className="cursor-pointer flex items-center space-x-2"
                data-testid="menu-item-questions"
              >
                <i className="fas fa-question-circle text-navy"></i>
                <span>QuestionBank</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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