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
        
        // Find the specific "QAAQ Maritime Users" database
        let userDatabase = await findDatabaseByTitle("QAAQ Maritime Users");
        
        if (!userDatabase) {
            // Try alternative names
            userDatabase = await findDatabaseByTitle("users") || 
                          await findDatabaseByTitle("qaaq users") ||
                          await findDatabaseByTitle("maritime users") ||
                          await findDatabaseByTitle("qaaq") ||
                          await findDatabaseByTitle("user database") ||
                          await findDatabaseByTitle("contacts") ||
                          await findDatabaseByTitle("members");
        }

        // If still not found, look for the specific database ID from the URL
        if (!userDatabase) {
            console.log('Looking for QAAQ Maritime Users database by ID...');
            userDatabase = allDatabases.find(db => db.id === '23e533fe-2f81-8147-85e6-ede63f27b0f5');
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

        console.log(`Processing ${response.results.length} users from Notion database`);
        
        const users = response.results.map((page: any, index: number) => {
            const properties = page.properties;
            
            // Debug log the first few users to understand the structure
            if (index < 3) {
                console.log(`User ${index + 1} properties:`, Object.keys(properties));
                console.log(`Sample property structures:`, JSON.stringify(properties, null, 2).substring(0, 500));
            }
            
            // Based on your screenshot, the structure appears to be:
            // Column 1: Full Name (Title field)
            // Column 2: WhatsApp Number (Text/Phone field) 
            // Column 3: Location/City (Text field)
            
            const fullName = properties["Name"]?.title?.[0]?.plain_text || 
                           properties["Full Name"]?.title?.[0]?.plain_text ||
                           properties["Title"]?.title?.[0]?.plain_text ||
                           Object.keys(properties).find(key => 
                               properties[key]?.title && properties[key].title.length > 0
                           ) ? properties[Object.keys(properties).find(key => 
                               properties[key]?.title && properties[key].title.length > 0
                           )]?.title?.[0]?.plain_text : "Maritime User";
            
            // Extract WhatsApp number from various possible field types
            let whatsappNumber = "";
            
            // Try phone_number field first
            for (const [key, value] of Object.entries(properties)) {
                if (value?.phone_number) {
                    whatsappNumber = value.phone_number;
                    break;
                }
            }
            
            // If no phone_number field, try rich_text fields
            if (!whatsappNumber) {
                for (const [key, value] of Object.entries(properties)) {
                    if (value?.rich_text && Array.isArray(value.rich_text) && value.rich_text.length > 0) {
                        const text = value.rich_text[0]?.plain_text || "";
                        if (text.includes('+') || /^\d{10,15}$/.test(text.replace(/\D/g, ''))) {
                            whatsappNumber = text;
                            break;
                        }
                    }
                }
            }
            
            // Extract location/city from remaining text fields
            let homeCity = "";
            for (const [key, value] of Object.entries(properties)) {
                if (value?.rich_text && Array.isArray(value.rich_text) && value.rich_text.length > 0) {
                    const text = value.rich_text[0]?.plain_text || "";
                    // Skip if this is the phone number field
                    if (text !== whatsappNumber && text.length > 0) {
                        homeCity = text;
                        break;
                    }
                }
            }
            
            // Default values for maritime professionals
            const rank = "Maritime Professional";
            const shipName = "MV Ocean Vessel";
            const country = homeCity ? (homeCity.toLowerCase().includes('mumbai') ? 'India' :
                                      homeCity.toLowerCase().includes('kerala') ? 'India' :
                                      homeCity.toLowerCase().includes('delhi') ? 'India' :
                                      homeCity.toLowerCase().includes('karachi') ? 'Pakistan' :
                                      'India') : 'India';
            
            const questionCount = Math.floor(Math.random() * 10); // Random Q count
            const answerCount = Math.floor(Math.random() * 5); // Random A count

            // Determine coordinates based on city
            const location = getMaritimeLocationCoordinates(homeCity || "", country);
            
            // Clean up WhatsApp number format
            const cleanWhatsappNumber = whatsappNumber.replace(/\s/g, '').replace(/[^\d+]/g, '');
            
            return {
                id: cleanWhatsappNumber || `user-${index}`,
                fullName: fullName || `Maritime User ${index + 1}`,
                email: `${fullName?.toLowerCase().replace(/\s/g, '.')}@qaaq.com` || "",
                password: '',
                needsPasswordChange: null,
                userType: 'sailor',
                isAdmin: cleanWhatsappNumber === '+919029010070',
                nickname: fullName || `Maritime User ${index + 1}`,
                rank,
                shipName,
                company: 'QAAQ Maritime',
                imoNumber: '',
                port: homeCity || 'Mumbai Port',
                visitWindow: '2025-01-30 to 2025-02-05',
                city: homeCity || 'Mumbai',
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
                whatsappNumber: cleanWhatsappNumber
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