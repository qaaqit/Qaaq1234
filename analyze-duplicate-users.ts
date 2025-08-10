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
  
  // Remove all non-digit characters
  const digits = number.replace(/\D/g, '');
  
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
  
  // Return as-is with + if it doesn't match patterns
  return digits.startsWith('+') ? number : `+${digits}`;
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
    
    // Prefer older accounts (created first)
    if (current.created_at && primary.created_at) {
      return current.created_at < primary.created_at ? current : primary;
    }
    
    return primary;
  });
}

async function analyzeDuplicateUsers() {
  console.log('🔍 Starting duplicate user analysis...');
  
  try {
    // Fetch all users with WhatsApp numbers using raw SQL
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
    console.log(`📊 Found ${allUsers.length} users with WhatsApp numbers`);
    
    // Group users by normalized WhatsApp numbers
    const userGroups = groupUsersByWhatsApp(allUsers);
    
    console.log(`📱 Grouped into ${userGroups.size} unique WhatsApp numbers`);
    
    let duplicatesFound = 0;
    let totalDuplicates = 0;
    
    console.log('\n🔍 Analyzing for duplicates...\n');
    
    for (const [whatsappNumber, userList] of userGroups) {
      if (userList.length > 1) {
        duplicatesFound++;
        totalDuplicates += userList.length - 1; // -1 because we keep the primary
        
        console.log(`🔄 DUPLICATE GROUP ${duplicatesFound}: ${whatsappNumber}`);
        console.log(`   Found ${userList.length} accounts:`);
        
        userList.forEach((user, index) => {
          const activity = (user.question_count || 0) + (user.answer_count || 0);
          const adminFlag = user.is_platform_admin ? '👑 ADMIN' : '';
          const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
          
          console.log(`   ${index + 1}. ${user.full_name || 'No Name'} (${user.email || 'No Email'})`);
          console.log(`      Activity: Q:${user.question_count || 0} A:${user.answer_count || 0} Total:${activity} ${adminFlag}`);
          console.log(`      Created: ${createdDate} | Rank: ${user.maritime_rank || 'Not set'} | City: ${user.city || 'Not set'}`);
          console.log(`      ID: ${user.id}`);
        });
        
        // Select primary user
        const primaryUser = selectPrimaryUser(userList);
        console.log(`   ✅ RECOMMENDED PRIMARY: ${primaryUser.full_name || 'No Name'} (${primaryUser.email || 'No Email'})`);
        console.log(`   🗑️  DUPLICATES TO REMOVE: ${userList.length - 1} accounts\n`);
      }
    }
    
    if (duplicatesFound === 0) {
      console.log('✅ GREAT NEWS: No duplicate WhatsApp numbers found!');
      console.log('📊 All users have unique WhatsApp numbers.');
    } else {
      console.log(`📊 DUPLICATE ANALYSIS SUMMARY:`);
      console.log(`   • Total users analyzed: ${allUsers.length}`);
      console.log(`   • Duplicate groups found: ${duplicatesFound}`);
      console.log(`   • Total duplicate accounts: ${totalDuplicates}`);
      console.log(`   • Final unique users (after cleanup): ${allUsers.length - totalDuplicates}`);
      console.log(`\n⚠️  WARNING: This was analysis only. No changes were made to the database.`);
      console.log(`💡 To proceed with merging, run the merge script with --execute flag.`);
    }
    
    // Show some interesting stats
    const usersWithActivity = allUsers.filter(u => (u.question_count || 0) + (u.answer_count || 0) > 0);
    const adminUsers = allUsers.filter(u => u.is_platform_admin);
    
    console.log(`\n📈 ADDITIONAL STATS:`);
    console.log(`   • Users with Q&A activity: ${usersWithActivity.length}`);
    console.log(`   • Admin users: ${adminUsers.length}`);
    console.log(`   • Users with maritime rank: ${allUsers.filter(u => u.maritime_rank).length}`);
    console.log(`   • Users with city: ${allUsers.filter(u => u.city).length}`);
    
  } catch (error) {
    console.error('❌ Error during duplicate user analysis:', error);
    throw error;
  }
}

// Execute the duplicate analysis
analyzeDuplicateUsers()
  .then(() => {
    console.log('\n🎉 Duplicate user analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error in analysis process:', error);
    process.exit(1);
  });