import { useEffect } from "react";
import { useLocation } from "wouter";
import { User } from "@/lib/auth";

interface HomeProps {
  onSuccess?: (user: User) => void;
}

export default function Home({ onSuccess }: HomeProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to login for returning users
    setLocation('/login');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-anchor text-2xl text-white"></i>
        </div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}