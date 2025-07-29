import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_SECRET!,
});

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

export const NOTION_PAGE_ID = extractPageIdFromUrl(process.env.NOTION_PAGE_URL!);

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {
    const childDatabases = [];

    try {
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            for (const block of response.results) {
                if (block.type === "child_database") {
                    const databaseId = block.id;

                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    const databases = await getNotionDatabases();

    for (const db of databases) {
        if (db.title && Array.isArray(db.title) && db.title.length > 0) {
            const dbTitle = db.title[0]?.plain_text?.toLowerCase() || "";
            if (dbTitle === title.toLowerCase()) {
                return db;
            }
        }
    }

    return null;
}

/**
 * Fetch Q&A metrics from Notion database
 * Returns a map of user names to their question counts
 */
export async function getQuestionCounts(): Promise<Map<string, number>> {
    try {
        console.log('Attempting to fetch Q&A data from QAAQ Maritime Users database...');
        
        // Use the correct database ID for QAAQ Maritime Users
        const QAAQ_USERS_DB_ID = '23e533fe-2f81-8147-85e6-ede63f27b0f5';
        
        const response = await notion.databases.query({
            database_id: QAAQ_USERS_DB_ID,
            page_size: 100,
        });

        const questionCounts = new Map<string, number>();

        response.results.forEach((page: any) => {
            const properties = page.properties;
            
            // Extract name from Name property
            let userName = '';
            if (properties.Name?.title?.[0]?.plain_text) {
                userName = properties.Name.title[0].plain_text;
            }

            // Extract question count from QuestionCount property
            let questionCount = 0;
            if (properties.QuestionCount?.number !== undefined) {
                questionCount = properties.QuestionCount.number;
            }

            // Also extract maritime rank for better matching
            let maritimeRank = '';
            if (properties.MaritimeRank?.select?.name) {
                maritimeRank = properties.MaritimeRank.select.name;
            }

            if (userName && questionCount >= 0) {
                questionCounts.set(userName, questionCount);
                console.log(`Loaded Q&A data: ${userName} (${maritimeRank}) -> ${questionCount} questions`);
            }
        });

        console.log(`Successfully loaded ${questionCounts.size} user question counts from QAAQ Maritime Users database`);
        return questionCounts;

    } catch (error) {
        console.error('Error fetching question counts from Notion:', error);
        // Return empty map on error - system will fall back to simulated data
        return new Map();
    }
}