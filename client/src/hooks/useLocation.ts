import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  source: 'device' | 'ship' | 'city';
}

interface LocationError {
  code: number;
  message: string;
}

export function useLocation(userId?: string, autoUpdate: boolean = true) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const requestDeviceLocation = async (userId?: string) => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by this browser' });
      return;
    }

    setIsLoading(true);
    setError(null);

    // Check permission status if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);
      } catch (e) {
        console.warn('Could not check geolocation permission');
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'device'
        };

        setLocation(locationData);
        setIsLoading(false);

        // If userId is provided, update location on server
        if (userId) {
          try {
            await apiRequest('POST', '/api/users/location/device', {
              userId,
              latitude: locationData.latitude,
              longitude: locationData.longitude
            });
            console.log('Device location updated on server');
          } catch (error) {
            console.error('Failed to update device location on server:', error);
          }
        }
      },
      (error) => {
        setError({
          code: error.code,
          message: getGeolocationErrorMessage(error.code)
        });
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  };

  const updateShipLocation = async (userId: string, imoNumber?: string, shipName?: string) => {
    if (!userId || (!imoNumber && !shipName)) {
      setError({ code: -1, message: 'Missing required parameters for ship location' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/users/location/ship', {
        userId,
        imoNumber,
        shipName
      });

      const data = await response.json();
      
      if (data.position) {
        const locationData: LocationData = {
          latitude: data.position.latitude,
          longitude: data.position.longitude,
          timestamp: Date.now(),
          source: 'ship'
        };
        setLocation(locationData);
      }
      
      setIsLoading(false);
      return data;
    } catch (error) {
      setError({ code: -1, message: 'Failed to update ship location' });
      setIsLoading(false);
      throw error;
    }
  };

  const watchDeviceLocation = (userId?: string) => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported' });
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          source: 'device'
        };

        setLocation(locationData);

        // Update server location if userId provided and location changed significantly
        if (userId && location) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            locationData.latitude,
            locationData.longitude
          );

          // Update if moved more than 100 meters
          if (distance > 0.1) {
            try {
              await apiRequest('POST', '/api/users/location/device', {
                userId,
                latitude: locationData.latitude,
                longitude: locationData.longitude
              });
            } catch (error) {
              console.error('Failed to update device location on server:', error);
            }
          }
        }
      },
      (error) => {
        setError({
          code: error.code,
          message: getGeolocationErrorMessage(error.code)
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000 // 30 seconds
      }
    );

    return watchId;
  };

  const stopWatching = (watchId: number) => {
    navigator.geolocation.clearWatch(watchId);
  };

  // Auto-request location on mount if enabled
  useEffect(() => {
    if (autoUpdate && userId) {
      requestDeviceLocation(userId);
      
      // Set up periodic location updates every 5 minutes
      const interval = setInterval(() => {
        requestDeviceLocation(userId);
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [userId, autoUpdate]);

  return {
    location,
    error,
    isLoading,
    permissionStatus,
    requestDeviceLocation,
    updateShipLocation,
    watchDeviceLocation,
    stopWatching
  };
}

function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access denied by user';
    case 2:
      return 'Location information unavailable';
    case 3:
      return 'Location request timed out';
    default:
      return 'An unknown location error occurred';
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}