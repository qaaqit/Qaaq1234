import { useState } from "react";
import { ArrowLeft, Ship, MessageCircle, Users, Bot, Crown, Globe, Lightbulb, Target, Anchor, Award, BookOpen, Cog, MapPin, Shield, Zap, Heart, CheckCircle, TrendingUp, Search } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReadMePage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: "QBOT AI Assistant",
      description: "Advanced maritime AI powered by multiple models (ChatGPT, Gemini, Grok, Mistral) for instant expert answers",
      highlight: "AI-Powered"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Expert Q&A Community",
      description: "Connect with maritime professionals worldwide - ask questions, share knowledge, get verified answers",
      highlight: "Community Driven"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Top Q Professionals",
      description: "Network with certified marine engineers, captains, and technical experts from leading shipping companies",
      highlight: "Expert Network"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Maritime Dictionary",
      description: "Comprehensive shipping terminology and technical definitions for maritime professionals",
      highlight: "Knowledge Base"
    },
    {
      icon: <Cog className="w-6 h-6" />,
      title: "Machine Tree System",
      description: "Detailed ship equipment hierarchy with SEMM codes, manufacturers, and technical specifications",
      highlight: "Technical Reference"
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Question Bank",
      description: "Searchable database of maritime questions and expert answers across all ship systems",
      highlight: "Resource Library"
    },
    {
      icon: <Crown className="w-6 h-6" />,
      title: "Premium Features",
      description: "Advanced AI models, priority support, extended chat history, and enhanced functionality",
      highlight: "Premium Access"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-Language Support",
      description: "Available in multiple languages to serve the global maritime community",
      highlight: "Global Ready"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Platform",
      description: "Enterprise-grade security with user authentication and data protection",
      highlight: "Secure"
    }
  ];

  const achievements = [
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Growing Community",
      value: "Active maritime professionals worldwide",
      description: "From chief engineers to deck officers"
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-green-600" />,
      title: "Knowledge Exchange",
      value: "Thousands of Q&A interactions",
      description: "Real maritime challenges solved daily"
    },
    {
      icon: <Bot className="w-8 h-8 text-purple-600" />,
      title: "AI Innovation",
      value: "Multi-model AI integration",
      description: "Leading maritime AI technology"
    },
    {
      icon: <Globe className="w-8 h-8 text-orange-600" />,
      title: "Global Reach",
      value: "International maritime coverage",
      description: "Serving ships and ports worldwide"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="flex items-center space-x-2 text-gray-600 hover:text-navy"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <div className="flex items-center space-x-3">
              <Anchor className="w-8 h-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-navy">QAAQ ReadMe</h1>
            </div>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Vision Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Ship className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-navy mb-4">
            Revolutionizing Maritime Knowledge
          </h2>
          
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            QAAQ is the world's first comprehensive maritime knowledge platform, combining cutting-edge AI technology 
            with the expertise of maritime professionals to solve real-world challenges at sea.
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-12 border-0 shadow-lg bg-gradient-to-r from-navy to-ocean-teal text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-6">
              <Target className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-4">Our Mission</h3>
            <p className="text-lg text-center leading-relaxed opacity-95">
              To democratize maritime expertise by creating an intelligent platform where ship engineers, 
              officers, and technical professionals can instantly access expert knowledge, share experiences, 
              and solve complex maritime challenges together.
            </p>
          </CardContent>
        </Card>

        {/* Key Achievements */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-navy text-center mb-8">Key Achievements</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    {achievement.icon}
                  </div>
                  <h4 className="font-bold text-navy mb-2">{achievement.title}</h4>
                  <p className="text-sm font-semibold text-orange-600 mb-2">{achievement.value}</p>
                  <p className="text-xs text-gray-600">{achievement.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Features Highlighted */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-navy text-center mb-8">Complete Feature Suite</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                      {feature.icon}
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {feature.highlight}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-navy">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Innovation Highlights */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <Lightbulb className="w-8 h-8 text-yellow-500" />
                <CardTitle className="text-xl text-navy">Innovation Leader</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>First maritime-specific AI assistant</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Multi-model AI integration (4 AI engines)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Real-time expert knowledge sharing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Comprehensive ship systems database</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <CardTitle className="text-xl text-navy">Impact & Growth</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Reducing ship downtime through instant expert advice</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Building global maritime knowledge network</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Democratizing access to maritime expertise</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Advancing maritime safety and efficiency</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-center">
          <CardContent className="p-8">
            <div className="flex justify-center mb-4">
              <Heart className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Join the Maritime Revolution</h3>
            <p className="text-lg mb-6 opacity-95">
              Be part of the future of maritime knowledge sharing. Connect with experts, 
              solve challenges, and advance your maritime career with QAAQ.
            </p>
            <Button
              onClick={() => setLocation("/")}
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-3"
              data-testid="button-start-exploring"
            >
              Start Exploring QAAQ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}