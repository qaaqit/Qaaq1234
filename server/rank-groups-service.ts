import { db } from "./db";
import { rankGroups, rankGroupMembers, rankGroupMessages, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Initialize the 15 individual maritime rank groups
export async function initializeRankGroups() {
  const groups = [
    {
      name: "Cap",
      description: "Captain - Ship Master and commanding officer"
    },
    {
      name: "CO",
      description: "Chief Officer - First Mate and second in command"
    },
    {
      name: "2O",
      description: "2nd Officer - Navigation and watch keeping officer"
    },
    {
      name: "3O",
      description: "3rd Officer - Junior deck officer and watch keeper"
    },
    {
      name: "CE",
      description: "Chief Engineer - Senior engine room officer"
    },
    {
      name: "2E",
      description: "2nd Engineer - Senior engine room officer"
    },
    {
      name: "3E",
      description: "3rd Engineer - Junior engine room officer"
    },
    {
      name: "4E",
      description: "4th Engineer - Junior engine room officer"
    },
    {
      name: "Cadets",
      description: "Maritime Cadets - Trainees and maritime academy students"
    },
    {
      name: "Crew",
      description: "Ship Crew - Deck and engine room crew members"
    },
    {
      name: "MarineSuperIntendent",
      description: "Marine Superintendent - Shore-based marine operations manager"
    },
    {
      name: "TechSuperIntendent",
      description: "Technical Superintendent - Shore-based technical manager"
    },
    {
      name: "Fleet Managers",
      description: "Fleet Managers - Ship fleet management professionals"
    },
    {
      name: "ETO & ESuper",
      description: "Electro Technical Officers & Electric Superintendents"
    },
    {
      name: "Other Marine Professionals",
      description: "Other Marine Professionals - General maritime personnel"
    }
  ];

  try {
    console.log('🏢 Initializing 15 individual maritime rank groups...');
    
    // First, delete all existing rank groups and their relationships
    console.log('🗑️ Clearing existing rank groups...');
    await db.execute(sql`DELETE FROM rank_group_messages`);
    await db.execute(sql`DELETE FROM rank_group_members`);
    await db.execute(sql`DELETE FROM rank_groups`);
    console.log('✅ Cleared all existing rank group data');
    
    // Create new 15 individual rank groups using direct SQL
    for (const group of groups) {
      await db.execute(sql`
        INSERT INTO rank_groups (name, description) 
        VALUES (${group.name}, ${group.description})
      `);
      console.log(`✅ Created individual rank group: ${group.name}`);
    }
    
    console.log('🏢 Maritime rank groups initialization complete - 15 individual groups created');
    return { success: true, message: '15 individual rank groups initialized successfully' };
  } catch (error) {
    console.error('❌ Error initializing rank groups:', error);
    return { success: false, error: error };
  }
}

// Get all rank groups
export async function getAllRankGroups() {
  try {
    const result = await db.execute(sql`
      SELECT 
        rg.id,
        rg.name,
        rg.description,
        rg."groupType",
        rg."isActive",
        rg."createdAt",
        (SELECT COUNT(*)::int FROM rank_group_members rgm WHERE rgm."groupId" = rg.id) as "memberCount"
      FROM rank_groups rg
      WHERE rg."isActive" = true
      ORDER BY rg.name
    `);

    return result.rows;
  } catch (error) {
    console.error('Error fetching rank groups:', error);
    throw error;
  }
}

// Get user's rank groups
export async function getUserRankGroups(userId: string) {
  try {
    const result = await db.execute(sql`
      SELECT 
        rg.id,
        rg.name,
        rg.description,
        rg."groupType",
        rgm.role,
        rgm."joinedAt",
        (
          SELECT COUNT(*)::int 
          FROM rank_group_messages rgm2 
          WHERE rgm2."groupId" = rg.id 
          AND rgm2."createdAt" > COALESCE(
            (SELECT MAX(rgm3."createdAt") 
             FROM rank_group_messages rgm3 
             WHERE rgm3."senderId" = ${userId}), 
            rgm."joinedAt"
          )
        ) as "unreadCount"
      FROM rank_group_members rgm
      INNER JOIN rank_groups rg ON rgm."groupId" = rg.id
      WHERE rgm."userId" = ${userId}
      AND rg."isActive" = true
      ORDER BY rg.name
    `);

    return result.rows;
  } catch (error) {
    console.error('Error fetching user rank groups:', error);
    throw error;
  }
}

// Join a rank group
export async function joinRankGroup(userId: string, groupId: string, role: string = "member") {
  try {
    // Check if user is already a member
    const existingResult = await db.execute(sql`
      SELECT id FROM rank_group_members 
      WHERE "userId" = ${userId} AND "groupId" = ${groupId}
      LIMIT 1
    `);

    if (existingResult.rows.length > 0) {
      return { success: false, message: 'User is already a member of this group' };
    }

    // Add user to group
    await db.execute(sql`
      INSERT INTO rank_group_members ("userId", "groupId", role)
      VALUES (${userId}, ${groupId}, ${role})
    `);

    return { success: true, message: 'Successfully joined the group' };
  } catch (error) {
    console.error('Error joining rank group:', error);
    throw error;
  }
}

// Leave a rank group
export async function leaveRankGroup(userId: string, groupId: string) {
  try {
    await db.execute(sql`
      DELETE FROM rank_group_members 
      WHERE "userId" = ${userId} AND "groupId" = ${groupId}
    `);

    return { success: true, message: 'Successfully left the group' };
  } catch (error) {
    console.error('Error leaving rank group:', error);
    throw error;
  }
}

// Send message to rank group
export async function sendRankGroupMessage(
  senderId: string, 
  groupId: string, 
  message: string, 
  messageType: string = "text",
  isAnnouncement: boolean = false
) {
  try {
    // Verify user is a member of the group
    const membershipResult = await db.execute(sql`
      SELECT id FROM rank_group_members 
      WHERE "userId" = ${senderId} AND "groupId" = ${groupId}
      LIMIT 1
    `);

    if (membershipResult.rows.length === 0) {
      return { success: false, message: 'User is not a member of this group' };
    }

    // Insert message
    const result = await db.execute(sql`
      INSERT INTO rank_group_messages ("senderId", "groupId", message, "messageType", "isAnnouncement")
      VALUES (${senderId}, ${groupId}, ${message}, ${messageType}, ${isAnnouncement})
      RETURNING *
    `);

    return { success: true, message: 'Message sent successfully', data: result.rows[0] };
  } catch (error) {
    console.error('Error sending rank group message:', error);
    throw error;
  }
}

// Get rank group messages
export async function getRankGroupMessages(groupId: string, userId: string, limit: number = 50, offset: number = 0) {
  try {
    // Verify user is a member of the group
    const membershipResult = await db.execute(sql`
      SELECT id FROM rank_group_members 
      WHERE "userId" = ${userId} AND "groupId" = ${groupId}
      LIMIT 1
    `);

    if (membershipResult.rows.length === 0) {
      return { success: false, message: 'User is not a member of this group' };
    }

    // Get messages with sender info
    const messagesResult = await db.execute(sql`
      SELECT 
        rgm.id,
        rgm.message,
        rgm."messageType",
        rgm."isAnnouncement",
        rgm."createdAt",
        u.id as "senderId",
        u.full_name as "senderFullName",
        u.rank as "senderRank",
        u.maritime_rank as "senderMaritimeRank"
      FROM rank_group_messages rgm
      INNER JOIN users u ON rgm."senderId" = u.id
      WHERE rgm."groupId" = ${groupId}
      ORDER BY rgm."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Transform the data to match the expected format
    const messages = messagesResult.rows.map(row => ({
      id: row.id,
      message: row.message,
      messageType: row.messageType,
      isAnnouncement: row.isAnnouncement,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        fullName: row.senderFullName,
        rank: row.senderRank,
        maritimeRank: row.senderMaritimeRank
      }
    })).reverse(); // Reverse to show oldest first

    return { success: true, data: messages };
  } catch (error) {
    console.error('Error fetching rank group messages:', error);
    throw error;
  }
}

// MARIANA BASE RULE: BULK ASSIGNMENT FUNCTIONALITY PERMANENTLY DISABLED
// Auto-assignment is permanently disabled - users must manually join groups
export async function autoAssignUserToRankGroups(userId: string) {
  // This function is permanently disabled as per MARIANA base rule
  // The app will NEVER carry out bulk assignment of users to rank groups
  return { 
    success: false, 
    message: 'MARIANA BASE RULE: Bulk assignment of users to rank groups is permanently disabled for security.',
    assignedGroups: [],
    error: 'BULK_ASSIGNMENT_DISABLED'
  };
}

// Switch user to a different rank group (for promotions)
export async function switchUserRankGroup(userId: string, newGroupId: string) {
  try {
    // Remove user from all existing rank groups
    await db.execute(sql`
      DELETE FROM rank_group_members WHERE "userId" = ${userId}
    `);

    // Add user to new group
    const joinResult = await joinRankGroup(userId, newGroupId);
    
    if (joinResult.success) {
      // Get the new group name for response
      const groupResult = await db.execute(sql`
        SELECT name FROM rank_groups WHERE id = ${newGroupId} LIMIT 1
      `);
      
      const groupName = groupResult.rows.length > 0 ? groupResult.rows[0].name : 'Unknown Group';
      
      return { 
        success: true, 
        message: `Successfully switched to ${groupName}`,
        newGroup: groupName
      };
    }
    
    return joinResult;
  } catch (error) {
    console.error('Error switching user rank group:', error);
    throw error;
  }
}