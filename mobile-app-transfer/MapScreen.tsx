import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  latitude: number;
  longitude: number;
  port: string | null;
  city: string | null;
  country: string | null;
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [users, setUsers] = useState<MapUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 20.5937, // Default to Mumbai coordinates
    longitude: 78.9629,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });

  useEffect(() => {
    getLocationPermission();
  }, []);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find nearby sailors'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your location');
    }
  };

  const searchNearbyUsers = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please allow location access first');
      return;
    }

    setIsSearching(true);
    try {
      // Connect to QaaqConnect API - replace with your actual API endpoint
      const response = await fetch('YOUR_API_ENDPOINT/api/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          radius: 50, // 50km radius
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        // Fallback to mock data for development
        const mockUsers: MapUser[] = [
          {
            id: '1',
            fullName: 'Captain John Smith',
            userType: 'sailor',
            rank: 'Captain',
            shipName: 'MV Atlantic',
            latitude: location.coords.latitude + 0.01,
            longitude: location.coords.longitude + 0.01,
            port: 'Mumbai Port',
            city: 'Mumbai',
            country: 'India',
          },
          {
            id: '2',
            fullName: 'Chief Engineer Mike',
            userType: 'sailor',
            rank: 'Chief Engineer',
            shipName: 'MV Pacific',
            latitude: location.coords.latitude - 0.01,
            longitude: location.coords.longitude - 0.01,
            port: 'Mumbai Port',
            city: 'Mumbai',
            country: 'India',
          },
        ];
        setUsers(mockUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      // Use mock data for development
      const mockUsers: MapUser[] = [
        {
          id: '1',
          fullName: 'Captain John Smith',
          userType: 'sailor',
          rank: 'Captain',
          shipName: 'MV Atlantic',
          latitude: location.coords.latitude + 0.01,
          longitude: location.coords.longitude + 0.01,
          port: 'Mumbai Port',
          city: 'Mumbai',
          country: 'India',
        },
      ];
      setUsers(mockUsers);
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = () => {
    setUsers([]);
    if (location) {
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onRegionChangeComplete={setMapRegion}
      >
        {users.map((user) => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.latitude,
              longitude: user.longitude,
            }}
            title={user.fullName}
            description={`${user.rank} - ${user.shipName}`}
          >
            <View style={styles.markerContainer}>
              <Ionicons 
                name="boat" 
                size={24} 
                color={user.userType === 'sailor' ? '#1e3a8a' : '#0891b2'} 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.koiHaiButton, isSearching && styles.searchingButton]}
          onPress={searchNearbyUsers}
          disabled={isSearching}
        >
          <Ionicons 
            name="search" 
            size={20} 
            color="#ffffff" 
            style={styles.buttonIcon} 
          />
          <Text style={styles.koiHaiText}>
            {isSearching ? 'Searching...' : 'Koi Hai?'}
          </Text>
        </TouchableOpacity>

        {users.length > 0 && (
          <TouchableOpacity style={styles.resetButton} onPress={resetSearch}>
            <Ionicons name="home" size={20} color="#ffffff" />
            <Text style={styles.resetText}>Home</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Counter */}
      {users.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Found {users.length} sailor{users.length !== 1 ? 's' : ''} nearby
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  koiHaiButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchingButton: {
    backgroundColor: '#6b7280',
  },
  buttonIcon: {
    marginRight: 8,
  },
  koiHaiText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resetText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultsContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(8, 145, 178, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  resultsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  markerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
});