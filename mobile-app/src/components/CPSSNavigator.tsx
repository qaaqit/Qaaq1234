import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery } from '@tanstack/react-query';
import { cpssApi } from '../utils/api';

interface CPSSItem {
  id: string;
  name: string;
  code?: string;
  userCount?: number;
  description?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  level: 'country' | 'port' | 'suburb' | 'service';
}

export default function CPSSNavigator() {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentLevel, setCurrentLevel] = useState<'country' | 'port' | 'suburb' | 'service'>('country');

  // Get current parent ID for API calls
  const getCurrentParentId = () => {
    if (breadcrumbs.length === 0) return null;
    return breadcrumbs[breadcrumbs.length - 1].id;
  };

  // Fetch data based on current level
  const { data: items = [], isLoading } = useQuery({
    queryKey: [`/api/cpss/${currentLevel}`, getCurrentParentId()],
    queryFn: () => {
      switch (currentLevel) {
        case 'country':
          return cpssApi.getCountries();
        case 'port':
          return cpssApi.getPorts(getCurrentParentId()!);
        case 'suburb':
          return cpssApi.getSuburbs(getCurrentParentId()!);
        case 'service':
          return cpssApi.getServices(getCurrentParentId()!);
        default:
          return [];
      }
    },
  });

  const handleItemPress = (item: CPSSItem) => {
    const newBreadcrumb: BreadcrumbItem = {
      id: item.id,
      name: item.name,
      level: currentLevel,
    };

    setBreadcrumbs(prev => [...prev, newBreadcrumb]);

    // Move to next level
    switch (currentLevel) {
      case 'country':
        setCurrentLevel('port');
        break;
      case 'port':
        setCurrentLevel('suburb');
        break;
      case 'suburb':
        setCurrentLevel('service');
        break;
    }
  };

  const handleBreadcrumbPress = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);

    // Determine level based on breadcrumb length
    switch (newBreadcrumbs.length) {
      case 0:
        setCurrentLevel('country');
        break;
      case 1:
        setCurrentLevel('port');
        break;
      case 2:
        setCurrentLevel('suburb');
        break;
      case 3:
        setCurrentLevel('service');
        break;
    }
  };

  const goHome = () => {
    setBreadcrumbs([]);
    setCurrentLevel('country');
  };

  const goBack = () => {
    if (breadcrumbs.length > 0) {
      handleBreadcrumbPress(breadcrumbs.length - 2);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'country':
        return 'globe';
      case 'port':
        return 'anchor';
      case 'suburb':
        return 'map-marker-alt';
      case 'service':
        return 'cog';
      default:
        return 'circle';
    }
  };

  const getLevelTitle = (level: string) => {
    switch (level) {
      case 'country':
        return 'Countries';
      case 'port':
        return 'Ports';
      case 'suburb':
        return 'Suburbs';
      case 'service':
        return 'Services';
      default:
        return 'Navigation';
    }
  };

  const renderItem = ({ item }: { item: CPSSItem }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleItemPress(item)}
      disabled={currentLevel === 'service'} // Services are terminal
    >
      <View style={styles.itemContent}>
        <View style={styles.itemLeft}>
          <View style={styles.itemIcon}>
            <Icon 
              name={getLevelIcon(currentLevel)} 
              size={16} 
              color="#0891b2" 
            />
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            
            {item.code && (
              <Text style={styles.itemCode}>
                {item.code}
              </Text>
            )}
            
            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.itemRight}>
          {item.userCount !== undefined && (
            <View style={styles.userCount}>
              <Icon name="users" size={12} color="#6b7280" />
              <Text style={styles.userCountText}>
                {item.userCount}
              </Text>
            </View>
          )}
          
          {currentLevel !== 'service' && (
            <Icon name="chevron-right" size={16} color="#d1d5db" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBreadcrumbs = () => (
    <View style={styles.breadcrumbContainer}>
      <TouchableOpacity style={styles.breadcrumbItem} onPress={goHome}>
        <Icon name="home" size={14} color="#0891b2" />
        <Text style={styles.breadcrumbText}>Home</Text>
      </TouchableOpacity>

      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <Icon name="chevron-right" size={12} color="#9ca3af" />
          <TouchableOpacity
            style={styles.breadcrumbItem}
            onPress={() => handleBreadcrumbPress(index)}
          >
            <Text style={[
              styles.breadcrumbText,
              index === breadcrumbs.length - 1 && styles.activeBreadcrumb
            ]}>
              {crumb.name}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="map-marked-alt" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No {getLevelTitle(currentLevel).toLowerCase()} found</Text>
      <Text style={styles.emptySubtitle}>
        This location may not have any {getLevelTitle(currentLevel).toLowerCase()} available yet.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="map-marked-alt" size={20} color="#0891b2" />
          <Text style={styles.headerTitle}>CPSS Navigator</Text>
        </View>
        
        {breadcrumbs.length > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Icon name="arrow-left" size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Current Level Title */}
      <View style={styles.levelHeader}>
        <Icon name={getLevelIcon(currentLevel)} size={18} color="#374151" />
        <Text style={styles.levelTitle}>
          {getLevelTitle(currentLevel)}
        </Text>
        <Text style={styles.itemCount}>
          {items.length} items
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={styles.loadingText}>
            Loading {getLevelTitle(currentLevel).toLowerCase()}...
          </Text>
        </View>
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  activeBreadcrumb: {
    color: '#0891b2',
    fontWeight: '600',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  itemCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
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