import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  location?: string;
  imageUrl?: string;
  isPrivate: boolean;
  isMember: boolean;
  lastActivity: string;
  createdBy: string;
  tags: string[];
}

interface GroupCardProps {
  group: Group;
  onPress: () => void;
  onJoin: () => void;
  onLeave: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
}

export default function GroupCard({ 
  group, 
  onPress, 
  onJoin, 
  onLeave, 
  isJoining = false, 
  isLeaving = false 
}: GroupCardProps) {
  const timeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          {group.imageUrl ? (
            <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
          ) : (
            <View style={styles.groupImagePlaceholder}>
              <Icon name="users" size={24} color="white" />
            </View>
          )}
          
          <View style={styles.groupInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.groupName} numberOfLines={1}>
                {group.name}
              </Text>
              {group.isPrivate && (
                <Icon name="lock" size={12} color="#6b7280" />
              )}
            </View>
            
            <View style={styles.metaRow}>
              <View style={styles.memberCount}>
                <Icon name="users" size={12} color="#6b7280" />
                <Text style={styles.memberText}>
                  {group.memberCount} members
                </Text>
              </View>
              
              {group.location && (
                <View style={styles.location}>
                  <Icon name="map-marker-alt" size={12} color="#6b7280" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {group.location}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {group.description}
        </Text>

        {/* Tags */}
        {group.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {group.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {group.tags.length > 3 && (
              <Text style={styles.moreTags}>
                +{group.tags.length - 3}
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.activityInfo}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {group.category}
              </Text>
            </View>
            
            <Text style={styles.lastActivity}>
              Active {timeAgo(group.lastActivity)}
            </Text>
          </View>

          {group.isMember ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.leaveButton]}
              onPress={onLeave}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <Icon name="spinner" size={14} color="#ef4444" />
              ) : (
                <>
                  <Icon name="sign-out-alt" size={14} color="#ef4444" />
                  <Text style={styles.leaveButtonText}>Leave</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.joinButton]}
              onPress={onJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <Icon name="spinner" size={14} color="white" />
              ) : (
                <>
                  <Icon name="plus" size={14} color="white" />
                  <Text style={styles.joinButtonText}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  groupImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0891b2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 12,
    color: '#6b7280',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#0891b2',
    fontSize: 10,
    fontWeight: '500',
  },
  moreTags: {
    color: '#6b7280',
    fontSize: 10,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryText: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '500',
  },
  lastActivity: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  joinButton: {
    backgroundColor: '#0891b2',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});