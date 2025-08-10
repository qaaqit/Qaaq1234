import { Client } from "@notionhq/client";
import { pool } from './db';

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
 * Create or find a Notion database for users
 */
export async function createUsersDatabase() {
    try {
        console.log("Creating Users database in Notion...");
        
        const database = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: NOTION_PAGE_ID
            },
            title: [
                {
                    type: "text",
                    text: {
                        content: "QAAQ Users Database"
                    }
                }
            ],
            properties: {
                // Basic Info
                "User ID": {
                    title: {}
                },
                "Full Name": {
                    rich_text: {}
                },
                "Email": {
                    email: {}
                },
                "First Name": {
                    rich_text: {}
                },
                "Last Name": {
                    rich_text: {}
                },
                
                // Maritime Info
                "Maritime Rank": {
                    select: {
                        options: [
                            { name: "Captain", color: "blue" },
                            { name: "Chief Engineer", color: "green" },
                            { name: "Chief Officer", color: "orange" },
                            { name: "Second Engineer", color: "purple" },
                            { name: "Third Officer", color: "pink" },
                            { name: "Officer", color: "yellow" },
                            { name: "Engineer", color: "gray" },
                            { name: "Crew", color: "brown" },
                            { name: "Cadet", color: "red" }
                        ]
                    }
                },
                "Current Ship": {
                    rich_text: {}
                },
                "IMO Number": {
                    rich_text: {}
                },
                "Last Company": {
                    rich_text: {}
                },
                "Last Ship": {
                    rich_text: {}
                },
                
                // Location Info
                "Current City": {
                    rich_text: {}
                },
                "Current Country": {
                    rich_text: {}
                },
                "Latitude": {
                    number: {}
                },
                "Longitude": {
                    number: {}
                },
                
                // Status Info
                "Onboard Status": {
                    select: {
                        options: [
                            { name: "Onboard", color: "green" },
                            { name: "On Leave", color: "yellow" },
                            { name: "Shore", color: "blue" },
                            { name: "Unknown", color: "gray" }
                        ]
                    }
                },
                "Experience Level": {
                    select: {
                        options: [
                            { name: "Junior", color: "red" },
                            { name: "Senior", color: "green" },
                            { name: "Expert", color: "blue" },
                            { name: "Management", color: "purple" }
                        ]
                    }
                },
                
                // Contact Info
                "WhatsApp Number": {
                    phone_number: {}
                },
                "WhatsApp Display Name": {
                    rich_text: {}
                },
                
                // Platform Info
                "Platform Admin": {
                    checkbox: {}
                },
                "Verified": {
                    checkbox: {}
                },
                "Login Count": {
                    number: {}
                },
                "Question Count": {
                    number: {}
                },
                "Answer Count": {
                    number: {}
                },
                
                // Timestamps
                "Last Login": {
                    date: {}
                },
                "Created At": {
                    date: {}
                },
                "Last Updated": {
                    date: {}
                }
            }
        });

        console.log(`✅ Created Users database: ${database.id}`);
        return database;
    } catch (error) {
        console.error("Error creating Users database:", error);
        throw error;
    }
}

/**
 * Get all users from PostgreSQL database
 */
export async function getAllUsersFromPostgres() {
    try {
        console.log("Fetching all users from PostgreSQL...");
        
        const result = await pool.query(`
            SELECT * FROM users 
            ORDER BY created_at DESC
        `);
        
        console.log(`Found ${result.rows.length} users in PostgreSQL`);
        return result.rows;
    } catch (error) {
        console.error("Error fetching users from PostgreSQL:", error);
        throw error;
    }
}

/**
 * Add a user to Notion database
 */
export async function addUserToNotion(databaseId: string, user: any) {
    try {
        const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.full_name || user.email || 'Maritime User';
        
        await notion.pages.create({
            parent: {
                database_id: databaseId
            },
            properties: {
                "User ID": {
                    title: [
                        {
                            text: {
                                content: user.id || 'Unknown'
                            }
                        }
                    ]
                },
                "Full Name": {
                    rich_text: [
                        {
                            text: {
                                content: fullName
                            }
                        }
                    ]
                },
                "Email": user.email ? {
                    email: user.email
                } : undefined,
                "First Name": user.first_name ? {
                    rich_text: [
                        {
                            text: {
                                content: user.first_name
                            }
                        }
                    ]
                } : undefined,
                "Last Name": user.last_name ? {
                    rich_text: [
                        {
                            text: {
                                content: user.last_name
                            }
                        }
                    ]
                } : undefined,
                "Maritime Rank": user.maritime_rank ? {
                    select: {
                        name: String(user.maritime_rank)
                    }
                } : undefined,
                "Current Ship": user.current_ship_name ? {
                    rich_text: [
                        {
                            text: {
                                content: user.current_ship_name
                            }
                        }
                    ]
                } : undefined,
                "IMO Number": user.current_ship_imo ? {
                    rich_text: [
                        {
                            text: {
                                content: user.current_ship_imo
                            }
                        }
                    ]
                } : undefined,
                "Last Company": user.last_company ? {
                    rich_text: [
                        {
                            text: {
                                content: user.last_company
                            }
                        }
                    ]
                } : undefined,
                "Last Ship": user.last_ship ? {
                    rich_text: [
                        {
                            text: {
                                content: user.last_ship
                            }
                        }
                    ]
                } : undefined,
                "Current City": user.current_city ? {
                    rich_text: [
                        {
                            text: {
                                content: user.current_city
                            }
                        }
                    ]
                } : undefined,
                "Current Country": user.current_country ? {
                    rich_text: [
                        {
                            text: {
                                content: user.current_country
                            }
                        }
                    ]
                } : undefined,
                "Latitude": user.current_latitude ? {
                    number: parseFloat(user.current_latitude)
                } : undefined,
                "Longitude": user.current_longitude ? {
                    number: parseFloat(user.current_longitude)
                } : undefined,
                "Onboard Status": user.onboard_status ? {
                    select: {
                        name: String(user.onboard_status)
                    }
                } : undefined,
                "Experience Level": user.experience_level ? {
                    select: {
                        name: String(user.experience_level)
                    }
                } : undefined,
                "WhatsApp Number": user.whatsapp_number ? {
                    phone_number: user.whatsapp_number
                } : undefined,
                "WhatsApp Display Name": user.whatsapp_display_name ? {
                    rich_text: [
                        {
                            text: {
                                content: user.whatsapp_display_name
                            }
                        }
                    ]
                } : undefined,
                "Platform Admin": {
                    checkbox: user.is_platform_admin || false
                },
                "Verified": {
                    checkbox: user.has_completed_onboarding || false
                },
                "Login Count": user.login_count ? {
                    number: parseInt(user.login_count)
                } : undefined,
                "Question Count": user.question_count ? {
                    number: parseInt(user.question_count)
                } : undefined,
                "Answer Count": user.answer_count ? {
                    number: parseInt(user.answer_count)
                } : undefined,
                "Last Login": user.last_login_at ? {
                    date: {
                        start: new Date(user.last_login_at).toISOString()
                    }
                } : undefined,
                "Created At": user.created_at ? {
                    date: {
                        start: new Date(user.created_at).toISOString()
                    }
                } : undefined,
                "Last Updated": user.last_updated ? {
                    date: {
                        start: new Date(user.last_updated).toISOString()
                    }
                } : undefined
            }
        });
        
        return true;
    } catch (error) {
        console.error(`Error adding user ${user.id} to Notion:`, error);
        return false;
    }
}

/**
 * Sync all users from PostgreSQL to Notion
 */
export async function syncUsersToNotion() {
    try {
        console.log("🚀 Starting users sync to Notion...");
        
        // Create the database
        const database = await createUsersDatabase();
        
        // Get all users
        const users = await getAllUsersFromPostgres();
        
        console.log(`📊 Syncing ${users.length} users to Notion...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Add users in batches to avoid rate limits
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            
            try {
                const success = await addUserToNotion(database.id, user);
                if (success) {
                    successCount++;
                    console.log(`✅ Added user ${i + 1}/${users.length}: ${user.id}`);
                } else {
                    errorCount++;
                    console.log(`❌ Failed to add user ${i + 1}/${users.length}: ${user.id}`);
                }
                
                // Rate limiting: wait 100ms between requests
                if (i < users.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                errorCount++;
                console.error(`Error processing user ${user.id}:`, error);
            }
        }
        
        console.log(`\n🎉 Sync completed!`);
        console.log(`✅ Successfully synced: ${successCount} users`);
        console.log(`❌ Failed: ${errorCount} users`);
        console.log(`📊 Total processed: ${users.length} users`);
        console.log(`🔗 Notion database URL: https://notion.so/${database.id.replace(/-/g, '')}`);
        
        return {
            databaseId: database.id,
            totalUsers: users.length,
            successCount,
            errorCount
        };
        
    } catch (error) {
        console.error("Error syncing users to Notion:", error);
        throw error;
    }
}