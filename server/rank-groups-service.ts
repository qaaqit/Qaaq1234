import { db } from "./db";
import { rankGroups, rankGroupMembers, rankGroupMessages, users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Initialize the 9 maritime rank groups
export async function initializeRankGroups() {
  const groups = [
    {
      name: "TSI",
      description: "Technical Superintendent Inspector - Senior maritime technical officers",
      groupType: "rank"
    },
    {
      name: "MSI", 
      description: "Marine Superintendent Inspector - Senior marine operations officers",
      groupType: "rank"
    },
    {
      name: "Mtr CO",
      description: "Master & Chief Officer - Ship command and navigation officers",
      groupType: "rank"
    },
    {
      name: "20 30",
      description: "2nd Officer & 3rd Officer - Deck officers and navigation watch keepers",
      groupType: "rank"
    },
    {
      name: "CE 2E",
      description: "Chief Engineer & 2nd Engineer - Senior engine room officers",
      groupType: "rank"
    },
    {
      name: "3E 4E",
      description: "3rd Engineer & 4th Engineer - Junior engine room officers",
      groupType: "rank"
    },
    {
      name: "Cadets",
      description: "Maritime Cadets - Trainees and maritime academy students",
      groupType: "rank"
    },
    {
      name: "Crew",
      description: "Ship Crew - Deck and engine room crew members",
      groupType: "rank"
    },
    {
      name: "Marine Personnel",
      description: "General Marine Personnel - All maritime professionals",
      groupType: "general"
    }
  ];

  try {
    console.log('🏢 Initializing maritime rank groups...');
    
    for (const group of groups) {
      // Check if group already exists
      const existing = await db
        .select()
        .from(rankGroups)
        .where(eq(rankGroups.name, group.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rankGroups).values(group);
        console.log(`✅ Created rank group: ${group.name}`);
      } else {
        console.log(`📋 Rank group already exists: ${group.name}`);
      }
    }
    
    console.log('🏢 Maritime rank groups initialization complete');
    return { success: true, message: 'Rank groups initialized successfully' };
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

// Auto-assign users to rank groups based on their maritime rank
export async function autoAssignUserToRankGroups(userId: string) {
  try {
    const userResult = await db.execute(sql`
      SELECT id, maritime_rank FROM users WHERE id = ${userId} LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const user = userResult.rows[0];
    const userRank = (user.maritime_rank as string)?.toLowerCase() || '';
    
    // Mapping rules for auto-assignment
    const rankMappings = [
      { keywords: ['technical superintendent', 'superintendent', 'tsi'], groupName: 'TSI' },
      { keywords: ['marine superintendent', 'msi'], groupName: 'MSI' },
      { keywords: ['master', 'captain', 'chief officer', 'chief mate'], groupName: 'Mtr CO' },
      { keywords: ['2nd officer', '3rd officer', 'second officer', 'third officer'], groupName: '20 30' },
      { keywords: ['chief engineer', '2nd engineer', 'second engineer'], groupName: 'CE 2E' },
      { keywords: ['3rd engineer', '4th engineer', 'third engineer', 'fourth engineer'], groupName: '3E 4E' },
      { keywords: ['cadet', 'trainee', 'deck cadet', 'engine cadet'], groupName: 'Cadets' },
      { keywords: ['crew', 'seaman', 'bosun', 'fitter', 'wiper', 'cook', 'steward'], groupName: 'Crew' },
      { keywords: ['eto', 'electrical technical officer', 'electrical superintendent', 'electrician'], groupName: 'ETO & Elec Supdts' }
    ];

    const assignedGroups = [];
    
    // Remove user from all existing rank groups first (single group rule)
    await db.execute(sql`
      DELETE FROM rank_group_members WHERE "userId" = ${userId}
    `);

    // Try to match specific rank group first
    let foundSpecificGroup = false;
    for (const mapping of rankMappings) {
      const matchFound = mapping.keywords.some(keyword => userRank.includes(keyword));
      
      if (matchFound) {
        const groupResult = await db.execute(sql`
          SELECT id FROM rank_groups WHERE name = ${mapping.groupName} LIMIT 1
        `);

        if (groupResult.rows.length > 0) {
          const joinResult = await joinRankGroup(userId, groupResult.rows[0].id as string);
          if (joinResult.success) {
            assignedGroups.push(mapping.groupName);
            foundSpecificGroup = true;
          }
        }
        break; // Only assign to first matching group
      }
    }

    // If no specific rank matched, assign to ETO & Elec Supdts as default
    if (!foundSpecificGroup) {
      const etoElecSupdtsResult = await db.execute(sql`
        SELECT id FROM rank_groups WHERE name = 'ETO & Elec Supdts' LIMIT 1
      `);

      if (etoElecSupdtsResult.rows.length > 0) {
        const joinResult = await joinRankGroup(userId, etoElecSupdtsResult.rows[0].id as string);
        if (joinResult.success) {
          assignedGroups.push('ETO & Elec Supdts');
        }
      }
    }

    return { 
      success: true, 
      message: `Assigned to groups: ${assignedGroups.join(', ')}`,
      assignedGroups 
    };
  } catch (error) {
    console.error('Error auto-assigning user to rank groups:', error);
    throw error;
  }
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