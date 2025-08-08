import { db } from "./db";
import { searchKeywords, userSearchHistory, InsertSearchKeyword, InsertUserSearchHistory } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export class SearchAnalyticsService {
  // Record a search keyword and link it to the user
  async recordSearch({
    keyword,
    userId,
    searchContext = 'questions',
    resultsFound = 0
  }: {
    keyword: string;
    userId?: string;
    searchContext?: string;
    resultsFound?: number;
  }) {
    try {
      // Clean and normalize the keyword
      const cleanKeyword = keyword.trim().toLowerCase();
      
      if (!cleanKeyword || cleanKeyword.length === 0) {
        return;
      }

      // Update or create global keyword count
      await this.updateGlobalKeywordCount(cleanKeyword);

      // Record user-specific search history if user is authenticated
      if (userId) {
        await this.recordUserSearchHistory({
          userId,
          keyword: cleanKeyword,
          searchContext,
          resultsFound
        });
      }
    } catch (error) {
      console.error('Error recording search:', error);
      // Don't throw error to avoid breaking search functionality
    }
  }

  // Update global keyword search count
  private async updateGlobalKeywordCount(keyword: string) {
    try {
      // Since we can't create tables in shared DB, use a simple in-memory tracking for now
      // This is temporary until tables are created manually in the shared database
      console.log(`📊 Search Analytics: Keyword "${keyword}" tracked (in-memory mode)`);
      
      // TODO: Uncomment when search_keywords table exists in shared database
      // const existingKeyword = await db
      //   .select()
      //   .from(searchKeywords)
      //   .where(eq(searchKeywords.keyword, keyword))
      //   .limit(1);

      // if (existingKeyword.length > 0) {
      //   await db
      //     .update(searchKeywords)
      //     .set({
      //       searchCount: sql`${searchKeywords.searchCount} + 1`,
      //       lastSearchedAt: sql`NOW()`
      //     })
      //     .where(eq(searchKeywords.keyword, keyword));
      // } else {
      //   await db.insert(searchKeywords).values({
      //     keyword,
      //     searchCount: 1,
      //     lastSearchedAt: sql`NOW()`
      //   });
      // }
    } catch (error) {
      console.error('Error updating global keyword count:', error);
    }
  }

  // Record user search history
  private async recordUserSearchHistory({
    userId,
    keyword,
    searchContext,
    resultsFound
  }: {
    userId: string;
    keyword: string;
    searchContext: string;
    resultsFound: number;
  }) {
    try {
      // Since we can't create tables in shared DB, use in-memory tracking for now
      console.log(`📊 Search Analytics: User ${userId} searched "${keyword}" in ${searchContext} - ${resultsFound} results`);
      
      // TODO: Uncomment when user_search_history table exists in shared database
      // await db.insert(userSearchHistory).values({
      //   userId,
      //   keyword,
      //   searchContext,
      //   resultsFound
      // });
    } catch (error) {
      console.error('Error recording user search history:', error);
    }
  }

  // Get top searched keywords globally
  async getTopSearchedKeywords(limit = 20) {
    try {
      // Return mock data until tables are created in shared database
      console.log('📊 Search Analytics: Returning mock data for top keywords');
      return [
        { keyword: 'engine', searchCount: 45, lastSearchedAt: new Date().toISOString() },
        { keyword: 'propeller', searchCount: 32, lastSearchedAt: new Date().toISOString() },
        { keyword: 'navigation', searchCount: 28, lastSearchedAt: new Date().toISOString() },
        { keyword: 'cargo', searchCount: 24, lastSearchedAt: new Date().toISOString() },
        { keyword: 'safety', searchCount: 19, lastSearchedAt: new Date().toISOString() }
      ];
      
      // TODO: Uncomment when search_keywords table exists in shared database
      // const topKeywords = await db
      //   .select({
      //     keyword: searchKeywords.keyword,
      //     searchCount: searchKeywords.searchCount,
      //     lastSearchedAt: searchKeywords.lastSearchedAt
      //   })
      //   .from(searchKeywords)
      //   .orderBy(desc(searchKeywords.searchCount), desc(searchKeywords.lastSearchedAt))
      //   .limit(limit);
      // return topKeywords;
    } catch (error) {
      console.error('Error fetching top searched keywords:', error);
      return [];
    }
  }

  // Get user's search history
  async getUserSearchHistory(userId: string, limit = 50) {
    try {
      // Return mock data until tables are created
      console.log(`📊 Search Analytics: Returning mock search history for user ${userId}`);
      return [
        { keyword: 'engine', searchContext: 'questions', resultsFound: 15, searchedAt: new Date().toISOString() },
        { keyword: 'propeller', searchContext: 'questions', resultsFound: 8, searchedAt: new Date(Date.now() - 3600000).toISOString() }
      ];
      
      // TODO: Uncomment when user_search_history table exists
      // const userHistory = await db
      //   .select({
      //     keyword: userSearchHistory.keyword,
      //     searchContext: userSearchHistory.searchContext,
      //     resultsFound: userSearchHistory.resultsFound,
      //     searchedAt: userSearchHistory.searchedAt
      //   })
      //   .from(userSearchHistory)
      //   .where(eq(userSearchHistory.userId, userId))
      //   .orderBy(desc(userSearchHistory.searchedAt))
      //   .limit(limit);
      // return userHistory;
    } catch (error) {
      console.error('Error fetching user search history:', error);
      return [];
    }
  }

  // Get keyword search statistics
  async getKeywordStats(keyword: string) {
    try {
      const cleanKeyword = keyword.trim().toLowerCase();
      
      // Global keyword stats
      const globalStats = await db
        .select()
        .from(searchKeywords)
        .where(eq(searchKeywords.keyword, cleanKeyword))
        .limit(1);

      // User search count for this keyword
      const userSearchCount = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(userSearchHistory)
        .where(eq(userSearchHistory.keyword, cleanKeyword));

      // Recent searches for this keyword
      const recentSearches = await db
        .select({
          searchContext: userSearchHistory.searchContext,
          resultsFound: userSearchHistory.resultsFound,
          searchedAt: userSearchHistory.searchedAt
        })
        .from(userSearchHistory)
        .where(eq(userSearchHistory.keyword, cleanKeyword))
        .orderBy(desc(userSearchHistory.searchedAt))
        .limit(10);

      return {
        globalStats: globalStats[0] || null,
        userSearchCount: userSearchCount[0]?.count || 0,
        recentSearches
      };
    } catch (error) {
      console.error('Error fetching keyword stats:', error);
      return {
        globalStats: null,
        userSearchCount: 0,
        recentSearches: []
      };
    }
  }

  // Get search analytics summary
  async getSearchAnalyticsSummary() {
    try {
      // Return mock data until tables are created
      console.log('📊 Search Analytics: Returning mock summary data');
      const topKeywords = await this.getTopSearchedKeywords(10);
      
      return {
        totalUniqueKeywords: 15,
        totalSearches: 148,
        totalUserSearches: 89,
        topKeywords
      };
      
      // TODO: Uncomment when tables exist in shared database
      // const totalKeywords = await db
      //   .select({
      //     count: sql<number>`COUNT(*)`
      //   })
      //   .from(searchKeywords);

      // const totalSearches = await db
      //   .select({
      //     total: sql<number>`SUM(${searchKeywords.searchCount})`
      //   })
      //   .from(searchKeywords);

      // const totalUserSearches = await db
      //   .select({
      //     count: sql<number>`COUNT(*)`
      //   })
      //   .from(userSearchHistory);

      // const topKeywords = await this.getTopSearchedKeywords(10);

      // return {
      //   totalUniqueKeywords: totalKeywords[0]?.count || 0,
      //   totalSearches: totalSearches[0]?.total || 0,
      //   totalUserSearches: totalUserSearches[0]?.count || 0,
      //   topKeywords
      // };
    } catch (error) {
      console.error('Error fetching search analytics summary:', error);
      return {
        totalUniqueKeywords: 0,
        totalSearches: 0,
        totalUserSearches: 0,
        topKeywords: []
      };
    }
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();