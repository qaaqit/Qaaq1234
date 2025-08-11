import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getStoredUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Ship, Anchor, Navigation, MapPin, Users, MessageCircle } from "lucide-react";

export default function SidebarDemo() {
  const user = getStoredUser();
  const [selectedFeature, setSelectedFeature] = useState("overview");

  const features = [
    { 
      id: "overview", 
      title: "Overview", 
      icon: Ship,
      description: "Platform overview and navigation" 
    },
    { 
      id: "navigation", 
      title: "Navigation", 
      icon: Navigation,
      description: "Customize sidebar navigation items" 
    },
    { 
      id: "styling", 
      title: "Styling", 
      icon: Anchor,
      description: "Customize colors, spacing, and appearance" 
    },
    { 
      id: "content", 
      title: "Content", 
      icon: Users,
      description: "Add custom sections and user information" 
    }
  ];

  const renderContent = () => {
    switch (selectedFeature) {
      case "overview":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-orange-600" />
                  Left Sidebar Customization Guide
                </CardTitle>
                <CardDescription>
                  Learn how to customize the left side of your QaaqConnect pages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  The sidebar provides a clean, organized way to navigate between different sections 
                  of your maritime platform. You can customize:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>Navigation items and their icons</li>
                  <li>Color schemes and branding</li>
                  <li>User information display</li>
                  <li>Custom sections and tools</li>
                  <li>Responsive behavior on mobile</li>
                </ul>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Maritime Theme</h4>
                  <p className="text-orange-700 text-sm">
                    The sidebar follows your QaaqConnect brand with orange/red accents and maritime iconography.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "navigation":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Navigation Customization</CardTitle>
                <CardDescription>Customize sidebar navigation items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span>Map Radar</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-gray-600" />
                      <span>Messages</span>
                    </div>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span>Profile</span>
                    </div>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  Add New Navigation Item
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "styling":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Styling Options</CardTitle>
                <CardDescription>Customize appearance and colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Primary Color</label>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-orange-600 rounded cursor-pointer border-2 border-orange-800"></div>
                    <div className="w-8 h-8 bg-red-600 rounded cursor-pointer"></div>
                    <div className="w-8 h-8 bg-blue-600 rounded cursor-pointer"></div>
                    <div className="w-8 h-8 bg-green-600 rounded cursor-pointer"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Sidebar Width</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm">Narrow</Button>
                    <Button variant="default" size="sm" className="bg-orange-600">Standard</Button>
                    <Button variant="outline" size="sm">Wide</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Collapsible Behavior</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">Icon Only</Button>
                    <Button variant="default" size="sm" className="bg-orange-600">Off Canvas</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "content":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Content Sections</CardTitle>
                <CardDescription>Add your own sections and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="sectionTitle" className="block text-sm font-medium">
                    Section Title
                  </label>
                  <Input id="sectionTitle" placeholder="e.g., Maritime Tools" />
                </div>
                <div className="space-y-3">
                  <label htmlFor="sectionDesc" className="block text-sm font-medium">
                    Description
                  </label>
                  <Textarea id="sectionDesc" placeholder="Describe this section..." />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium">Items</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Item name" className="flex-1" />
                      <Input placeholder="URL" className="flex-1" />
                      <Button size="sm" variant="outline">Add</Button>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  Create Custom Section
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout user={user} showSidebar={true}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sidebar Customization Demo
          </h1>
          <p className="text-gray-600">
            Explore how to customize the left sidebar for your QaaqConnect pages
          </p>
        </div>

        {/* Feature Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Feature List */}
          <div className="lg:col-span-1 space-y-2">
            {features.map((feature) => (
              <Button
                key={feature.id}
                variant={selectedFeature === feature.id ? "default" : "ghost"}
                className={`w-full justify-start h-auto p-4 ${
                  selectedFeature === feature.id 
                    ? "bg-orange-600 hover:bg-orange-700 text-white" 
                    : "hover:bg-orange-50 hover:text-orange-600"
                }`}
                onClick={() => setSelectedFeature(feature.id)}
              >
                <div className="flex items-start gap-3">
                  <feature.icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="font-medium">{feature.title}</div>
                    <div className="text-xs opacity-75 mt-1">{feature.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}