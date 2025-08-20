import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import UserCard from '../components/UserCard';
import QBOTChatOverlay from '../components/QBOTChatOverlay';

const { width, height } = Dimensions.get('window');

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  company?: string | null;
  imoNumber: string | null;
  port: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  deviceLatitude?: number | null;
  deviceLongitude?: number | null;
  questionCount?: number;
  answerCount?: number;
  profilePictureUrl?: string;
  whatsappDisplayName?: string;
  distance?: number;
}

const MARITIME_RANK_CATEGORIES = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'junior_officers_above', label: 'Officers+' },
  { id: 'deck_officers', label: 'Deck' },
  { id: 'engineers', label: 'Engineers' },
  { id: 'crew', label: 'Crew' },
];

export default function DiscoveryScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [selectedRankCategory, setSelectedRankCategory] = useState('everyone');
  const [radiusKm, setRadiusKm] = useState(50);
  const [showQBOT, setShowQBOT] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<MapUser | null>(null);
  const [showScanAnimation, setShowScanAnimation] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // Get user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for discovery');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
      setUserLocation(coords);
      
      // Update device location on server
      updateLocationMutation.mutate(coords);
    })();
  }, []);

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: (coords: {lat: number; lng: number}) => 
      apiRequest('/api/users/location/device', {
        method: 'POST',
        body: { latitude: coords.lat, longitude: coords.lng }
      }),
  });

  // Fetch users query
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/users/search', searchQuery, selectedRankCategory, radiusKm],
    queryFn: () => apiRequest(`/api/users/search?q=${encodeURIComponent(searchQuery)}&rank=${selectedRankCategory}&radius=${radiusKm}`),
    enabled: !!userLocation,
  });

  // Scan animation
  const startScanAnimation = () => {
    setShowScanAnimation(true);
    Animated.loop(
      Animated.timing(scanAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
    
    setTimeout(() => {
      setShowScanAnimation(false);
      scanAnimation.setValue(0);
    }, 6000);
  };

  const handleKoiHaiSearch = () => {
    setSearchQuery('');
    startScanAnimation();
    refetch();
  };

  const handleUserPress = (userId: string) => {
    const user = users.find((u: MapUser) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      // Center map on user
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: user.deviceLatitude || user.latitude,
          longitude: user.deviceLongitude || user.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  };

  const getMarkerColor = (user: MapUser) => {
    if (user.deviceLatitude && user.deviceLongitude) return '#22c55e'; // Green for online
    return user.userType === 'sailor' ? '#dc2626' : '#ea580c'; // Red or orange
  };

  const resetView = () => {
    setSearchQuery('');
    setSelectedRankCategory('everyone');
    setSelectedUser(null);
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header - Matches Web App Design */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/qaaq-logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>QaaqConnect</Text>
        </View>
        
        <View style={styles.headerRight}>
          {user?.isAdmin && (
            <TouchableOpacity style={styles.adminButton}>
              <FontAwesome5 name="shield-alt" size={18} color="#ea580c" />
              <Text style={styles.adminText}>Admin</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.qbotButton}
            onPress={() => setShowQBOT(true)}
          >
            <FontAwesome5 name="robot" size={18} color="white" />
            <Text style={styles.qbotButtonText}>QBOT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Home Reset Button */}
        <TouchableOpacity style={styles.homeButton} onPress={resetView}>
          <FontAwesome5 name="home" size={20} color="white" />
        </TouchableOpacity>

        {/* Map Type Controls */}
        <View style={styles.mapControls}>
          {(['standard', 'satellite', 'hybrid'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.mapTypeButton, mapType === type && styles.activeMapType]}
              onPress={() => setMapType(type)}
            >
              <FontAwesome5 
                name={type === 'standard' ? 'map' : type === 'satellite' ? 'globe' : 'layer-group'} 
                size={16} 
                color={mapType === type ? '#ea580c' : '#6b7280'} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Enhanced Search Bar - Matches Web App */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <FontAwesome5 name="search" size={16} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Sailors/ Ships/ Company"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              {/* Premium Crown Icon */}
              <TouchableOpacity style={styles.premiumIcon}>
                <FontAwesome5 name="crown" size={16} color="#fbbf24" />
              </TouchableOpacity>
              {/* Clear Search Button */}
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <FontAwesome5 name="times" size={14} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Right Side Controls - Filter, Map, Radar */}
            <View style={styles.searchControls}>
              <TouchableOpacity style={styles.controlButton}>
                <FontAwesome5 name="filter" size={16} color="#ea580c" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <FontAwesome5 name="map" size={16} color="#ea580c" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <FontAwesome5 name="broadcast-tower" size={16} color="#ea580c" />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.koihaiButton}
            onPress={handleKoiHaiSearch}
          >
            <Text style={styles.koihaiText}>Koi Hai?</Text>
          </TouchableOpacity>
        </View>

        {/* Rank Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {MARITIME_RANK_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterChip,
                selectedRankCategory === category.id && styles.activeFilterChip
              ]}
              onPress={() => setSelectedRankCategory(category.id)}
            >
              <Text style={[
                styles.filterText,
                selectedRankCategory === category.id && styles.activeFilterText
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Map */}
        {userLocation && (
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            initialRegion={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* User location circle */}
            <Circle
              center={{
                latitude: userLocation.lat,
                longitude: userLocation.lng
              }}
              radius={radiusKm * 1000}
              strokeColor="rgba(8, 145, 178, 0.3)"
              fillColor="rgba(8, 145, 178, 0.1)"
            />

            {/* Scan animation circle */}
            {showScanAnimation && (
              <Animated.View
                style={[
                  styles.scanCircle,
                  {
                    transform: [{
                      scale: scanAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 2],
                      })
                    }],
                    opacity: scanAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 0.3, 0],
                    })
                  }
                ]}
              />
            )}

            {/* User markers */}
            {users.map((user: MapUser) => (
              <Marker
                key={user.id}
                coordinate={{
                  latitude: user.deviceLatitude || user.latitude,
                  longitude: user.deviceLongitude || user.longitude,
                }}
                pinColor={getMarkerColor(user)}
                onPress={() => handleUserPress(user.id)}
              >
                <View style={[styles.customMarker, { backgroundColor: getMarkerColor(user) }]}>
                  <FontAwesome5 name="anchor" size={12} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        {/* User Card Overlay */}
        {selectedUser && (
          <View style={styles.userCardOverlay}>
            <UserCard
              user={selectedUser}
              onChat={() => {/* Navigate to chat */}}
              onClose={() => setSelectedUser(null)}
            />
          </View>
        )}
      </View>

      {/* QBOT Chat Overlay */}
      <QBOTChatOverlay
        isVisible={showQBOT}
        onClose={() => setShowQBOT(false)}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626', // Red text
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
  },
  adminText: {
    marginLeft: 6,
    color: '#ea580c', // Orange text
    fontWeight: '500',
  },
  qbotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ea580c', // Orange background
    borderRadius: 8,
    gap: 4,
  },
  qbotButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  clearButton: {
    position: 'absolute',
    right: 36,
    top: '50%',
    marginTop: -10,
    padding: 4,
  },
  mapContainer: {
    flex: 1,
  },
  homeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#dc2626', // Red background
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControls: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    zIndex: 1000,
  },
  mapTypeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeMapType: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ea580c', // Orange border
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    left: 80,
    zIndex: 1000,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchControls: {
    flexDirection: 'row',
    gap: 4,
  },
  controlButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 40, // Make room for crown and clear button
    fontSize: 16,
    color: '#374151',
  },
  premiumIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
    padding: 4,
  },
  koihaiButton: {
    backgroundColor: '#dc2626', // Red background
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  koihaiText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  filterContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  activeFilterChip: {
    backgroundColor: '#ea580c', // Orange background
    borderColor: '#ea580c',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterText: {
    color: 'white',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  scanCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#0891b2',
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
  },
  userCardOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
});