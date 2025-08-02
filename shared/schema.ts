import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, real, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Password for QAAQ login
  needsPasswordChange: boolean("needs_password_change").default(true), // Force password change on third login
  userType: text("user_type").notNull(), // 'sailor' or 'local'
  isAdmin: boolean("is_admin").default(false), // Admin role flag
  nickname: text("nickname"),
  
  // QAAQ-compatible CV/Profile fields
  rank: text("rank"), // Maritime rank (e.g., 'Captain', 'Chief Engineer', 'Officer', 'Crew')
  maritimeRank: text("maritime_rank"), // Detailed maritime rank from QAAQ
  shipName: text("ship_name"), // Current ship name
  currentShipName: text("current_ship_name"), // QAAQ field
  imoNumber: text("imo_number"), // International Maritime Organization number
  currentShipIMO: text("current_ship_imo"), // QAAQ field
  port: text("port"), // Current or next port
  visitWindow: text("visit_window"), // Planned visit time window (e.g., "28 to 30 Jul25")
  city: text("city"),
  currentCity: text("current_city"), // QAAQ field
  country: text("country"),
  nationality: text("nationality"), // QAAQ field
  
  // Professional Experience Fields
  experienceLevel: text("experience_level"), // QAAQ field
  lastCompany: text("last_company"), // QAAQ field
  lastShip: text("last_ship"), // QAAQ field
  onboardSince: text("onboard_since"), // QAAQ field
  onboardStatus: text("onboard_status"), // QAAQ field
  
  // Personal Information
  dateOfBirth: text("date_of_birth"), // QAAQ field
  gender: text("gender"), // QAAQ field
  whatsAppNumber: text("whatsapp_number"), // QAAQ field
  profilePictureUrl: text("profile_picture_url"), // WhatsApp profile picture URL
  
  // System Fields
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false), // QAAQ field
  isPlatformAdmin: boolean("is_platform_admin").default(false), // QAAQ field
  isBlocked: boolean("is_blocked").default(false), // QAAQ field
  
  // Location tracking
  latitude: real("latitude"),
  longitude: real("longitude"),
  currentLatitude: real("current_latitude"), // QAAQ field
  currentLongitude: real("current_longitude"), // QAAQ field
  deviceLatitude: real("device_latitude"), // Current device GPS location
  deviceLongitude: real("device_longitude"), // Current device GPS location
  locationSource: text("location_source").default("city"), // 'device', 'ship', 'city'
  locationUpdatedAt: timestamp("location_updated_at"),
  
  // Q&A tracking
  questionCount: integer("question_count").default(0), // Total questions asked on QAAQ
  answerCount: integer("answer_count").default(0), // Total answers given on QAAQ
  
  // System metadata
  isVerified: boolean("is_verified").default(false),
  loginCount: integer("login_count").default(0),
  lastLogin: timestamp("last_login"),
  lastUpdated: timestamp("last_updated").default(sql`now()`), // QAAQ field
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  location: text("location"),
  category: text("category").notNull(),
  authorType: text("author_type").notNull(), // 'fullName', 'nickname', 'anonymous'
  authorName: text("author_name"), // display name based on authorType
  images: jsonb("images").$type<string[]>().default([]),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const chatConnections = pgTable("chat_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").default(sql`now()`),
  acceptedAt: timestamp("accepted_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Rank-based groups for maritime personnel
export const rankGroups = pgTable("rank_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // TSI, MSI, Mtr CO, 20 30, CE 2E, 3E 4E, Cadets, Crew, Marine Personnel
  description: text("description").notNull(),
  groupType: text("group_type").notNull().default("rank"), // rank, department, general
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Group membership for users
export const rankGroupMembers = pgTable("rank_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").default("member"), // member, admin, moderator
  joinedAt: timestamp("joined_at").default(sql`now()`),
});

// Group messages/broadcasts
export const rankGroupMessages = pgTable("rank_group_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").default("text"), // text, image, file, announcement
  isAnnouncement: boolean("is_announcement").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Bot Rules Documentation Table
export const botRules = pgTable("bot_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  version: varchar("version", { length: 50 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'QBOT', 'QOI_GPT', 'GENERAL'
  status: varchar("status", { length: 50 }).default('active'), // 'active', 'archived', 'draft'
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  createdBy: varchar("created_by").references(() => users.id),
});



// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  verificationCodes: many(verificationCodes),
  sentConnections: many(chatConnections, { relationName: 'sentConnections' }),
  receivedConnections: many(chatConnections, { relationName: 'receivedConnections' }),
  sentMessages: many(chatMessages, { relationName: 'sentMessages' }),
  rankGroupMemberships: many(rankGroupMembers),
  rankGroupMessages: many(rankGroupMessages),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id],
  }),
}));

export const chatConnectionsRelations = relations(chatConnections, ({ one, many }) => ({
  sender: one(users, {
    fields: [chatConnections.senderId],
    references: [users.id],
    relationName: 'sentConnections',
  }),
  receiver: one(users, {
    fields: [chatConnections.receiverId],
    references: [users.id],
    relationName: 'receivedConnections',
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  connection: one(chatConnections, {
    fields: [chatMessages.connectionId],
    references: [chatConnections.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
}));

export const rankGroupsRelations = relations(rankGroups, ({ many }) => ({
  members: many(rankGroupMembers),
  messages: many(rankGroupMessages),
}));

export const rankGroupMembersRelations = relations(rankGroupMembers, ({ one }) => ({
  group: one(rankGroups, {
    fields: [rankGroupMembers.groupId],
    references: [rankGroups.id],
  }),
  user: one(users, {
    fields: [rankGroupMembers.userId],
    references: [users.id],
  }),
}));

export const rankGroupMessagesRelations = relations(rankGroupMessages, ({ one }) => ({
  group: one(rankGroups, {
    fields: [rankGroupMessages.groupId],
    references: [rankGroups.id],
  }),
  sender: one(users, {
    fields: [rankGroupMessages.senderId],
    references: [users.id],
  }),
}));



// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  userType: true,
  nickname: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  location: true,
  category: true,
  authorType: true,
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const insertChatConnectionSchema = createInsertSchema(chatConnections).pick({
  receiverId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  connectionId: true,
  message: true,
});

export const insertRankGroupSchema = createInsertSchema(rankGroups).pick({
  name: true,
  description: true,
  groupType: true,
});

export const insertRankGroupMemberSchema = createInsertSchema(rankGroupMembers).pick({
  groupId: true,
  userId: true,
  role: true,
});

export const insertRankGroupMessageSchema = createInsertSchema(rankGroupMessages).pick({
  groupId: true,
  message: true,
  messageType: true,
  isAnnouncement: true,
});

export const insertBotRuleSchema = createInsertSchema(botRules)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const updateProfileSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  password: true,
  needsPasswordChange: true,
  isAdmin: true,
  isPlatformAdmin: true,
  isBlocked: true,
  isVerified: true,
  loginCount: true,
  lastLogin: true,
  deviceLatitude: true,
  deviceLongitude: true,
  locationSource: true,
  locationUpdatedAt: true,
  questionCount: true,
  answerCount: true,
  lastUpdated: true,
}).extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  whatsAppNumber: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  maritimeRank: z.string().optional(),
  experienceLevel: z.enum(["Fresher", "Junior", "Senior", "Expert"]).optional(),
  currentShipName: z.string().optional(),
  currentShipIMO: z.string().optional(),
  lastCompany: z.string().optional(),
  lastShip: z.string().optional(),
  onboardSince: z.string().optional(),
  onboardStatus: z.enum(["Onboard", "On Leave", "Between Ships", "Shore Job"]).optional(),
  currentCity: z.string().optional(),
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect & {
  profilePictureUrl?: string | null;
  company?: string | null;
};
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type ChatConnection = typeof chatConnections.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertChatConnection = z.infer<typeof insertChatConnectionSchema>;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type InsertBotRule = z.infer<typeof insertBotRuleSchema>;
export type BotRule = typeof botRules.$inferSelect;
