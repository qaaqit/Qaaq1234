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
    const groups = await db
      .select({
        id: rankGroups.id,
        name: rankGroups.name,
        description: rankGroups.description,
        groupType: rankGroups.groupType,
        isActive: rankGroups.isActive,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${rankGroupMembers} 
          WHERE ${rankGroupMembers.groupId} = ${rankGroups.id}
        )`.as('memberCount'),
        createdAt: rankGroups.createdAt
      })
      .from(rankGroups)
      .where(eq(rankGroups.isActive, true))
      .orderBy(rankGroups.name);

    return groups;
  } catch (error) {
    console.error('Error fetching rank groups:', error);
    throw error;
  }
}

// Get user's rank groups
export async function getUserRankGroups(userId: string) {
  try {
    const userGroups = await db
      .select({
        id: rankGroups.id,
        name: rankGroups.name,
        description: rankGroups.description,
        groupType: rankGroups.groupType,
        role: rankGroupMembers.role,
        joinedAt: rankGroupMembers.joinedAt,
        unreadCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${rankGroupMessages} 
          WHERE ${rankGroupMessages.groupId} = ${rankGroups.id} 
          AND ${rankGroupMessages.createdAt} > COALESCE(
            (SELECT MAX(${rankGroupMessages.createdAt}) 
             FROM ${rankGroupMessages} 
             WHERE ${rankGroupMessages.senderId} = ${userId}), 
            ${rankGroupMembers.joinedAt}
          )
        )`.as('unreadCount')
      })
      .from(rankGroupMembers)
      .innerJoin(rankGroups, eq(rankGroupMembers.groupId, rankGroups.id))
      .where(
        and(
          eq(rankGroupMembers.userId, userId),
          eq(rankGroups.isActive, true)
        )
      )
      .orderBy(rankGroups.name);

    return userGroups;
  } catch (error) {
    console.error('Error fetching user rank groups:', error);
    throw error;
  }
}

// Join a rank group
export async function joinRankGroup(userId: string, groupId: string, role: string = "member") {
  try {
    // Check if user is already a member
    const existing = await db
      .select()
      .from(rankGroupMembers)
      .where(
        and(
          eq(rankGroupMembers.userId, userId),
          eq(rankGroupMembers.groupId, groupId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: 'User is already a member of this group' };
    }

    // Add user to group
    await db.insert(rankGroupMembers).values({
      userId,
      groupId,
      role
    });

    return { success: true, message: 'Successfully joined the group' };
  } catch (error) {
    console.error('Error joining rank group:', error);
    throw error;
  }
}

// Leave a rank group
export async function leaveRankGroup(userId: string, groupId: string) {
  try {
    await db
      .delete(rankGroupMembers)
      .where(
        and(
          eq(rankGroupMembers.userId, userId),
          eq(rankGroupMembers.groupId, groupId)
        )
      );

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
    const membership = await db
      .select()
      .from(rankGroupMembers)
      .where(
        and(
          eq(rankGroupMembers.userId, senderId),
          eq(rankGroupMembers.groupId, groupId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return { success: false, message: 'User is not a member of this group' };
    }

    // Insert message
    const result = await db.insert(rankGroupMessages).values({
      senderId,
      groupId,
      message,
      messageType,
      isAnnouncement
    }).returning();

    return { success: true, message: 'Message sent successfully', data: result[0] };
  } catch (error) {
    console.error('Error sending rank group message:', error);
    throw error;
  }
}

// Get rank group messages
export async function getRankGroupMessages(groupId: string, userId: string, limit: number = 50, offset: number = 0) {
  try {
    // Verify user is a member of the group
    const membership = await db
      .select()
      .from(rankGroupMembers)
      .where(
        and(
          eq(rankGroupMembers.userId, userId),
          eq(rankGroupMembers.groupId, groupId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return { success: false, message: 'User is not a member of this group' };
    }

    // Get messages with sender info
    const messages = await db
      .select({
        id: rankGroupMessages.id,
        message: rankGroupMessages.message,
        messageType: rankGroupMessages.messageType,
        isAnnouncement: rankGroupMessages.isAnnouncement,
        createdAt: rankGroupMessages.createdAt,
        sender: {
          id: users.id,
          fullName: users.fullName,
          rank: users.rank,
          maritimeRank: users.maritimeRank
        }
      })
      .from(rankGroupMessages)
      .innerJoin(users, eq(rankGroupMessages.senderId, users.id))
      .where(eq(rankGroupMessages.groupId, groupId))
      .orderBy(sql`${rankGroupMessages.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return { success: true, data: messages.reverse() }; // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching rank group messages:', error);
    throw error;
  }
}

// Auto-assign users to rank groups based on their maritime rank
export async function autoAssignUserToRankGroups(userId: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const userRank = user[0].maritimeRank?.toLowerCase() || user[0].rank?.toLowerCase() || '';
    
    // Mapping rules for auto-assignment
    const rankMappings = [
      { keywords: ['technical superintendent', 'superintendent', 'tsi'], groupName: 'TSI' },
      { keywords: ['marine superintendent', 'msi'], groupName: 'MSI' },
      { keywords: ['master', 'captain', 'chief officer', 'chief mate'], groupName: 'Mtr CO' },
      { keywords: ['2nd officer', '3rd officer', 'second officer', 'third officer'], groupName: '20 30' },
      { keywords: ['chief engineer', '2nd engineer', 'second engineer'], groupName: 'CE 2E' },
      { keywords: ['3rd engineer', '4th engineer', 'third engineer', 'fourth engineer'], groupName: '3E 4E' },
      { keywords: ['cadet', 'trainee', 'deck cadet', 'engine cadet'], groupName: 'Cadets' },
      { keywords: ['crew', 'seaman', 'bosun', 'fitter', 'wiper', 'cook', 'steward'], groupName: 'Crew' }
    ];

    const assignedGroups = [];
    
    // Always assign to Marine Personnel
    const marinePersonnelGroup = await db
      .select()
      .from(rankGroups)
      .where(eq(rankGroups.name, 'Marine Personnel'))
      .limit(1);

    if (marinePersonnelGroup.length > 0) {
      const joinResult = await joinRankGroup(userId, marinePersonnelGroup[0].id);
      if (joinResult.success) {
        assignedGroups.push('Marine Personnel');
      }
    }

    // Try to match specific rank group
    for (const mapping of rankMappings) {
      const matchFound = mapping.keywords.some(keyword => userRank.includes(keyword));
      
      if (matchFound) {
        const group = await db
          .select()
          .from(rankGroups)
          .where(eq(rankGroups.name, mapping.groupName))
          .limit(1);

        if (group.length > 0) {
          const joinResult = await joinRankGroup(userId, group[0].id);
          if (joinResult.success) {
            assignedGroups.push(mapping.groupName);
          }
        }
        break; // Only assign to first matching group
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