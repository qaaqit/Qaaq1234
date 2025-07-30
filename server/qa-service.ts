import { notion } from "./notion";

// Interface for QAAQ question data
interface QAAQQuestion {
  id: string;
  question: string;
  askedBy: string;
  category: string;
  askedDate: string;
  answerCount: number;
  isResolved: boolean;
  tags?: string[];
  urgency?: string;
  location?: string;
}

// Interface for QAAQ user question metrics
interface QAAQUserMetrics {
  fullName: string;
  userId: string;
  totalQuestions: number;
  whatsappQuestions: number;
  webQuestions: number;
  rank?: string;
  email?: string;
  lastQuestionDate?: string;
  isActive: boolean;
}

/**
 * Get real user question metrics from QAAQ Notion database
 */
export async function getQAAQUserMetrics(): Promise<QAAQUserMetrics[]> {
  try {
    const questionMetricsDbId = "23f533fe-2f81-8143-be0c-c6ac6dabaf51"; // User Question Metrics
    
    const response = await notion.databases.query({
      database_id: questionMetricsDbId,
      sorts: [
        {
          property: "TotalQuestions",
          direction: "descending"
        }
      ]
    });

    return response.results.map((page: any) => {
      const props = page.properties;
      
      return {
        fullName: props.FullName?.title?.[0]?.plain_text || 'Unknown User',
        userId: props.UserId?.rich_text?.[0]?.plain_text || '',
        totalQuestions: props.TotalQuestions?.number || 0,
        whatsappQuestions: props.WhatsAppQuestions?.number || 0,
        webQuestions: props.WebQuestions?.number || 0,
        rank: props.MaritimeRank?.rich_text?.[0]?.plain_text || '',
        email: props.Email?.email || '',
        lastQuestionDate: props.LastQuestionDate?.date?.start || '',
        isActive: props.IsActive?.checkbox || false
      };
    });

  } catch (error) {
    console.error("Error fetching QAAQ user metrics:", error);
    return [];
  }
}

/**
 * Search for actual questions in QAAQ system
 * Currently the Notion databases only contain question metrics, not the actual question content
 */
async function searchForActualQuestions(userMetrics: QAAQUserMetrics): Promise<QAAQQuestion[]> {
  try {
    // The current QAAQ Notion databases only contain metrics (question counts) 
    // but not the actual question content. The actual questions are likely stored 
    // in WhatsApp bot logs or a separate system we don't have access to.
    
    console.log(`Searching for actual questions for ${userMetrics.fullName}...`);
    console.log(`User has ${userMetrics.totalQuestions} questions (${userMetrics.whatsappQuestions} WhatsApp, ${userMetrics.webQuestions} Web)`);
    
    // TODO: Integrate with actual QAAQ question storage system when available
    // For now, we can only show that the user has asked questions but cannot display the content
    
    return [];
  } catch (error) {
    console.error('Error searching for actual questions:', error);
    return [];
  }
}

/**
 * Get questions for a specific user using real QAAQ metrics
 * Currently only returns question count since actual question content is not available in Notion
 */
export async function getUserQuestions(userId: string, userName: string): Promise<QAAQQuestion[]> {
  try {
    console.log(`Fetching questions for user: ${userName} (ID: ${userId})`);
    
    // Get user metrics from QAAQ
    const allMetrics = await getQAAQUserMetrics();
    
    // Find user by name or user ID
    const userMetrics = allMetrics.find(m => 
      m.fullName.toLowerCase() === userName.toLowerCase() ||
      m.userId === userId ||
      m.fullName.toLowerCase().includes(userName.toLowerCase()) ||
      userName.toLowerCase().includes(m.fullName.toLowerCase())
    );

    if (userMetrics && userMetrics.totalQuestions > 0) {
      console.log(`Found QAAQ metrics for ${userMetrics.fullName}: ${userMetrics.totalQuestions} questions (${userMetrics.whatsappQuestions} WhatsApp, ${userMetrics.webQuestions} Web)`);
      
      // Search for actual question content
      const actualQuestions = await searchForActualQuestions(userMetrics);
      return actualQuestions;
    } else {
      console.log(`No QAAQ metrics found for user ${userName}`);
      return [];
    }

  } catch (error) {
    console.error(`Error fetching questions for user ${userName}:`, error);
    return [];
  }
}

/**
 * Get all questions from all users with QAAQ metrics
 * Currently returns empty array since actual question content is not available in current Notion setup
 */
export async function getAllQAAQQuestions(): Promise<QAAQQuestion[]> {
  try {
    const allMetrics = await getQAAQUserMetrics();
    console.log(`Found ${allMetrics.length} users with QAAQ metrics`);
    
    // The current QAAQ Notion setup only contains question counts, not actual questions
    // Actual question content would need to be retrieved from WhatsApp bot logs or other system
    console.log('Note: Actual question content not available in current Notion databases');
    
    return [];
  } catch (error) {
    console.error('Error fetching all QAAQ questions:', error);
    return [];
  }
}

/**
 * Get questions by category
 */
export async function getQuestionsByCategory(category: string): Promise<QAAQQuestion[]> {
  try {
    const allQuestions = await getAllQAAQQuestions();
    return allQuestions.filter(q => 
      q.category.toLowerCase().includes(category.toLowerCase())
    );
  } catch (error) {
    console.error(`Error fetching questions for category ${category}:`, error);
    return [];
  }
}

/**
 * Search questions by keyword
 */
export async function searchQuestions(keyword: string): Promise<QAAQQuestion[]> {
  try {
    const allQuestions = await getAllQAAQQuestions();
    const searchTerm = keyword.toLowerCase();
    
    return allQuestions.filter(q => 
      q.question.toLowerCase().includes(searchTerm) ||
      q.category.toLowerCase().includes(searchTerm) ||
      q.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  } catch (error) {
    console.error(`Error searching questions with keyword ${keyword}:`, error);
    return [];
  }
}