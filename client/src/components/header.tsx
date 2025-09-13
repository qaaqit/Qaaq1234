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
import UserDropdown from "@/components/user-dropdown";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 maritime-shadow z-[1200]">
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
            <DropdownMenuContent align="start" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg z-[1200]">
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
              <DropdownMenuItem 
                onClick={() => setLocation("/machine-tree")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-machine-tree"
              >
                <i className="fas fa-sitemap text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Machine Tree</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/workshop-tree")}
                className="cursor-pointer flex flex-col items-start space-y-1 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-workshop-tree"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-network-wired text-orange-600 w-4"></i>
                  <span className="text-gray-700 font-medium">Workshop Tree</span>
                </div>
                <div className="text-xs text-gray-500 pl-6 leading-tight">
                  System → Equipment → Task → Expertise → Port → Workshop
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/premium")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-premium"
              >
                <i className="fas fa-crown text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Premium Subscription</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/repair-workshops")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-repair-workshops"
              >
                <i className="fas fa-tools text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Repair Workshops Directory</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/workshop-services")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-workshop-services"
              >
                <i className="fas fa-anchor text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">Workshop Services</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/readme")}
                className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                data-testid="menu-item-readme"
              >
                <i className="fas fa-info-circle text-orange-600 w-4"></i>
                <span className="text-gray-700 font-medium">ReadMe</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="font-bold text-navy text-lg ml-3">QaaqConnect</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="flex items-center">
          <UserDropdown user={user} onLogout={() => window.location.reload()} />
        </div>
      </div>
    </header>
  );
}