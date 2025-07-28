import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image?: string;
  inStock: boolean;
  deliveryDays: number;
  seller: string;
  location: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface QaaqStoreProps {
  location: string;
  suburb: string;
  port: string;
  country: string;
  userShipSchedule?: {
    arrivalDate: string;
    departureDate: string;
  };
}

// Sample products for different locations
const generateProducts = (location: string): Product[] => [
  {
    id: `${location}-1`,
    name: "Maritime Safety Kit",
    description: "Complete safety equipment package including life jacket, emergency whistle, and flashlight",
    price: 2500,
    currency: "INR",
    category: "Safety Equipment",
    inStock: true,
    deliveryDays: 1,
    seller: "Qaaq Marine Supplies",
    location: location
  },
  {
    id: `${location}-2`,
    name: "Ship Communication Device",
    description: "Handheld marine radio with weather alerts and emergency channels",
    price: 4200,
    currency: "INR", 
    category: "Electronics",
    inStock: true,
    deliveryDays: 2,
    seller: "Qaaq Electronics",
    location: location
  },
  {
    id: `${location}-3`,
    name: "Local SIM Card & Data Plan",
    description: "Pre-activated local SIM with 30-day unlimited data plan",
    price: 800,
    currency: "INR",
    category: "Connectivity",
    inStock: true,
    deliveryDays: 1,
    seller: "Qaaq Telecom",
    location: location
  },
  {
    id: `${location}-4`,
    name: "Fresh Provision Box",
    description: "Selection of fresh fruits, vegetables, and local specialties",
    price: 1500,
    currency: "INR",
    category: "Food & Provisions",
    inStock: true,
    deliveryDays: 1,
    seller: "Qaaq Fresh Foods",
    location: location
  },
  {
    id: `${location}-5`,
    name: "Port City Tourist Guide",
    description: "Comprehensive guide with maps, attractions, and local recommendations",
    price: 300,
    currency: "INR",
    category: "Information",
    inStock: true,
    deliveryDays: 1,
    seller: "Qaaq Publications",
    location: location
  }
];

export default function QaaqStore({ location, suburb, port, country, userShipSchedule }: QaaqStoreProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setProducts(generateProducts(`${suburb}, ${port}`));
  }, [suburb, port]);

  const categories = ["All", "Safety Equipment", "Electronics", "Connectivity", "Food & Provisions", "Information"];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create order with Razorpay
      const orderData = {
        items: cart,
        totalAmount: getTotalAmount(),
        currency: "INR",
        deliveryLocation: `${suburb}, ${port}, ${country}`,
        shipSchedule: userShipSchedule,
        storeLocation: location
      };

      const response = await apiRequest('POST', '/api/qaaq-store/create-order', orderData);
      const { razorpayOrderId, amount } = response;

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: "INR",
        name: "Qaaq Store",
        description: `Pre-order delivery to ${port}`,
        order_id: razorpayOrderId,
        handler: function (response: any) {
          toast({
            title: "Order Successful!",
            description: `Order will be ready for delivery when your ship arrives at ${port}`,
          });
          setCart([]);
        },
        prefill: {
          name: "Sailor",
          email: "sailor@ship.com",
        },
        theme: {
          color: "#0891b2"
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error) {
      toast({
        title: "Checkout Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <div className="bg-gradient-to-r from-navy to-ocean-teal text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <i className="fas fa-store mr-3"></i>
              Qaaq Store - {suburb}
            </h2>
            <p className="text-white/80 mt-1">
              Pre-order for delivery at {port}, {country}
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-lg p-3">
              <p className="text-sm">Ship Arrival</p>
              <p className="font-semibold">
                {userShipSchedule?.arrivalDate || "Schedule TBA"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {product.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-navy">
                    ₹{product.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {product.deliveryDays} day delivery
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{product.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>Seller: {product.seller}</p>
                  <p className={`font-medium ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                    {product.inStock ? "In Stock" : "Out of Stock"}
                  </p>
                </div>
                <Button
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                  className="bg-ocean-teal hover:bg-cyan-600"
                >
                  <i className="fas fa-cart-plus mr-2"></i>
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shopping Cart */}
      {cart.length > 0 && (
        <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-hidden shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Shopping Cart ({cart.length})</span>
              <span className="text-navy">₹{getTotalAmount().toLocaleString()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-48 overflow-y-auto">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-600">₹{item.price} x {item.quantity}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="h-6 w-6 p-0"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-4 border-t">
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-navy hover:bg-navy/90"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <i className="fas fa-credit-card mr-2"></i>
                  Pay with Razorpay
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}