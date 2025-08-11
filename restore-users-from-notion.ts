import { pool } from "./server/db";
import { getUsers } from "./server/notion";

async function restoreUsersFromNotion() {
    console.log("🔄 Starting user data restoration from Notion...");
    
    try {
        // Fetch users from Notion
        console.log("📡 Fetching users from Notion database...");
        const notionUsers = await getUsers();
        console.log(`📊 Found ${notionUsers.length} users in Notion`);

        if (notionUsers.length === 0) {
            console.log("⚠️ No users found in Notion database");
            return;
        }

        // Clear existing users table (be careful!)
        console.log("🗑️ Clearing existing users table...");
        await pool.query('TRUNCATE TABLE users CASCADE');

        // Insert users from Notion
        console.log("💾 Inserting users into database...");
        let successCount = 0;

        for (const user of notionUsers) {
            try {
                await pool.query(`
                    INSERT INTO users (
                        id, full_name, email, password, whatsapp_number, 
                        user_type, rank, last_company, city, country, 
                        is_verified, is_admin, created_at, last_updated
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                    )
                `, [
                    user.fullName,
                    user.email,
                    user.password,
                    user.whatsAppNumber,
                    user.userType,
                    user.rank,
                    user.lastCompany,
                    user.city,
                    user.country,
                    user.isVerified,
                    user.isAdmin,
                    user.createdAt,
                    user.updatedAt
                ]);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to insert user ${user.fullName}:`, error);
            }
        }

        console.log(`✅ Successfully restored ${successCount}/${notionUsers.length} users from Notion`);
        console.log("🎉 User data restoration complete!");

    } catch (error) {
        console.error("💥 Error during user restoration:", error);
        throw error;
    }
}

// Run the restoration
restoreUsersFromNotion().then(() => {
    console.log("✅ Restoration script completed");
    process.exit(0);
}).catch(error => {
    console.error("💥 Restoration script failed:", error);
    process.exit(1);
});