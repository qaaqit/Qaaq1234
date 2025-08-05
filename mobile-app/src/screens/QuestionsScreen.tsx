import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import QuestionCard from '../components/QuestionCard';

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

const QUESTION_CATEGORIES = [
  'All',
  'Navigation',
  'Engineering',
  'Safety',
  'Regulations',
  'Career',
  'Ship Operations',
  'Port Procedures',
  'Documentation',
  'Equipment',
];

export default function QuestionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch questions
  const { 
    data: questions = [], 
    isLoading, 
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useQuery({
    queryKey: ['/api/questions', searchQuery, selectedCategory],
    queryFn: ({ pageParam = 0 }) => 
      apiRequest(`/api/questions?page=${pageParam}&q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&limit=20`),
    enabled: true,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleQuestionPress = (questionId: string) => {
    // Navigate to question detail screen
    console.log('Navigate to question:', questionId);
  };

  const handleAskQuestion = () => {
    // Navigate to ask question screen
    console.log('Navigate to ask question');
  };

  const renderQuestion = ({ item }: { item: Question }) => (
    <QuestionCard
      question={item}
      onPress={() => handleQuestionPress(item.id)}
    />
  );

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      {QUESTION_CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category && styles.activeCategoryChip
          ]}
          onPress={() => handleCategorySelect(category)}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === category && styles.activeCategoryText
          ]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="question-circle" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No questions found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory !== 'All' 
          ? 'Try adjusting your search or filters'
          : 'Be the first to ask a question!'
        }
      </Text>
      <TouchableOpacity style={styles.askButton} onPress={handleAskQuestion}>
        <Icon name="plus" size={16} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.askButtonText}>Ask Question</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadMore = () => {
    if (!hasNextPage) return null;
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={() => fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        <Text style={styles.loadMoreText}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search questions..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => handleSearch('')}
            >
              <Icon name="times" size={14} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.askQuestionButton} onPress={handleAskQuestion}>
          <Icon name="plus" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Questions List */}
      {questions.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={questions}
          renderItem={renderQuestion}
          keyExtractor={(item) => item.id}
          style={styles.questionsList}
          contentContainerStyle={styles.questionsContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#0891b2']}
              tintColor="#0891b2"
            />
          }
          ListFooterComponent={renderLoadMore}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAskQuestion}>
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  clearSearchButton: {
    padding: 4,
  },
  askQuestionButton: {
    backgroundColor: '#0891b2',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeCategoryChip: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeCategoryText: {
    color: 'white',
  },
  questionsList: {
    flex: 1,
  },
  questionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Space for FAB
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
    marginBottom: 24,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  askButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadMoreButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    color: '#0891b2',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0891b2',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});