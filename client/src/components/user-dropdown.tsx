import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  FileText, 
  Heart, 
  HelpCircle, 
  Users, 
  MessageCircle, 
  Database,
  Shield,
  LogOut,
  ChevronDown
} from "lucide-react";
import { useLocation } from "wouter";
import { logout, type User as AuthUser } from "@/lib/auth";

interface UserDropdownProps {
  user: AuthUser;
  className?: string;
}

export default function UserDropdown({ user, className = "" }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Close dropdown when clicking outside and calculate position
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Calculate dropdown position when opened
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const menuItems = [
    {
      icon: User,
      label: "My Page",
      onClick: () => {
        setLocation(`/user/${user.id}`);
        setIsOpen(false);
      }
    },
    {
      icon: Settings,
      label: "Update CV/Profile", 
      onClick: () => {
        setLocation('/profile');
        setIsOpen(false);
      }
    },
    {
      icon: Heart,
      label: "My Machines",
      onClick: () => {
        // Navigate to ships/machines page when implemented
        setIsOpen(false);
      }
    },
    {
      icon: HelpCircle,
      label: "My Questions",
      onClick: () => {
        setLocation('/my-questions');
        setIsOpen(false);
      }
    },
    {
      icon: Users,
      label: "Friends",
      onClick: () => {
        setLocation('/dm');
        setIsOpen(false);
      }
    },
    {
      icon: MessageCircle,
      label: "Messages",
      onClick: () => {
        setLocation('/dm');
        setIsOpen(false);
      }
    },
    {
      icon: Database,
      label: "Storage Management",
      onClick: () => {
        // Navigate to storage management when implemented
        setIsOpen(false);
      }
    }
  ];

  // Add admin panel if user is admin
  if (user.isAdmin) {
    menuItems.push({
      icon: Shield,
      label: "Admin Panel",
      onClick: () => {
        setLocation('/admin');
        setIsOpen(false);
      }
    });
  }

  return (
    <div className={`relative z-[9999] ${className}`} ref={dropdownRef}>
      {/* User Avatar Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        className="p-1 h-auto w-auto rounded-full hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarFallback className="bg-white/20 text-white font-semibold">
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className={`w-4 h-4 text-white/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="user-dropdown-menu w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-[9999] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 2147483647
          }}
        >
          {/* User Info Header */}
          <div className="bg-slate-700 p-4 border-b border-slate-600">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-navy text-white font-semibold text-lg">
                  {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">
                  {user.fullName || user.id}
                </h3>
                <p className="text-sm text-white/60 mb-2">
                  Welcome{user.fullName && !user.fullName.startsWith('+') ? `, ${user.fullName.split(' ')[0]}` : ''}!
                </p>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className="bg-navy/20 text-navy-300 border-navy-400 text-xs"
                  >
                    {user.userType === 'sailor' ? '🚢 Sailor' : '🏠 Local Guide'}
                  </Badge>
                  {user.isAdmin && (
                    <Badge 
                      variant="outline" 
                      className="bg-yellow-500/20 text-yellow-300 border-yellow-400 text-xs"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors text-white"
              >
                <item.icon className="w-5 h-5 text-slate-400" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-600/20 transition-colors text-red-400 border-t border-slate-700 mt-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}