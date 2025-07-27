import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="gradient-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M20%2050h60m-50-20h40m-30%2040h20%22%20stroke%3D%22white%22%20stroke-width%3D%221%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[length:50px_50px]"></div>
        </div>
        
        <div className="container mx-auto px-4 py-6 relative z-10">
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-anchor text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">QaaqConnect</h1>
                <p className="text-sm text-white/80">Maritime Community</p>
              </div>
            </div>
            <Link href="/register">
              <Button variant="ghost" className="bg-white/20 hover:bg-white/30 text-white">
                <i className="fas fa-user mr-2"></i>Login
              </Button>
            </Link>
          </nav>

          <div className="text-center py-12">
            <h2 className="text-4xl font-bold mb-4">Explore Ports.<br />Connect Locally.</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Connect sailors with locals for authentic port city experiences. 
              Discover hidden gems, join maritime meetups, and explore like a local.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Link href="/register">
                <Button size="lg" className="bg-white text-navy hover:bg-gray-100 w-full sm:w-auto">
                  <i className="fas fa-ship mr-3"></i>I'm a Sailor
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" className="bg-ocean-teal hover:bg-cyan-600 w-full sm:w-auto">
                  <i className="fas fa-home mr-3"></i>I'm a Local
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold navy mb-4">Minimum Fuss, Maximum Fun</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quick registration, instant access, and seamless connections between maritime professionals and port city locals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center hover:maritime-shadow transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-navy/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-rocket text-2xl navy"></i>
                </div>
                <h4 className="text-xl font-semibold mb-3">Instant Access</h4>
                <p className="text-gray-600">Just 3 fields: name, email, and role. You're in and exploring within seconds.</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:maritime-shadow transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-ocean-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-map-marked-alt text-2xl ocean-teal"></i>
                </div>
                <h4 className="text-xl font-semibold mb-3">Local Discovery</h4>
                <p className="text-gray-600">"1234 koi hai" search finds locals and experiences in any port city worldwide.</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:maritime-shadow transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-users text-2xl text-yellow-600"></i>
                </div>
                <h4 className="text-xl font-semibold mb-3">Maritime Community</h4>
                <p className="text-gray-600">Connect with fellow seafarers and maritime professionals in ports worldwide.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold navy mb-4">Ready to Join the Community?</h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with maritime professionals worldwide. Choose your preferred login method below.
          </p>
          <Link href="/register">
            <Button size="lg" className="gradient-bg text-white hover:shadow-lg transform hover:scale-105 transition-all">
              Start Exploring Now 🚀
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-anchor text-white"></i>
                </div>
                <div>
                  <h4 className="text-xl font-bold">QaaqConnect</h4>
                  <p className="text-sm text-white/80">Maritime Community</p>
                </div>
              </div>
              <p className="text-white/80 text-sm">
                Connecting sailors with locals for authentic port experiences worldwide. 
                Part of the QAAQ maritime ecosystem.
              </p>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="https://qaaqit.replit.app" className="hover:text-white transition-colors">QAAQ Main Platform</a></li>
                <li><a href="https://qaaqit.replit.app" className="hover:text-white transition-colors">Maritime Q&A</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Technical Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community Guidelines</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Connect</h5>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <i className="fab fa-whatsapp"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <i className="fab fa-telegram"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <i className="fab fa-linkedin"></i>
                </a>
              </div>
              <p className="text-xs text-white/60 mt-4">
                WhatsApp: +905363694997<br />
                Launch: August 1, 2025
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2025 QaaqConnect. Part of the QAAQ Maritime Platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
