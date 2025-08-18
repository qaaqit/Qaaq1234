import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import qaaqLogo from "@/assets/qaaq-logo.png";
import type { User } from "@/lib/auth";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 maritime-shadow z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo with Dropdown Menu */}
        <div className="flex items-center">
          <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="p-1 h-auto w-auto rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                data-testid="button-main-menu"
              >
                <div className="flex items-center space-x-2">
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-lg flex items-center justify-center">
                    <img 
                      src={qaaqLogo} 
                      alt="QAAQ Logo" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg">
              <DropdownMenuItem 
                onClick={() => setLocation("/")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-home"
              >
                <i className="fas fa-home text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/glossary")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-dictionary"
              >
                <i className="fas fa-ship text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Shipping Dictionary</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/question-bank")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-questions"
              >
                <i className="fas fa-question-circle text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">QuestionBank</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="font-bold text-navy text-lg ml-3">QaaqConnect</span>
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