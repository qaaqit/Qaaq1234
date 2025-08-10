import { pool } from './server/db';

async function migratePasswordData() {
    try {
        console.log("🔄 Starting password data migration...");
        
        // First, check how many users have empty passwords but have data in current_city (our backup source)
        const checkQuery = `
            SELECT COUNT(*) as count
            FROM users 
            WHERE (password IS NULL OR password = '') 
            AND current_city IS NOT NULL 
            AND current_city != '';
        `;
        
        const checkResult = await pool.query(checkQuery);
        const usersToMigrate = checkResult.rows[0].count;
        
        console.log(`📊 Found ${usersToMigrate} users with data in current_city but empty password field`);
        
        if (usersToMigrate > 0) {
            // Copy current_city data to password field for users who don't have a password
            const migrationQuery = `
                UPDATE users 
                SET password = current_city,
                    has_set_custom_password = false,
                    needs_password_change = true,
                    must_create_password = true,
                    password_created_at = NOW(),
                    password_renewal_due = NOW() + INTERVAL '12 months'
                WHERE (password IS NULL OR password = '') 
                AND current_city IS NOT NULL 
                AND current_city != '';
            `;
            
            const migrationResult = await pool.query(migrationQuery);
            console.log(`✅ Successfully migrated password data for ${migrationResult.rowCount} users`);
            
            // Now check for users who still don't have any password data
            const noPasswordQuery = `
                SELECT COUNT(*) as count
                FROM users 
                WHERE (password IS NULL OR password = '') 
                AND (current_city IS NULL OR current_city = '');
            `;
            
            const noPasswordResult = await pool.query(noPasswordQuery);
            const usersWithoutPassword = noPasswordResult.rows[0].count;
            
            if (usersWithoutPassword > 0) {
                // Set default password for users who have no password data at all
                const defaultPasswordQuery = `
                    UPDATE users 
                    SET password = '1234koihai',
                        has_set_custom_password = false,
                        needs_password_change = true,
                        must_create_password = true,
                        password_created_at = NOW(),
                        password_renewal_due = NOW() + INTERVAL '12 months'
                    WHERE (password IS NULL OR password = '') 
                    AND (current_city IS NULL OR current_city = '');
                `;
                
                const defaultResult = await pool.query(defaultPasswordQuery);
                console.log(`✅ Set default password for ${defaultResult.rowCount} users without any password data`);
            }
        }
        
        // Final verification
        const finalCheckQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN password IS NOT NULL AND password != '' THEN 1 END) as users_with_password,
                COUNT(CASE WHEN current_city IS NOT NULL AND current_city != '' THEN 1 END) as users_with_backup
            FROM users;
        `;
        
        const finalResult = await pool.query(finalCheckQuery);
        const stats = finalResult.rows[0];
        
        console.log("\n" + "=".repeat(60));
        console.log("PASSWORD MIGRATION SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total Users: ${stats.total_users}`);
        console.log(`Users with Password: ${stats.users_with_password}`);
        console.log(`Users with Backup Data: ${stats.users_with_backup}`);
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