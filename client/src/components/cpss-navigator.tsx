import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CPSSLevel {
  id: string;
  name: string;
  type: 'country' | 'port' | 'suburb' | 'service';
  children?: CPSSLevel[];
  icon?: string;
  description?: string;
}

// Sample CPSS data structure
const cpssData: CPSSLevel[] = [
  {
    id: 'india',
    name: 'India',
    type: 'country',
    icon: '🇮🇳',
    children: [
      {
        id: 'mumbai-port',
        name: 'Mumbai Port',
        type: 'port',
        icon: '⚓',
        children: [
          {
            id: 'colaba',
            name: 'Colaba',
            type: 'suburb',
            icon: '🏙️',
            children: [
              {
                id: 'maritime-meetup',
                name: 'Maritime Meetups',
                type: 'service',
                icon: '🤝',
                description: 'Connect with fellow seafarers'
              },
              {
                id: 'local-tours',
                name: 'Local Tours',
                type: 'service',
                icon: '🗺️',
                description: 'Explore Mumbai with local guides'
              },
              {
                id: 'port-dining',
                name: 'Port Dining',
                type: 'service',
                icon: '🍽️',
                description: 'Authentic local restaurants'
              }
            ]
          }
        ]
      },
      {
        id: 'chennai-port',
        name: 'Chennai Port',
        type: 'port',
        icon: '⚓',
        children: [
          {
            id: 'royapuram',
            name: 'Royapuram',
            type: 'suburb',
            icon: '🏙️',
            children: [
              {
                id: 'shore-shopping',
                name: 'Shore Shopping',
                type: 'service',
                icon: '🛒',
                description: 'Maritime supplies and essentials'
              },
              {
                id: 'cultural-experiences',
                name: 'Cultural Experiences',
                type: 'service',
                icon: '🎭',
                description: 'Local attractions and events'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'uae',
    name: 'UAE',
    type: 'country',
    icon: '🇦🇪',
    children: [
      {
        id: 'dubai-port',
        name: 'Dubai Port',
        type: 'port',
        icon: '⚓',
        children: [
          {
            id: 'deira',
            name: 'Deira',
            type: 'suburb',
            icon: '🏙️',
            children: [
              {
                id: 'maritime-meetup',
                name: 'Maritime Meetups',
                type: 'service',
                icon: '🤝',
                description: 'International seafarer gatherings'
              },
              {
                id: 'port-dining',
                name: 'Port Dining',
                type: 'service',
                icon: '🍽️',
                description: 'Multi-cuisine restaurants'
              }
            ]
          }
        ]
      }
    ]
  }
];

interface CPSSNavigatorProps {
  onServiceSelect?: (service: CPSSLevel, breadcrumb: CPSSLevel[]) => void;
}

export default function CPSSNavigator({ onServiceSelect }: CPSSNavigatorProps) {
  const [currentLevel, setCurrentLevel] = useState<CPSSLevel[]>(cpssData);
  const [breadcrumb, setBreadcrumb] = useState<CPSSLevel[]>([]);

  const handleItemClick = (item: CPSSLevel) => {
    if (item.type === 'service') {
      // Service selected - trigger callback
      onServiceSelect?.(item, [...breadcrumb, item]);
    } else if (item.children) {
      // Navigate deeper
      setCurrentLevel(item.children);
      setBreadcrumb([...breadcrumb, item]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Back to root
      setCurrentLevel(cpssData);
      setBreadcrumb([]);
    } else {
      // Navigate to specific level
      const targetItem = breadcrumb[index];
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setCurrentLevel(targetItem.children || cpssData);
    }
  };

  const getLevelTitle = () => {
    if (breadcrumb.length === 0) return "Select Country";
    const lastItem = breadcrumb[breadcrumb.length - 1];
    switch (lastItem.type) {
      case 'country': return "Select Port";
      case 'port': return "Select Area";
      case 'suburb': return "Select Service";
      default: return "Navigate";
    }
  };

  const getLevelColor = (type: string) => {
    switch (type) {
      case 'country': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'port': return "bg-teal-100 text-teal-800 border-teal-200";
      case 'suburb': return "bg-purple-100 text-purple-800 border-purple-200";
      case 'service': return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center space-x-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(-1)}
            className="h-8 px-2 text-gray-600 hover:text-navy"
          >
            🌍 Home
          </Button>
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center space-x-2">
              <span className="text-gray-400">→</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className="h-8 px-2 text-gray-600 hover:text-navy"
              >
                {item.icon} {item.name}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Current Level Title */}
      <h3 className="text-lg font-semibold text-navy">{getLevelTitle()}</h3>

      {/* Current Level Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentLevel.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-ocean-teal"
            onClick={() => handleItemClick(item)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="font-medium text-navy">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getLevelColor(item.type)}>
                    {item.type}
                  </Badge>
                  {item.children && (
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {currentLevel.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-map-marked-alt text-4xl mb-4"></i>
          <p>No locations available at this level</p>
        </div>
      )}
    </div>
  );
}