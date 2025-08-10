import { syncUsersToNotion } from './server/notion-users-sync';

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    throw new Error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
}

if (!process.env.NOTION_PAGE_URL) {
    throw new Error("NOTION_PAGE_URL is not defined. Please add it to your environment variables.");
}

// Run the sync
async function main() {
    try {
        console.log("🔄 Starting QAAQ Users to Notion sync...");
        
        const result = await syncUsersToNotion();
        
        console.log("\n" + "=".repeat(60));
        console.log("SYNC SUMMARY");
        console.log("=".repeat(60));
        console.log(`Database ID: ${result.databaseId}`);
        console.log(`Total Users: ${result.totalUsers}`);
        console.log(`Success: ${result.successCount}`);
        console.log(`Errors: ${result.errorCount}`);
        console.log("=".repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Sync failed:", error);
        process.exit(1);
    }
}

main();