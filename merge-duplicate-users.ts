import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq, sql, and, or, like } from "drizzle-orm";

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  whatsAppNumber: string | null;
  questionCount: number;
  answerCount: number;
  createdAt: Date | null;
  loginCount: number;
  isAdmin: boolean | null;
  rank: string | null;
  shipName: string | null;
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
    const normalizedNumber = normalizeWhatsAppNumber(user.whatsAppNumber);
    
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
    if (current.isAdmin && !primary.isAdmin) return current;
    if (primary.isAdmin && !current.isAdmin) return primary;
    
    // Prefer users with more Q&A activity
    const currentActivity = (current.questionCount || 0) + (current.answerCount || 0);
    const primaryActivity = (primary.questionCount || 0) + (primary.answerCount || 0);
    
    if (currentActivity > primaryActivity) return current;
    if (primaryActivity > currentActivity) return primary;
    
    // Prefer users with more login activity
    if ((current.loginCount || 0) > (primary.loginCount || 0)) return current;
    if ((primary.loginCount || 0) > (current.loginCount || 0)) return primary;
    
    // Prefer older accounts (created first)
    if (current.createdAt && primary.createdAt) {
      return current.createdAt < primary.createdAt ? current : primary;
    }
    
    return primary;
  });
}

// Merge user data from duplicates into primary user
function mergeUserData(primary: UserRecord, duplicates: UserRecord[]): Partial<UserRecord> {
  const merged: any = { ...primary };
  
  for (const duplicate of duplicates) {
    if (duplicate.id === primary.id) continue;
    
    // Merge Q&A counts
    merged.questionCount = (merged.questionCount || 0) + (duplicate.questionCount || 0);
    merged.answerCount = (merged.answerCount || 0) + (duplicate.answerCount || 0);
    merged.loginCount = (merged.loginCount || 0) + (duplicate.loginCount || 0);
    
    // Use more complete profile data
    if (!merged.rank && duplicate.rank) merged.rank = duplicate.rank;
    if (!merged.shipName && duplicate.shipName) merged.shipName = duplicate.shipName;
    if (!merged.city && duplicate.city) merged.city = duplicate.city;
    if (!merged.fullName || merged.fullName.length < duplicate.fullName?.length) {
      merged.fullName = duplicate.fullName;
    }
  }
  
  return merged;
}

async function findAndMergeDuplicateUsers() {
  console.log('🔍 Starting duplicate user analysis...');
  
  try {
    // Fetch all users with WhatsApp numbers
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        whatsAppNumber: users.whatsAppNumber,
        questionCount: users.questionCount,
        answerCount: users.answerCount,
        createdAt: users.createdAt,
        loginCount: users.loginCount,
        isAdmin: users.isAdmin,
        rank: users.rank,
        shipName: users.shipName,
        city: users.city,
      })
      .from(users)
      .where(sql`whatsapp_number IS NOT NULL AND whatsapp_number != ''`);
    
    console.log(`📊 Found ${allUsers.length} users with WhatsApp numbers`);
    
    // Group users by normalized WhatsApp numbers
    const userGroups = groupUsersByWhatsApp(allUsers);
    
    console.log(`📱 Grouped into ${userGroups.size} unique WhatsApp numbers`);
    
    let duplicatesFound = 0;
    let totalMerged = 0;
    
    for (const [whatsappNumber, userList] of userGroups) {
      if (userList.length > 1) {
        duplicatesFound++;
        console.log(`\n🔄 Found ${userList.length} duplicates for ${whatsappNumber}:`);
        
        userList.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.fullName} (${user.email}) - Q:${user.questionCount || 0} A:${user.answerCount || 0} L:${user.loginCount || 0} ${user.isAdmin ? '👑' : ''}`);
        });
        
        // Select primary user and merge data
        const primaryUser = selectPrimaryUser(userList);
        const mergedData = mergeUserData(primaryUser, userList);
        
        console.log(`  ✅ Primary: ${primaryUser.fullName} (${primaryUser.email})`);
        console.log(`  📈 Merged totals: Q:${mergedData.questionCount} A:${mergedData.answerCount} L:${mergedData.loginCount}`);
        
        // Update primary user with merged data
        await db
          .update(users)
          .set({
            questionCount: mergedData.questionCount,
            answerCount: mergedData.answerCount,
            loginCount: mergedData.loginCount,
            rank: mergedData.rank,
            shipName: mergedData.shipName,
            city: mergedData.city,
            fullName: mergedData.fullName,
          })
          .where(eq(users.id, primaryUser.id));
        
        // Delete duplicate users (keep primary)
        const duplicateIds = userList
          .filter(user => user.id !== primaryUser.id)
          .map(user => user.id);
        
        if (duplicateIds.length > 0) {
          console.log(`  🗑️  Removing ${duplicateIds.length} duplicate accounts`);
          
          // Note: In production, you might want to update related records first
          // (posts, chat messages, etc.) to point to the primary user
          
          for (const duplicateId of duplicateIds) {
            await db.delete(users).where(eq(users.id, duplicateId));
            totalMerged++;
          }
        }
        
        console.log(`  ✅ Merged complete for ${whatsappNumber}`);
      }
    }
    
    console.log(`\n📊 Duplicate Analysis Summary:`);
    console.log(`   • Total users analyzed: ${allUsers.length}`);
    console.log(`   • Duplicate groups found: ${duplicatesFound}`);
    console.log(`   • Duplicate accounts removed: ${totalMerged}`);
    console.log(`   • Final unique users: ${allUsers.length - totalMerged}`);
    
    if (duplicatesFound === 0) {
      console.log('✅ No duplicate WhatsApp numbers found!');
    } else {
      console.log('✅ All duplicate users successfully merged!');
    }
    
  } catch (error) {
    console.error('❌ Error during duplicate user analysis:', error);
    throw error;
  }
}

// Execute the duplicate detection and merging
findAndMergeDuplicateUsers()
  .then(() => {
    console.log('🎉 Duplicate user merge process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error in duplicate merge process:', error);
    process.exit(1);
  });

export { findAndMergeDuplicateUsers, normalizeWhatsAppNumber };