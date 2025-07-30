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
 * Get all real QAAQ users from the Notion database
 */
export async function getQAAQUsersFromNotion() {
    try {
        console.log('Fetching real QAAQ users from Notion database...');
        
        // List all available databases to debug
        const allDatabases = await getNotionDatabases();
        console.log('Available Notion databases:', allDatabases.map(db => ({
            id: db.id,
            title: db.title?.map(t => t.plain_text).join('') || 'Untitled'
        })));
        
        // Try different possible database names
        let userDatabase = await findDatabaseByTitle("users") || 
                          await findDatabaseByTitle("qaaq users") ||
                          await findDatabaseByTitle("maritime users") ||
                          await findDatabaseByTitle("qaaq") ||
                          await findDatabaseByTitle("user database") ||
                          await findDatabaseByTitle("contacts") ||
                          await findDatabaseByTitle("members");

        // If no specific database found, use the first available database
        if (!userDatabase && allDatabases.length > 0) {
            console.log('Using first available database as QAAQ users database');
            userDatabase = allDatabases[0];
        }

        if (!userDatabase) {
            console.log('No QAAQ users database found in Notion');
            return [];
        }

        console.log(`Found QAAQ users database: ${userDatabase.id}`);

        // Query all users from the database without filters first
        let response;
        try {
            response = await notion.databases.query({
                database_id: userDatabase.id,
                page_size: 100
            });
        } catch (queryError) {
            console.log('Simple query failed, trying without any filters or sorts');
            response = await notion.databases.query({
                database_id: userDatabase.id
            });
        }

        const users = response.results.map((page: any) => {
            const properties = page.properties;
            
            // Extract user information from Notion properties
            const fullName = properties["Full Name"]?.title?.[0]?.plain_text || 
                           properties["Name"]?.title?.[0]?.plain_text || 
                           "Maritime User";
            
            const email = properties["Email"]?.email || 
                         properties["Contact"]?.email || "";
            
            const whatsappNumber = properties["WhatsApp"]?.phone_number || 
                                 properties["Phone"]?.phone_number || 
                                 properties["Contact Number"]?.rich_text?.[0]?.plain_text || "";
            
            const rank = properties["Rank"]?.select?.name || 
                        properties["Position"]?.select?.name || 
                        "Crew";
            
            const shipName = properties["Current Ship"]?.rich_text?.[0]?.plain_text || 
                           properties["Ship Name"]?.rich_text?.[0]?.plain_text || 
                           properties["Last Ship"]?.rich_text?.[0]?.plain_text || "";
            
            const company = properties["Company"]?.rich_text?.[0]?.plain_text || 
                          properties["Employer"]?.rich_text?.[0]?.plain_text || "";
            
            const currentPort = properties["Current Port"]?.rich_text?.[0]?.plain_text || 
                              properties["Port"]?.rich_text?.[0]?.plain_text || "";
            
            const homeCity = properties["Home City"]?.rich_text?.[0]?.plain_text || 
                           properties["City"]?.rich_text?.[0]?.plain_text || 
                           properties["Location"]?.rich_text?.[0]?.plain_text || "";
            
            const country = properties["Country"]?.select?.name || 
                          properties["Nationality"]?.select?.name || "";
            
            const questionCount = properties["Questions Asked"]?.number || 
                                properties["Total Questions"]?.number || 0;
            
            const answerCount = properties["Answers Given"]?.number || 
                              properties["Total Answers"]?.number || 0;

            // Determine coordinates based on current port or home city
            const location = getMaritimeLocationCoordinates(currentPort || homeCity || "", country);
            
            // Determine user type
            const userType = (rank && (rank.toLowerCase().includes('master') || 
                                     rank.toLowerCase().includes('captain') || 
                                     rank.toLowerCase().includes('engineer') || 
                                     rank.toLowerCase().includes('officer'))) ? 'sailor' : 'local';

            return {
                id: whatsappNumber || email || page.id,
                fullName,
                email,
                password: '',
                needsPasswordChange: null,
                userType,
                isAdmin: whatsappNumber === '+919029010070' || email === 'mushy.piyush@gmail.com',
                nickname: fullName,
                rank,
                shipName,
                company,
                imoNumber: '',
                port: currentPort || homeCity,
                visitWindow: '',
                city: homeCity || currentPort,
                country,
                latitude: location.lat,
                longitude: location.lng,
                deviceLatitude: null,
                deviceLongitude: null,
                locationSource: 'notion',
                locationUpdatedAt: new Date(),
                isVerified: true,
                loginCount: 1,
                lastLogin: new Date(),
                createdAt: new Date(),
                questionCount,
                answerCount,
                whatsappNumber
            };
        });

        console.log(`Retrieved ${users.length} real QAAQ users from Notion`);
        return users;

    } catch (error) {
        console.error("Error fetching QAAQ users from Notion:", error);
        return [];
    }
}

/**
 * Get coordinates for maritime locations (ports and cities)
 */
function getMaritimeLocationCoordinates(location: string, country: string = ''): { lat: number, lng: number } {
    const maritimeLocations: { [key: string]: { lat: number, lng: number } } = {
        // Major Indian Ports
        'mumbai': { lat: 19.076, lng: 72.8777 },
        'mumbai port': { lat: 19.076, lng: 72.8777 },
        'chennai': { lat: 13.0827, lng: 80.2707 },
        'chennai port': { lat: 13.0827, lng: 80.2707 },
        'kolkata': { lat: 22.5726, lng: 88.3639 },
        'kolkata port': { lat: 22.5726, lng: 88.3639 },
        'cochin': { lat: 9.9312, lng: 76.2673 },
        'kochi': { lat: 9.9312, lng: 76.2673 },
        'vizag': { lat: 17.6868, lng: 83.2185 },
        'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
        
        // Major International Ports
        'singapore': { lat: 1.3521, lng: 103.8198 },
        'singapore port': { lat: 1.3521, lng: 103.8198 },
        'dubai': { lat: 25.2048, lng: 55.2708 },
        'dubai port': { lat: 25.2048, lng: 55.2708 },
        'jebel ali': { lat: 25.0118, lng: 55.1370 },
        'shanghai': { lat: 31.2304, lng: 121.4737 },
        'shanghai port': { lat: 31.2304, lng: 121.4737 },
        'rotterdam': { lat: 51.9244, lng: 4.4777 },
        'hamburg': { lat: 53.5511, lng: 9.9937 },
        'los angeles': { lat: 34.0522, lng: -118.2437 },
        'long beach': { lat: 33.7701, lng: -118.1937 },
        'antwerp': { lat: 51.2194, lng: 4.4025 },
        'felixstowe': { lat: 51.9641, lng: 1.3506 },
        'piraeus': { lat: 37.9473, lng: 23.6347 },
        'istanbul': { lat: 41.0082, lng: 28.9784 },
        'hong kong': { lat: 22.3193, lng: 114.1694 },
        'busan': { lat: 35.1796, lng: 129.0756 },
        'tokyo': { lat: 35.6762, lng: 139.6503 },
        'yokohama': { lat: 35.4437, lng: 139.6380 },
        
        // Country fallbacks
        'india': { lat: 19.076, lng: 72.8777 }, // Mumbai
        'singapore': { lat: 1.3521, lng: 103.8198 },
        'uae': { lat: 25.2048, lng: 55.2708 }, // Dubai
        'china': { lat: 31.2304, lng: 121.4737 }, // Shanghai
        'germany': { lat: 53.5511, lng: 9.9937 }, // Hamburg
        'netherlands': { lat: 51.9244, lng: 4.4777 }, // Rotterdam
        'usa': { lat: 34.0522, lng: -118.2437 }, // Los Angeles
        'united states': { lat: 34.0522, lng: -118.2437 }
    };

    const searchKey = location.toLowerCase().trim();
    
    // Direct location match
    if (maritimeLocations[searchKey]) {
        return maritimeLocations[searchKey];
    }
    
    // Partial match
    for (const [key, coords] of Object.entries(maritimeLocations)) {
        if (searchKey.includes(key) || key.includes(searchKey)) {
            return coords;
        }
    }
    
    // Country fallback
    const countryKey = country.toLowerCase().trim();
    if (maritimeLocations[countryKey]) {
        return maritimeLocations[countryKey];
    }
    
    // Default to Mumbai (major maritime hub)
    return { lat: 19.076, lng: 72.8777 };
}