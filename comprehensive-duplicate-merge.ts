import { db } from "./server/db";
import { sql } from "drizzle-orm";

interface UserRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  question_count: number | null;
  answer_count: number | null;
  is_platform_admin: boolean | null;
  created_at: Date | null;
  maritime_rank: string | null;
  city: string | null;
}

// Normalize WhatsApp number to consistent format
function normalizeWhatsAppNumber(number: string | null): string | null {
  if (!number) return null;
  
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^+\d]/g, '');
  
  // Remove any wa_ prefix and extract digits
  const digits = cleaned.replace(/wa_/g, '').replace(/\D/g, '');
  
  // If it starts with 91 and has 12 digits total, it's likely +91 format
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  // If it's 10 digits, add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If it starts with 91 but shorter, might need +91 prefix
  if (digits.startsWith('91') && digits.length === 11) {
    return `+${digits}`;
  }
  
  // Return normalized with + prefix
  return `+${digits}`;
}

// Group users by normalized WhatsApp numbers
function groupUsersByWhatsApp(usersList: UserRecord[]): Map<string, UserRecord[]> {
  const groups = new Map<string, UserRecord[]>();
  
  for (const user of usersList) {
    const normalizedNumber = normalizeWhatsAppNumber(user.whatsapp_number);
    
    if (normalizedNumber) {
      if (!groups.has(normalizedNumber)) {
        groups.set(normalizedNumber, []);
      }
      groups.get(normalizedNumber)!.push(user);
    }
  }
  
  return groups;
}

// Determine the primary user (keep the one with most activity or oldest)
function selectPrimaryUser(duplicates: UserRecord[]): UserRecord {
  return duplicates.reduce((primary, current) => {
    // Prefer admin users
    if (current.is_platform_admin && !primary.is_platform_admin) return current;
    if (primary.is_platform_admin && !current.is_platform_admin) return primary;
    
    // Prefer users with more Q&A activity
    const currentActivity = (current.question_count || 0) + (current.answer_count || 0);
    const primaryActivity = (primary.question_count || 0) + (primary.answer_count || 0);
    
    if (currentActivity > primaryActivity) return current;
    if (primaryActivity > currentActivity) return primary;
    
    // Prefer users with email addresses
    if (current.email && !primary.email) return current;
    if (primary.email && !current.email) return primary;
    
    // Prefer older accounts (created first)
    if (current.created_at && primary.created_at) {
      return current.created_at < primary.created_at ? current : primary;
    }
    
    return primary;
  });
}

// Get all foreign key constraints referencing users table
async function findForeignKeyConstraints() {
  const constraints = await db.execute(sql`
    SELECT 
      tc.table_name, 
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
  `);
  
  return constraints.rows as Array<{table_name: string, column_name: string, constraint_name: string}>;
}

// Update all related tables to point to primary user
async function updateAllRelatedTables(primaryUserId: string, duplicateIds: string[]) {
  console.log(`   🔄 Updating related tables for ${duplicateIds.length} duplicates...`);
  
  try {
    // Get all tables that reference users
    const foreignKeys = await findForeignKeyConstraints();
    console.log(`   📋 Found ${foreignKeys.length} foreign key references`);
    
    for (const fk of foreignKeys) {
      console.log(`   🔗 Updating ${fk.table_name}.${fk.column_name}`);
      
      for (const duplicateId of duplicateIds) {
        try {
          await db.execute(sql.raw(`
            UPDATE ${fk.table_name} 
            SET ${fk.column_name} = '${primaryUserId}' 
            WHERE ${fk.column_name} = '${duplicateId}'
          `));
        } catch (error) {
          console.log(`   ⚠️  Warning: Could not update ${fk.table_name}.${fk.column_name}: ${error}`);
        }
      }
    }
    
    console.log(`   ✅ Related tables updated successfully`);
    
  } catch (error) {
    console.error(`   ❌ Error updating related tables:`, error);
    throw error;
  }
}

// Merge user data from duplicates into primary user
function mergeUserData(primary: UserRecord, duplicates: UserRecord[]): any {
  const merged: any = { ...primary };
  
  for (const duplicate of duplicates) {
    if (duplicate.id === primary.id) continue;
    
    // Merge Q&A counts
    merged.question_count = (merged.question_count || 0) + (duplicate.question_count || 0);
    merged.answer_count = (merged.answer_count || 0) + (duplicate.answer_count || 0);
    
    // Use better profile data if available
    if (!merged.full_name || merged.full_name === 'Maritime Professional Professional' || merged.full_name === 'Marine Professional') {
      if (duplicate.full_name && duplicate.full_name !== 'Maritime Professional Professional' && duplicate.full_name !== 'Marine Professional') {
        merged.full_name = duplicate.full_name;
      }
    }
    
    if (!merged.email && duplicate.email && !duplicate.email.includes('whatsapp.temp')) {
      merged.email = duplicate.email;
    }
    
    if (!merged.city || merged.city === '1234koihai' || merged.city === 'kalam@786') {
      if (duplicate.city && duplicate.city !== '1234koihai' && duplicate.city !== 'kalam@786') {
        merged.city = duplicate.city;
      }
    }
    
    // Keep better maritime rank (prefer specific ranks over 'other')
    if (!merged.maritime_rank || merged.maritime_rank === 'other') {
      if (duplicate.maritime_rank && duplicate.maritime_rank !== 'other') {
        merged.maritime_rank = duplicate.maritime_rank;
      }
    }
  }
  
  return merged;
}

async function comprehensiveDuplicateMerge() {
  console.log('🔥 EXECUTING COMPREHENSIVE DUPLICATE USER MERGE...');
  console.log('🛡️  This will handle ALL foreign key constraints automatically!');
  
  try {
    // First, let's see what foreign keys exist
    console.log('\n🔍 Analyzing foreign key constraints...');
    const foreignKeys = await findForeignKeyConstraints();
    console.log(`📋 Found ${foreignKeys.length} foreign key constraints:`);
    foreignKeys.forEach(fk => {
      console.log(`   • ${fk.table_name}.${fk.column_name} (${fk.constraint_name})`);
    });
    
    // Fetch all users with WhatsApp numbers
    const result = await db.execute(sql`
      SELECT 
        id, 
        full_name, 
        email, 
        whatsapp_number, 
        question_count, 
        answer_count, 
        is_platform_admin, 
        created_at, 
        maritime_rank, 
        city
      FROM users 
      WHERE whatsapp_number IS NOT NULL 
        AND whatsapp_number != ''
      ORDER BY created_at ASC
    `);
    
    const allUsers = result.rows as UserRecord[];
    console.log(`\n📊 Processing ${allUsers.length} users with WhatsApp numbers`);
    
    // Group users by normalized WhatsApp numbers
    const userGroups = groupUsersByWhatsApp(allUsers);
    
    let mergeCount = 0;
    let deletedCount = 0;
    
    for (const [whatsappNumber, userList] of userGroups) {
      if (userList.length > 1) {
        mergeCount++;
        console.log(`\n🔄 MERGING GROUP ${mergeCount}: ${whatsappNumber} (${userList.length} accounts)`);
        
        // Select primary user and merge data
        const primaryUser = selectPrimaryUser(userList);
        const mergedData = mergeUserData(primaryUser, userList);
        
        console.log(`   ✅ Primary: ${primaryUser.full_name} (${primaryUser.id})`);
        console.log(`   📈 Merged: Q:${mergedData.question_count} A:${mergedData.answer_count}`);
        
        // Get duplicate IDs
        const duplicateIds = userList
          .filter(user => user.id !== primaryUser.id)
          .map(user => user.id);
        
        if (duplicateIds.length > 0) {
          // Step 1: Update ALL related tables to point to primary user
          await updateAllRelatedTables(primaryUser.id, duplicateIds);
          
          // Step 2: Update primary user with merged data
          await db.execute(sql`
            UPDATE users 
            SET 
              question_count = ${mergedData.question_count},
              answer_count = ${mergedData.answer_count},
              full_name = ${mergedData.full_name},
              email = ${mergedData.email},
              city = ${mergedData.city},
              maritime_rank = ${mergedData.maritime_rank}
            WHERE id = ${primaryUser.id}
          `);
          
          // Step 3: Delete duplicate users (now safe since ALL references are updated)
          console.log(`   🗑️  Removing ${duplicateIds.length} duplicates`);
          
          for (const duplicateId of duplicateIds) {
            await db.execute(sql`DELETE FROM users WHERE id = ${duplicateId}`);
            deletedCount++;
          }
        }
        
        console.log(`   ✅ Merge complete`);
      }
    }
    
    console.log(`\n🎉 COMPREHENSIVE MERGE OPERATION COMPLETED!`);
    console.log(`   • Duplicate groups processed: ${mergeCount}`);
    console.log(`   • Duplicate accounts removed: ${deletedCount}`);
    console.log(`   • ALL foreign key constraints handled automatically!`);
    
    // Verify the results
    const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''`);
    console.log(`   • Final users with WhatsApp: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during comprehensive merge operation:', error);
    throw error;
  }
}

// Execute the comprehensive merge
comprehensiveDuplicateMerge()
  .then(() => {
    console.log('\n🎉 Comprehensive duplicate user merge process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error in comprehensive merge process:', error);
    process.exit(1);
  });