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

    // Array to store the child databases
    const childDatabases = [];

    try {
        // Query all child blocks in the specified page
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            // Process the results
            for (const block of response.results) {
                // Check if the block is a child database
                if (block.type === "child_database") {
                    const databaseId = block.id;

                    // Retrieve the database title
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        // Add the database to our list
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            // Check if there are more results to fetch
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find get a Notion database with the matching title
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

// Get all users from the Notion database
export async function getUsers() {
    try {
        const usersDb = await findDatabaseByTitle("Users");
        
        if (!usersDb) {
            console.log("No Users database found in Notion");
            return [];
        }

        const response = await notion.databases.query({
            database_id: usersDb.id,
        });

        return response.results.map((page: any) => {
            const properties = page.properties;

            return {
                id: page.id,
                fullName: properties.FullName?.title?.[0]?.plain_text || properties.Name?.title?.[0]?.plain_text || "Unknown User",
                email: properties.Email?.email || properties.Email?.rich_text?.[0]?.plain_text || "",
                password: properties.Password?.rich_text?.[0]?.plain_text || "defaultpass",
                whatsAppNumber: properties.WhatsAppNumber?.phone_number || properties.WhatsApp?.rich_text?.[0]?.plain_text || "",
                userType: properties.UserType?.select?.name || "sailor",
                rank: properties.Rank?.select?.name || properties.MaritimeRank?.rich_text?.[0]?.plain_text || "",
                lastCompany: properties.Company?.rich_text?.[0]?.plain_text || properties.LastCompany?.rich_text?.[0]?.plain_text || "",
                city: properties.City?.rich_text?.[0]?.plain_text || "Mumbai",
                country: properties.Country?.rich_text?.[0]?.plain_text || "India",
                isVerified: properties.IsVerified?.checkbox || false,
                isAdmin: properties.IsAdmin?.checkbox || false,
                createdAt: properties.CreatedAt?.created_time ? new Date(properties.CreatedAt.created_time) : new Date(),
                updatedAt: properties.UpdatedAt?.last_edited_time ? new Date(properties.UpdatedAt.last_edited_time) : new Date(),
            };
        });
    } catch (error) {
        console.error("Error fetching users from Notion:", error);
        throw new Error("Failed to fetch users from Notion");
    }
}