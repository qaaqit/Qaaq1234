import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Users, MessageCircle, MapPin, Anchor } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Anchor className="h-8 w-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QAAQ Connect</h1>
            </div>
            <Button onClick={handleLogin} className="bg-orange-600 hover:bg-orange-700 text-white">
              Sign In with Replit
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Connect with Maritime Professionals
            <span className="block text-orange-600">Worldwide</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover nearby sailors, share experiences, and access technical knowledge from the maritime community. 
            Join the platform where maritime professionals connect, learn, and grow together.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Everything You Need for Maritime Networking
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <MapPin className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Find Nearby Sailors</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Discover maritime professionals in your port or city. Connect with locals and fellow sailors.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <MessageCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Q&A Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access 1,244+ authentic maritime questions and answers from experienced professionals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Real-time Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Chat with QBOT for instant assistance or connect directly with other maritime professionals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Ship className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Ship Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track ship positions, find crew members onboard, and stay connected across the fleet.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-orange-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Join the Maritime Community?
          </h3>
          <p className="text-xl text-orange-100 mb-8">
            Sign in with your Replit account to access all features and connect with maritime professionals worldwide.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            variant="secondary"
            className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 text-lg"
          >
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Anchor className="h-6 w-6 text-orange-600" />
            <span className="text-lg font-semibold">QAAQ Connect</span>
          </div>
          <p className="text-gray-400">
            Connecting maritime professionals worldwide through technology and community.
          </p>
        </div>
      </footer>
    </div>
  );
}