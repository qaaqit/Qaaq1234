import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface User {
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

interface UserCardProps {
  user: User;
  onChat: () => void;
  onClose: () => void;
}

const getRankAbbreviation = (rank: string): string => {
  const abbreviations: { [key: string]: string } = {
    'chief_engineer': 'CE',
    'second_engineer': '2E',
    'third_engineer': '3E',
    'fourth_engineer': '4E',
    'junior_engineer': 'JE',
    'engine_cadet': 'E/C',
    'deck_cadet': 'D/C',
    'electrical_engineer': 'ETO',
    'master': 'CAPT',
    'chief_officer': 'C/O',
    'second_officer': '2/O',
    'third_officer': '3/O',
    'trainee': 'TRN',
    'other': 'OTHER',
    'captain': 'CAPT',
    'chief engineer': 'CE',
    'chief officer': 'CO',
    'first engineer': '1E',
    'first officer': '1O',
    'second engineer': '2E',
    'second officer': '2O',
    'third engineer': '3E',
    'third officer': '3O',
    'fourth engineer': '4E',
    'fourth officer': '4O',
    'bosun': 'BSN',
    'able seaman': 'AB',
    'ordinary seaman': 'OS',
    'oiler': 'OLR',
    'wiper': 'WPR',
    'cook': 'CK',
    'steward': 'STW',
    'radio officer': 'RO',
    'electrician': 'ELE',
    'fitter': 'FIT',
    'officer': 'OFF',
    'engineer': 'ENG',
    'crew': 'CREW'
  };
  
  const lowerRank = rank.toLowerCase().trim();
  return abbreviations[lowerRank] || rank.substring(0, 3).toUpperCase();
};

export default function UserCard({ user, onChat, onClose }: UserCardProps) {
  const isOnline = !!(user.deviceLatitude && user.deviceLongitude);
  const displayName = user.whatsappDisplayName || user.fullName;
  const location = user.city && user.country ? `${user.city}, ${user.country}` : user.country || 'Unknown';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <FontAwesome5 name="times" size={16} color="#6b7280" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          {/* Profile Picture */}
          <TouchableOpacity style={styles.profileContainer} onPress={onChat}>
            {user.profilePictureUrl ? (
              <Image 
                source={{ uri: user.profilePictureUrl }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profilePlaceholder, { backgroundColor: user.userType === 'sailor' ? '#dc2626' : '#ea580c' }]}>
                <FontAwesome5 name="user" size={24} color="white" />
              </View>
            )}
            
            {/* Online Status */}
            {isOnline && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </TouchableOpacity>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            
            {user.rank && (
              <View style={styles.rankContainer}>
                <View style={[styles.rankBadge, { backgroundColor: user.userType === 'sailor' ? '#dc2626' : '#ea580c' }]}>
                  <Text style={styles.rankText}>
                    {getRankAbbreviation(user.rank)}
                  </Text>
                </View>
                <Text style={styles.userType}>
                  {user.userType === 'sailor' ? 'Sailor' : 'Local'}
                </Text>
              </View>
            )}
            
            {/* Location */}
            <View style={styles.locationContainer}>
              <FontAwesome5 name="map-marker-alt" size={12} color="#6b7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>

            {/* Distance */}
            {user.distance && (
              <View style={styles.distanceContainer}>
                <FontAwesome5 name="route" size={12} color="#6b7280" />
                <Text style={styles.distanceText}>
                  {user.distance < 1 
                    ? `${(user.distance * 1000).toFixed(0)}m away`
                    : `${user.distance.toFixed(1)}km away`
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Ship Info */}
        {user.shipName && (
          <View style={styles.shipInfo}>
            <View style={styles.shipHeader}>
              <FontAwesome5 name="ship" size={14} color="#ea580c" />
              <Text style={styles.shipName} numberOfLines={1}>
                {user.shipName}
              </Text>
            </View>
            
            <View style={styles.shipDetails}>
              {user.imoNumber && (
                <Text style={styles.shipDetail}>
                  IMO: {user.imoNumber}
                </Text>
              )}
              {user.company && (
                <Text style={styles.shipDetail} numberOfLines={1}>
                  {user.company}
                </Text>
              )}
              {user.port && (
                <Text style={styles.shipDetail} numberOfLines={1}>
                  Port: {user.port}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Q&A Stats */}
        {(user.questionCount || user.answerCount) && (
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <FontAwesome5 name="question-circle" size={14} color="#6b7280" />
              <Text style={styles.statText}>
                {user.questionCount || 0} questions
              </Text>
            </View>
            <View style={styles.stat}>
              <FontAwesome5 name="comment" size={14} color="#6b7280" />
              <Text style={styles.statText}>
                {user.answerCount || 0} answers
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <FontAwesome5 name="comment" size={16} color="white" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileButton}>
            <FontAwesome5 name="user" size={16} color="#ea580c" />
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  rankText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  shipInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shipName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  shipDetails: {
    gap: 2,
  },
  shipDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 8,
  },
  chatButtonText: {
    marginLeft: 8,
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0891b2',
  },
  profileButtonText: {
    marginLeft: 8,
    color: '#0891b2',
    fontWeight: '600',
    fontSize: 16,
  },
});