import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface Question {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRank?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  views: number;
  answerCount: number;
  isResolved: boolean;
  isFromWhatsapp: boolean;
  category?: string;
  imageUrls: string[];
  engagementScore: number;
  authorProfilePictureUrl?: string;
  authorWhatsappDisplayName?: string;
}

interface QuestionCardProps {
  question: Question;
  onPress: () => void;
}

export default function QuestionCard({ question, onPress }: QuestionCardProps) {
  const timeAgo = (date: string) => {
    const now = new Date();
    const questionDate = new Date(date);
    const diffMs = now.getTime() - questionDate.getTime();
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

  const displayName = question.authorWhatsappDisplayName || question.authorName;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            {question.authorProfilePictureUrl ? (
              <Image 
                source={{ uri: question.authorProfilePictureUrl }} 
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Icon name="user" size={16} color="white" />
              </View>
            )}
            
            <View style={styles.authorDetails}>
              <Text style={styles.authorName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.authorMeta}>
                {question.authorRank && (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {question.authorRank.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.timestamp}>
                  {timeAgo(question.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statusBadges}>
            {question.isFromWhatsapp && (
              <Icon name="whatsapp" size={16} color="#25d366" />
            )}
            {question.isResolved && (
              <View style={styles.resolvedBadge}>
                <Icon name="check" size={12} color="white" />
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <Text style={styles.content} numberOfLines={3}>
          {question.content}
        </Text>

        {/* Images */}
        {question.imageUrls.length > 0 && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: question.imageUrls[0] }} 
              style={styles.questionImage}
            />
            {question.imageUrls.length > 1 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>
                  +{question.imageUrls.length - 1}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {question.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {question.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {question.tags.length > 3 && (
              <Text style={styles.moreTags}>
                +{question.tags.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Icon name="eye" size={12} color="#6b7280" />
              <Text style={styles.statText}>{question.views}</Text>
            </View>
            
            <View style={styles.stat}>
              <Icon 
                name="comment" 
                size={12} 
                color={question.answerCount > 0 ? '#0891b2' : '#6b7280'} 
              />
              <Text style={[
                styles.statText,
                question.answerCount > 0 && styles.statTextActive
              ]}>
                {question.answerCount}
              </Text>
            </View>

            <View style={styles.stat}>
              <Icon name="fire" size={12} color="#f59e0b" />
              <Text style={styles.statText}>{question.engagementScore}</Text>
            </View>
          </View>

          {question.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {question.category}
              </Text>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0891b2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  rankText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resolvedBadge: {
    backgroundColor: '#22c55e',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  questionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  moreImagesOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moreImagesText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontSize: 12,
    fontWeight: '500',
  },
  moreTags: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statTextActive: {
    color: '#0891b2',
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
});