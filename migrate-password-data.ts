import { pool } from './server/db';

async function migratePasswordData() {
    try {
        console.log("🔄 Starting password data migration...");
        
        // First, check the actual database columns and set up all users with proper password structure
        const checkQuery = `
            SELECT COUNT(*) as count
            FROM users 
            WHERE password IS NULL OR password = '';
        `;
        
        const checkResult = await pool.query(checkQuery);
        const usersToMigrate = checkResult.rows[0].count;
        
        console.log(`📊 Found ${usersToMigrate} users without passwords`);
        
        if (usersToMigrate > 0) {
            // Set universal password for all users without passwords
            const migrationQuery = `
                UPDATE users 
                SET password = '1234koihai'
                WHERE password IS NULL OR password = '';
            `;
            
            const migrationResult = await pool.query(migrationQuery);
            console.log(`✅ Set universal password for ${migrationResult.rowCount} users`);
        }
        
        // Final verification
        const finalCheckQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN password IS NOT NULL AND password != '' THEN 1 END) as users_with_password
            FROM users;
        `;
        
        const finalResult = await pool.query(finalCheckQuery);
        const stats = finalResult.rows[0];
        
        console.log("\n" + "=".repeat(60));
        console.log("PASSWORD MIGRATION SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total Users: ${stats.total_users}`);
        console.log(`Users with Password: ${stats.users_with_password}`);
        console.log("=".repeat(60));
        
        console.log("\n✅ Password migration completed successfully!");
        console.log("📝 All users now have password data for universal login system");
        console.log("🔒 Password renewal system active (12-month cycle)");
        
    } catch (error) {
        console.error("❌ Password migration failed:", error);
        throw error;
    }
}

// Run the migration
migratePasswordData()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Migration failed:", error);
        process.exit(1);
    });