import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://mushypiyush-workspace.replit.app'; // Production Replit URL

interface User {
  id: string;
  fullName: string;
  userType: 'sailor' | 'local';
  rank?: string;
  shipName?: string;
  city?: string;
  port?: string;
  latitude?: number;
  longitude?: number;
  whatsAppProfilePictureUrl?: string;
  whatsAppDisplayName?: string;
}

interface MapScreenProps {
  navigation: any;
}

const INITIAL_REGION: Region = {
  latitude: 19.0760,
  longitude: 72.8777, // Mumbai coordinates as default
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapScreen({ navigation }: MapScreenProps) {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(INITIAL_REGION);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    requestLocationPermission();
    fetchNearbyUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchText, users]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        
        // Update user location on server
        updateLocationOnServer(location.coords.latitude, location.coords.longitude);
      } else {
        Alert.alert(
          'Location Permission',
          'Location access is needed to find nearby sailors.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const updateLocationOnServer = async (latitude: number, longitude: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/users/location/device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const fetchNearbyUsers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/users/search`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch nearby users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      user.rank?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.shipName?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.port?.toLowerCase().includes(searchText.toLowerCase())
    );

    setFilteredUsers(filtered);
  };

  const handleKoiHaiSearch = () => {
    if (searchText.trim()) {
      filterUsers();
    } else {
      // Show all nearby users when no search text
      setFilteredUsers(users);
    }
    setShowUsersList(true);
  };

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    if (user.latitude && user.longitude) {
      setMapRegion({
        latitude: user.latitude,
        longitude: user.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleChatPress = (user: User) => {
    navigation.navigate('DM', { userId: user.id, userName: user.fullName });
  };

  const renderUserCard = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.userCardContent}>
        <View style={styles.userAvatar}>
          {item.whatsAppProfilePictureUrl ? (
            <Image 
              source={{ uri: item.whatsAppProfilePictureUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <Icon 
              name={item.userType === 'sailor' ? 'directions-boat' : 'location-city'} 
              size={24} 
              color="#0891b2" 
            />
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          {item.rank && <Text style={styles.userRank}>{item.rank}</Text>}
          {item.shipName && <Text style={styles.userShip}>{item.shipName}</Text>}
          <Text style={styles.userLocation}>
            {item.city || item.port || 'Location not available'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleChatPress(item)}
        >
          <Icon name="chat" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Koi Hai? Discovery</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={24} color="#0891b2" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Sailors/ Ships/ Company"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
          <Icon name="workspace-premium" size={20} color="#f59e0b" style={styles.premiumIcon} />
        </View>
        
        <TouchableOpacity
          style={styles.koiHaiButton}
          onPress={handleKoiHaiSearch}
        >
          <LinearGradient
            colors={['#0891b2', '#06b6d4']}
            style={styles.koiHaiGradient}
          >
            <Text style={styles.koiHaiText}>Koi Hai?</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {filteredUsers.map((user) => (
            user.latitude && user.longitude ? (
              <Marker
                key={user.id}
                coordinate={{
                  latitude: user.latitude,
                  longitude: user.longitude,
                }}
                title={user.fullName}
                description={`${user.rank || user.userType} - ${user.city || user.port || 'Unknown location'}`}
                onPress={() => handleUserPress(user)}
              >
                <View style={[
                  styles.markerContainer,
                  { backgroundColor: user.userType === 'sailor' ? '#0891b2' : '#f59e0b' }
                ]}>
                  <Icon 
                    name={user.userType === 'sailor' ? 'directions-boat' : 'location-city'} 
                    size={16} 
                    color="#ffffff" 
                  />
                </View>
              </Marker>
            ) : null
          ))}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton}>
            <Icon name="map" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton}>
            <Icon name="satellite" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Toggle Users List Button */}
        <TouchableOpacity
          style={styles.toggleListButton}
          onPress={() => setShowUsersList(!showUsersList)}
        >
          <Icon 
            name={showUsersList ? "keyboard-arrow-down" : "keyboard-arrow-up"} 
            size={24} 
            color="#ffffff" 
          />
        </TouchableOpacity>
      </View>

      {/* Users List */}
      {showUsersList && (
        <View style={styles.usersListContainer}>
          <View style={styles.usersListHeader}>
            <Text style={styles.usersListTitle}>
              {filteredUsers.length} maritime professionals found
            </Text>
          </View>
          
          <FlatList
            data={filteredUsers}
            renderItem={renderUserCard}
            keyExtractor={(item) => item.id}
            style={styles.usersList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0891b2']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 12,
  },
  premiumIcon: {
    marginLeft: 8,
  },
  koiHaiButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  koiHaiGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  koiHaiText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapControls: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    flexDirection: 'column',
  },
  mapControlButton: {
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
  toggleListButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: '#0891b2',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  usersListContainer: {
    backgroundColor: '#ffffff',
    maxHeight: height * 0.4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  usersListHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  usersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  userRank: {
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500',
    marginBottom: 2,
  },
  userShip: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#94a3b8',
  },
  chatButton: {
    backgroundColor: '#0891b2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});