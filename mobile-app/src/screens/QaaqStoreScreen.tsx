import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  category: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  seller: string;
  shippingInfo: string;
}

const STORE_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: 'th-large' },
  { id: 'navigation', name: 'Navigation', icon: 'compass' },
  { id: 'safety', name: 'Safety', icon: 'shield-alt' },
  { id: 'tools', name: 'Tools', icon: 'tools' },
  { id: 'electronics', name: 'Electronics', icon: 'microchip' },
  { id: 'clothing', name: 'Maritime Wear', icon: 'tshirt' },
  { id: 'books', name: 'Books & Manuals', icon: 'book' },
];

export default function QaaqStoreScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<string[]>([]);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/store/products', selectedCategory, searchQuery],
    queryFn: () => apiRequest(`/api/store/products?category=${selectedCategory}&q=${encodeURIComponent(searchQuery)}`),
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest('/api/store/cart/add', {
        method: 'POST',
        body: { productId, quantity: 1 }
      }),
    onSuccess: (data, productId) => {
      setCartItems(prev => [...prev, productId]);
    },
  });

  const handleAddToCart = (productId: string) => {
    addToCartMutation.mutate(productId);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const renderCategory = ({ item }: { item: typeof STORE_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.activeCategoryItem
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Icon 
        name={item.icon} 
        size={20} 
        color={selectedCategory === item.id ? 'white' : '#6b7280'} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.activeCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      
      {!item.inStock && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.productRating}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= item.rating ? 'star' : 'star-o'}
                size={12}
                color="#fbbf24"
              />
            ))}
          </View>
          <Text style={styles.reviewCount}>
            ({item.reviewCount})
          </Text>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatPrice(item.price, item.currency)}
            </Text>
            <Text style={styles.seller}>
              by {item.seller}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (!item.inStock || cartItems.includes(item.id)) && styles.addToCartButtonDisabled
            ]}
            onPress={() => handleAddToCart(item.id)}
            disabled={!item.inStock || cartItems.includes(item.id) || addToCartMutation.isPending}
          >
            <Icon 
              name={cartItems.includes(item.id) ? 'check' : 'cart-plus'} 
              size={14} 
              color="white" 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.shippingInfo}>
          <Icon name="shipping-fast" size={10} color="#6b7280" /> {item.shippingInfo}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="store-alt" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Check back soon for new maritime products'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="store" size={24} color="#0891b2" />
          <Text style={styles.headerTitle}>QAAQ Store</Text>
        </View>
        
        <TouchableOpacity style={styles.cartButton}>
          <Icon name="shopping-cart" size={20} color="#0891b2" />
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search maritime products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="times" size={14} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STORE_CATEGORIES}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      />

      {/* Products Grid */}
      {products.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={styles.productsList}
          contentContainerStyle={styles.productsContent}
          columnWrapperStyle={styles.productRow}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeCategoryItem: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  activeCategoryText: {
    color: 'white',
  },
  productsList: {
    flex: 1,
  },
  productsContent: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 10,
    color: '#6b7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0891b2',
  },
  seller: {
    fontSize: 10,
    color: '#6b7280',
  },
  addToCartButton: {
    backgroundColor: '#0891b2',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  shippingInfo: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});