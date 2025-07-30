import { pool } from './db';

export interface CPSSGroup {
  id: string;
  groupId: string;
  groupName: string;
  breadcrumbPath: string;
  groupType: string;
  country?: string;
  port?: string;
  suburb?: string;
  service?: string;
  description?: string;
  memberCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CPSSGroupMember {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  joinedAt: Date;
  isActive: boolean;
  role: string;
}

export interface CPSSGroupPost {
  id: string;
  postId: string;
  groupId: string;
  userId: string;
  userName: string;
  content: string;
  postType: string;
  attachments: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or get a CPSS group based on breadcrumb navigation
 */
export async function createOrGetCPSSGroup(breadcrumbData: {
  country?: string;
  port?: string;
  suburb?: string;
  service?: string;
  groupType: string;
  createdBy: string;
}): Promise<CPSSGroup> {
  // Build breadcrumb path
  const pathParts = [];
  if (breadcrumbData.country) pathParts.push(breadcrumbData.country);
  if (breadcrumbData.port) pathParts.push(breadcrumbData.port);
  if (breadcrumbData.suburb) pathParts.push(breadcrumbData.suburb);
  if (breadcrumbData.service) pathParts.push(breadcrumbData.service);
  
  const breadcrumbPath = pathParts.join(' > ');
  const groupName = `${breadcrumbPath} Group`;
  const groupId = `cpss_${breadcrumbPath.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // Check if group already exists
  const existingQuery = `SELECT * FROM cpss_groups WHERE group_id = $1`;
  const existingResult = await pool.query(existingQuery, [groupId]);
  
  if (existingResult.rows.length > 0) {
    return mapRowToGroup(existingResult.rows[0]);
  }

  // Create new group
  const insertQuery = `
    INSERT INTO cpss_groups (
      group_id, group_name, breadcrumb_path, group_type, 
      country, port, suburb, service, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    groupId,
    groupName,
    breadcrumbPath,
    breadcrumbData.groupType,
    breadcrumbData.country || null,
    breadcrumbData.port || null,
    breadcrumbData.suburb || null,
    breadcrumbData.service || null,
    breadcrumbData.createdBy
  ];

  try {
    const result = await pool.query(insertQuery, values);
    return mapRowToGroup(result.rows[0]);
  } catch (error) {
    console.error('Error creating CPSS group:', error);
    throw new Error('Failed to create CPSS group');
  }
}

/**
 * Join a CPSS group
 */
export async function joinCPSSGroup(groupId: string, userId: string, userName: string): Promise<boolean> {
  try {
    // Check if this is a rank group and enforce single rank group membership
    const groupTypeQuery = `SELECT group_type FROM cpss_groups WHERE group_id = $1`;
    const groupTypeResult = await pool.query(groupTypeQuery, [groupId]);
    
    if (groupTypeResult.rows.length === 0) {
      throw new Error('Group not found');
    }
    
    const groupType = groupTypeResult.rows[0].group_type;
    
    // Check if user is admin (admin users can join multiple rank groups)
    const isAdmin = userId === 'wa_919029010070' || userName === 'Piyush Gupta' || 
                    userId === 'wa_919920027697' || userName === 'Explain VIT' ||
                    userId.includes('mushy.piyush@gmail.com');
    
    if (groupType === 'rank' && !isAdmin) {
      // Check if user is already in any rank group
      const existingRankQuery = `
        SELECT gm.group_id, g.group_name 
        FROM cpss_group_members gm
        JOIN cpss_groups g ON gm.group_id = g.group_id
        WHERE gm.user_id = $1 AND gm.is_active = TRUE AND g.group_type = 'rank'
      `;
      const existingResult = await pool.query(existingRankQuery, [userId]);
      
      if (existingResult.rows.length > 0) {
        // User is already in a rank group, leave the previous one
        const previousGroupId = existingResult.rows[0].group_id;
        const previousGroupName = existingResult.rows[0].group_name;
        
        await pool.query(
          `UPDATE cpss_group_members SET is_active = FALSE WHERE group_id = $1 AND user_id = $2`,
          [previousGroupId, userId]
        );
        
        // Update previous group member count
        await updateGroupMemberCount(previousGroupId);
        
        console.log(`User ${userName} left ${previousGroupName} to join new rank group`);
      }
    }

    const query = `
      INSERT INTO cpss_group_members (group_id, user_id, user_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET is_active = TRUE, joined_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await pool.query(query, [groupId, userId, userName]);
    
    // Update member count
    await updateGroupMemberCount(groupId);
    
    return true;
  } catch (error) {
    console.error('Error joining CPSS group:', error);
    return false;
  }
}

/**
 * Leave a CPSS group
 */
export async function leaveCPSSGroup(groupId: string, userId: string): Promise<boolean> {
  const query = `
    UPDATE cpss_group_members 
    SET is_active = FALSE 
    WHERE group_id = $1 AND user_id = $2
  `;

  try {
    await pool.query(query, [groupId, userId]);
    
    // Update member count
    await updateGroupMemberCount(groupId);
    
    return true;
  } catch (error) {
    console.error('Error leaving CPSS group:', error);
    return false;
  }
}

/**
 * Get user's joined groups
 */
export async function getUserCPSSGroups(userId: string): Promise<CPSSGroup[]> {
  const query = `
    SELECT g.* FROM cpss_groups g
    JOIN cpss_group_members m ON g.group_id = m.group_id
    WHERE m.user_id = $1 AND m.is_active = TRUE
    ORDER BY m.joined_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows.map(mapRowToGroup);
  } catch (error) {
    console.error('Error fetching user CPSS groups:', error);
    return [];
  }
}

/**
 * Get user's rank groups specifically
 */
export async function getUserRankGroups(userId: string): Promise<CPSSGroup[]> {
  const query = `
    SELECT g.* FROM cpss_groups g
    JOIN cpss_group_members m ON g.group_id = m.group_id
    WHERE m.user_id = $1 AND m.is_active = TRUE AND g.group_type = 'rank'
    ORDER BY m.joined_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows.map(mapRowToGroup);
  } catch (error) {
    console.error('Error fetching user rank groups:', error);
    return [];
  }
}

/**
 * Get all available rank groups
 */
export async function getAllRankGroups(userId?: string): Promise<CPSSGroup[]> {
  let query;
  let params: any[] = [];
  
  if (userId) {
    // Query that prioritizes recently joined rank groups at the top
    query = `
      SELECT 
        g.*,
        m.joined_at,
        CASE WHEN m.user_id IS NOT NULL THEN 1 ELSE 0 END as is_user_member
      FROM cpss_groups g
      LEFT JOIN cpss_group_members m ON g.group_id = m.group_id AND m.user_id = $1 AND m.is_active = TRUE
      WHERE g.is_active = TRUE AND g.group_type = 'rank'
      ORDER BY 
        is_user_member DESC,
        m.joined_at DESC NULLS LAST,
        g.member_count DESC,
        g.group_name
    `;
    params = [userId];
  } else {
    // Original query for when no user ID is provided
    query = `
      SELECT * FROM cpss_groups 
      WHERE is_active = TRUE AND group_type = 'rank'
      ORDER BY member_count DESC, group_name
    `;
  }

  try {
    const result = await pool.query(query, params);
    return result.rows.map(mapRowToGroup);
  } catch (error) {
    console.error('Error fetching all rank groups:', error);
    throw error;
  }
}

/**
 * Get all available CPSS groups
 */
export async function getAllCPSSGroups(userId?: string): Promise<CPSSGroup[]> {
  let query;
  let params: any[] = [];
  
  if (userId) {
    // Query that prioritizes recently joined groups at the top
    query = `
      SELECT 
        g.*,
        m.joined_at,
        CASE WHEN m.user_id IS NOT NULL THEN 1 ELSE 0 END as is_user_member
      FROM cpss_groups g
      LEFT JOIN cpss_group_members m ON g.group_id = m.group_id AND m.user_id = $1 AND m.is_active = TRUE
      WHERE g.is_active = TRUE 
      ORDER BY 
        is_user_member DESC,
        m.joined_at DESC NULLS LAST,
        g.breadcrumb_path, 
        g.member_count DESC
    `;
    params = [userId];
  } else {
    // Original query for when no user ID is provided
    query = `
      SELECT * FROM cpss_groups 
      WHERE is_active = TRUE 
      ORDER BY breadcrumb_path, member_count DESC
    `;
  }

  try {
    const result = await pool.query(query, params);
    return result.rows.map(mapRowToGroup);
  } catch (error) {
    console.error('Error fetching all CPSS groups:', error);
    throw error; // Re-throw to see the actual error
  }
}

/**
 * Get groups by location hierarchy
 */
export async function getCPSSGroupsByLocation(country?: string, port?: string, suburb?: string): Promise<CPSSGroup[]> {
  let query = `SELECT * FROM cpss_groups WHERE is_active = TRUE`;
  const params: any[] = [];
  let paramCount = 0;

  if (country) {
    paramCount++;
    query += ` AND country = $${paramCount}`;
    params.push(country);
  }
  
  if (port) {
    paramCount++;
    query += ` AND port = $${paramCount}`;
    params.push(port);
  }
  
  if (suburb) {
    paramCount++;
    query += ` AND suburb = $${paramCount}`;
    params.push(suburb);
  }

  query += ` ORDER BY member_count DESC`;

  try {
    const result = await pool.query(query, params);
    return result.rows.map(mapRowToGroup);
  } catch (error) {
    console.error('Error fetching CPSS groups by location:', error);
    return [];
  }
}

/**
 * Create a post in a CPSS group
 */
export async function createCPSSGroupPost(postData: {
  groupId: string;
  userId: string;
  userName: string;
  content: string;
  postType?: string;
  attachments?: string[];
}): Promise<CPSSGroupPost> {
  const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const query = `
    INSERT INTO cpss_group_posts (
      post_id, group_id, user_id, user_name, content, post_type, attachments
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    postId,
    postData.groupId,
    postData.userId,
    postData.userName,
    postData.content,
    postData.postType || 'discussion',
    postData.attachments || []
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToGroupPost(result.rows[0]);
  } catch (error) {
    console.error('Error creating CPSS group post:', error);
    throw new Error('Failed to create group post');
  }
}

/**
 * Get posts for a CPSS group
 */
export async function getCPSSGroupPosts(groupId: string): Promise<CPSSGroupPost[]> {
  const query = `
    SELECT * FROM cpss_group_posts 
    WHERE group_id = $1 
    ORDER BY is_pinned DESC, created_at DESC
  `;

  try {
    const result = await pool.query(query, [groupId]);
    return result.rows.map(mapRowToGroupPost);
  } catch (error) {
    console.error('Error fetching CPSS group posts:', error);
    return [];
  }
}

/**
 * Get group members
 */
export async function getCPSSGroupMembers(groupId: string): Promise<CPSSGroupMember[]> {
  const query = `
    SELECT * FROM cpss_group_members 
    WHERE group_id = $1 AND is_active = TRUE 
    ORDER BY joined_at ASC
  `;

  try {
    const result = await pool.query(query, [groupId]);
    return result.rows.map(mapRowToGroupMember);
  } catch (error) {
    console.error('Error fetching CPSS group members:', error);
    return [];
  }
}

/**
 * Check if user is member of group
 */
export async function isUserMemberOfGroup(groupId: string, userId: string): Promise<boolean> {
  const query = `
    SELECT 1 FROM cpss_group_members 
    WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
  `;

  try {
    const result = await pool.query(query, [groupId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
}

/**
 * Update group member count
 */
async function updateGroupMemberCount(groupId: string): Promise<void> {
  const query = `
    UPDATE cpss_groups 
    SET 
      member_count = (SELECT COUNT(*) FROM cpss_group_members WHERE group_id = $1 AND is_active = TRUE),
      updated_at = CURRENT_TIMESTAMP
    WHERE group_id = $1
  `;

  try {
    await pool.query(query, [groupId]);
  } catch (error) {
    console.error('Error updating group member count:', error);
  }
}

// Helper functions to map database rows to interfaces
function mapRowToGroup(row: any): CPSSGroup {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    breadcrumbPath: row.breadcrumb_path,
    groupType: row.group_type,
    country: row.country,
    port: row.port,
    suburb: row.suburb,
    service: row.service,
    description: row.description,
    memberCount: row.member_count || 0,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function mapRowToGroupMember(row: any): CPSSGroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    userName: row.user_name,
    joinedAt: new Date(row.joined_at),
    isActive: row.is_active,
    role: row.role
  };
}

function mapRowToGroupPost(row: any): CPSSGroupPost {
  return {
    id: row.id,
    postId: row.post_id,
    groupId: row.group_id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    postType: row.post_type,
    attachments: row.attachments || [],
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    isPinned: row.is_pinned || false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}