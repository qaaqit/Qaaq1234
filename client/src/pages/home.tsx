import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Background - could be map or simple gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200"></div>
      
      {/* Translucent login box */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-navy to-ocean-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-anchor text-2xl text-white"></i>
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">QaaqConnect</h1>
            <p className="text-gray-600">Maritime Community Platform</p>
          </div>
          
          <div className="space-y-4">
            <Link href="/register" className="block">
              <Button className="w-full bg-navy hover:bg-navy/90 text-white">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Login / Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
