import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, real, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// System configuration table for admin settings
export const systemConfigs = pgTable("system_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").notNull().unique(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  valueType: text("value_type").notNull().default("string"), // 'string', 'number', 'boolean', 'json'
  updatedBy: text("updated_by"), // User ID who last updated
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Unified Identity Management Tables
export const userIdentities = pgTable("user_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // References users.id
  provider: text("provider").notNull(), // 'qaaq', 'replit', 'google', 'whatsapp', 'email'
  providerId: text("provider_id").notNull(), // External ID from provider
  isPrimary: boolean("is_primary").default(false), // Primary identity for login
  isVerified: boolean("is_verified").default(false), // Identity verification status
  metadata: jsonb("metadata").$type<{
    email?: string;
    phone?: string;
    displayName?: string;
    profileImageUrl?: string;
    [key: string]: any;
  }>().default({}), // Provider-specific data
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").unique(), // Human-readable user ID (e.g., QAAQ123, CAP456) - Legacy compatibility
  fullName: text("full_name").notNull(),
  email: text("email").unique(), // Primary email - may be null for WhatsApp-only users
  password: text("password"), // Password for QAAQ login
  hasSetCustomPassword: boolean("has_set_custom_password").default(false).notNull(), // Whether user has set their own password
  needsPasswordChange: boolean("needs_password_change").default(true), // Force password change on third login
  passwordCreatedAt: timestamp("password_created_at"), // When current password was created
  passwordRenewalDue: timestamp("password_renewal_due"), // When password renewal is required (12 months from creation)
  mustCreatePassword: boolean("must_create_password").default(true).notNull(), // Force password creation on next login
  userType: text("user_type").notNull(), // 'sailor' or 'local'
  isAdmin: boolean("is_admin").default(false), // Admin role flag
  nickname: text("nickname"),
  
  // Primary auth method tracking
  primaryAuthProvider: text("primary_auth_provider").notNull().default("qaaq"), // Primary login method
  authProviders: jsonb("auth_providers").$type<string[]>().default([]), // All linked providers
  
  // QAAQ-compatible CV/Profile fields
  rank: text("rank"), // Maritime rank (e.g., 'Captain', 'Chief Engineer', 'Officer', 'Crew')
  maritimeRank: text("maritime_rank"), // Detailed maritime rank from QAAQ
  shipName: text("ship_name"), // Current ship name
  currentShipName: text("current_ship_name"), // QAAQ field
  currentLastShip: text("current_lastShip"), // Current or last ship name
  imoNumber: text("imo_number"), // International Maritime Organization number
  currentShipIMO: text("current_ship_imo"), // QAAQ field
  port: text("port"), // Current or next port
  visitWindow: text("visit_window"), // Planned visit time window (e.g., "28 to 30 Jul25")
  city: text("city"),
  // password field moved to line 12 for proper database alignment
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
  whatsAppProfilePictureUrl: text("whatsapp_profile_picture_url"), // WhatsApp profile picture from QBOT
  whatsAppDisplayName: text("whatsapp_display_name"), // WhatsApp display name from QBOT
  
  // Legacy OAuth fields - DEPRECATED: Use userIdentities table instead
  googleId: text("google_id"), // DEPRECATED: Use userIdentities
  googleEmail: text("google_email"), // DEPRECATED: Use userIdentities
  googleProfilePictureUrl: text("google_profile_picture_url"), // DEPRECATED: Use userIdentities
  googleDisplayName: text("google_display_name"), // DEPRECATED: Use userIdentities
  authProvider: text("auth_provider").default("qaaq"), // DEPRECATED: Use primaryAuthProvider
  
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
  
  // Subscription/Premium fields - REMOVED subscription_id to match parent QAAQ database
  isPremium: boolean("is_premium").default(false), // Premium subscription status
  premiumExpiresAt: timestamp("premium_expires_at"), // Premium subscription expiry
  subscriptionType: text("subscription_type"), // 'premium_monthly', 'premium_yearly', 'super_user'
  subscriptionStatus: text("subscription_status").default("inactive"), // 'active', 'inactive', 'cancelled', 'paused'
  razorpayCustomerId: text("razorpay_customer_id"), // Razorpay customer ID for recurring payments
  paymentMethod: text("payment_method"), // Last used payment method ('card', 'upi', 'netbanking', etc.)
  lastChatClearAt: timestamp("last_chat_clear_at"), // Last time user cleared their QBOT chat
  
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
  isDelivered: boolean("is_delivered").default(true), // Single tick - message delivered to server
  readAt: timestamp("read_at"), // Double tick - when message was read by recipient
  deliveredAt: timestamp("delivered_at").default(sql`now()`), // When message was delivered
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

// Rank-based chat messages (separate from group messages)
export const rankChatMessages = pgTable("rank_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maritimeRank: text("maritime_rank").notNull(), // Filter messages by rank (chief_engineer, captain, etc.)
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").default("text"), // text, image, file
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

// WhatsApp Messages Storage for rank analysis
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderNumber: text("sender_number").notNull(),
  messageBody: text("message_body").notNull(),
  messageType: text("message_type").default("text"), // text, image, document, etc.
  isProcessedForRank: boolean("is_processed_for_rank").default(false),
  extractedRank: text("extracted_rank"), // Detected rank from message
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Email verification tokens for registration
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  userData: jsonb("user_data").notNull(), // Store registration data until verified
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
});

// SEMM (System > Equipment > Make > Model) Hierarchy Tables
// Maritime classification system following the complete 4-level hierarchy

// Systems (Top level - e.g., 'a' = Propulsion, 'b' = Power Generation)
export const semmSystems = pgTable("semm_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // e.g., 'a', 'b', 'c'
  title: text("title").notNull(), // e.g., 'Propulsion', 'Power Generation'
  description: text("description"),
  order: integer("order").notNull(), // Display order
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Equipment (Second level - e.g., 'aa' = Main Engine, 'ab' = Gearbox)
export const semmEquipment = pgTable("semm_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemCode: text("system_code").notNull(), // References system code (e.g., 'a')
  code: text("code").notNull().unique(), // e.g., 'aa', 'ab', 'ba', 'bb'
  title: text("title").notNull(), // e.g., 'Main Engine', 'Gearbox'
  description: text("description"),
  order: integer("order").notNull(), // Display order within system
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Makes (Third level - e.g., 'Wartsila', 'MAN', 'Caterpillar')
export const semmMakes = pgTable("semm_makes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentCode: text("equipment_code").notNull(), // References equipment code (e.g., 'aa')
  code: text("code").notNull().unique(), // e.g., 'aa-wartsila', 'aa-man'
  name: text("name").notNull(), // e.g., 'Wartsila', 'MAN B&W'
  description: text("description"),
  country: text("country"), // Manufacturer country
  website: text("website"), // Manufacturer website
  order: integer("order").notNull(), // Display order within equipment
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Models (Fourth level - e.g., 'W6L32', 'ME-C', 'C280')
export const semmModels = pgTable("semm_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  makeCode: text("make_code").notNull(), // References make code (e.g., 'aa-wartsila')
  code: text("code").notNull().unique(), // e.g., 'aa-wartsila-w6l32'
  model: text("model").notNull(), // e.g., 'W6L32', 'ME-C 7S60'
  description: text("description"),
  specifications: jsonb("specifications").$type<{
    power?: string;
    rpm?: string;
    cylinders?: number;
    displacement?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: any;
  }>().default({}), // Technical specifications
  yearIntroduced: integer("year_introduced"),
  isActive: boolean("is_active").default(true),
  order: integer("order").notNull(), // Display order within make
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});



// Relations - Note: usersRelations defined later with identity support

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

// SEMM Hierarchy Relations
export const semmSystemsRelations = relations(semmSystems, ({ many }) => ({
  equipment: many(semmEquipment),
}));

export const semmEquipmentRelations = relations(semmEquipment, ({ one, many }) => ({
  system: one(semmSystems, {
    fields: [semmEquipment.systemCode],
    references: [semmSystems.code],
  }),
  makes: many(semmMakes),
}));

export const semmMakesRelations = relations(semmMakes, ({ one, many }) => ({
  equipment: one(semmEquipment, {
    fields: [semmMakes.equipmentCode],
    references: [semmEquipment.code],
  }),
  models: many(semmModels),
}));

export const semmModelsRelations = relations(semmModels, ({ one }) => ({
  make: one(semmMakes, {
    fields: [semmModels.makeCode],
    references: [semmMakes.code],
  }),
}));



// Schemas
// User Identities Relations
export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, {
    fields: [userIdentities.userId],
    references: [users.id],
  }),
}));

// Enhanced User Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  identities: many(userIdentities),
  posts: many(posts),
  sentMessages: many(chatMessages, { relationName: "senderMessages" }),
  receivedConnections: many(chatConnections, { relationName: "receiverConnections" }),
  sentConnections: many(chatConnections, { relationName: "senderConnections" }),
}));

// User Identity Schemas
export const insertUserIdentitySchema = createInsertSchema(userIdentities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  userType: true,
  nickname: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  googleId: true,
  googleEmail: true,
  googleProfilePictureUrl: true,
  googleDisplayName: true,
  authProvider: true,
  isVerified: true,
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

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).pick({
  email: true,
  token: true,
  userData: true,
  expiresAt: true,
});

// SEMM Insert Schemas for System > Equipment > Make > Model hierarchy
export const insertSemmSystemSchema = createInsertSchema(semmSystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemmEquipmentSchema = createInsertSchema(semmEquipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemmMakeSchema = createInsertSchema(semmMakes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemmModelSchema = createInsertSchema(semmModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertRankChatMessageSchema = createInsertSchema(rankChatMessages).pick({
  maritimeRank: true,
  senderId: true,
  senderName: true,
  message: true,
  messageType: true,
});

export const insertBotRuleSchema = createInsertSchema(botRules)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).pick({
  senderNumber: true,
  messageBody: true,
  messageType: true,
});

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
  currentLastShip: z.string().optional(),
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
export type InsertUserIdentity = z.infer<typeof insertUserIdentitySchema>;
export type UserIdentity = typeof userIdentities.$inferSelect;

// Enhanced User type with identity information
export type User = typeof users.$inferSelect & {
  profilePictureUrl?: string | null;
  company?: string | null;
  // Resolved identity data for convenience
  identities?: UserIdentity[];
  primaryIdentity?: UserIdentity;
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

export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// Search Analytics Tables
export const searchKeywords = pgTable("search_keywords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull(),
  searchCount: integer("search_count").default(1).notNull(),
  lastSearchedAt: timestamp("last_searched_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userSearchHistory = pgTable("user_search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  searchContext: text("search_context"), // Where the search was performed (questions, users, etc.)
  resultsFound: integer("results_found"), // Number of results returned
  searchedAt: timestamp("searched_at").default(sql`now()`),
});

// Relations for search analytics
export const searchKeywordsRelations = relations(searchKeywords, ({ many }) => ({
  userSearches: many(userSearchHistory),
}));

export const userSearchHistoryRelations = relations(userSearchHistory, ({ one }) => ({
  user: one(users, {
    fields: [userSearchHistory.userId],
    references: [users.id],
  }),
}));

// Insert schemas for search analytics
export const insertSearchKeywordSchema = createInsertSchema(searchKeywords)
  .omit({ id: true, createdAt: true });

export const insertUserSearchHistorySchema = createInsertSchema(userSearchHistory)
  .omit({ id: true, searchedAt: true });

// Types for search analytics
export type InsertSearchKeyword = z.infer<typeof insertSearchKeywordSchema>;
export type SearchKeyword = typeof searchKeywords.$inferSelect;
export type InsertUserSearchHistory = z.infer<typeof insertUserSearchHistorySchema>;
export type UserSearchHistory = typeof userSearchHistory.$inferSelect;

// Questions table (existing QAAQ questions database)
export const questions = pgTable("questions", {
  id: integer("id").primaryKey(),
  content: text("content").notNull(),
  machineId: integer("machine_id"),
  authorId: varchar("author_id").notNull(),
  tags: text("tags").array().default([]),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  imageUrls: text("image_urls").array().default([]),
  views: integer("views").default(0),
  isResolved: boolean("is_resolved").default(false),
  acceptedAnswerId: integer("accepted_answer_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  fileSizeMb: integer("file_size_mb").default(0),
  isArchived: boolean("is_archived").default(false),
  engagementScore: integer("engagement_score").default(0),
  categoryId: integer("category_id"),
  isFromWhatsapp: boolean("is_from_whatsapp").default(false),
  whatsappGroupId: varchar("whatsapp_group_id"),
  isHidden: boolean("is_hidden").default(false),
  hiddenReason: text("hidden_reason"),
  hiddenAt: timestamp("hidden_at"),
  hiddenBy: varchar("hidden_by"),
  flagCount: integer("flag_count").default(0),
  visibility: varchar("visibility").default("public"),
  allowComments: boolean("allow_comments").default(true),
  allowAnswers: boolean("allow_answers").default(true),
  equipmentName: varchar("equipment_name"),
  isOpenToAll: boolean("is_open_to_all").default(true),
});

// Questions with attachments tracking table
export const questionAttachments = pgTable("question_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  attachmentType: text("attachment_type").notNull(), // 'image', 'document', 'video', etc.
  attachmentUrl: text("attachment_url").notNull(),
  attachmentData: text("attachment_data"), // Base64 encoded image data stored directly in database
  fileName: text("file_name"),
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  isProcessed: boolean("is_processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations for questions
export const questionsRelations = relations(questions, ({ one, many }) => ({
  attachments: many(questionAttachments),
  author: one(users, {
    fields: [questions.authorId],
    references: [users.id],
  }),
}));

export const questionAttachmentsRelations = relations(questionAttachments, ({ one }) => ({
  question: one(questions, {
    fields: [questionAttachments.questionId],
    references: [questions.id],
  }),
}));

// Insert schemas for questions
export const insertQuestionSchema = createInsertSchema(questions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertQuestionAttachmentSchema = createInsertSchema(questionAttachments)
  .omit({ id: true, createdAt: true, processedAt: true });

// Types for questions
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestionAttachment = z.infer<typeof insertQuestionAttachmentSchema>;
export type QuestionAttachment = typeof questionAttachments.$inferSelect;

// Payment subscriptions table for Razorpay integration
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionType: text("subscription_type").notNull(), // 'premium', 'super_user'
  razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
  razorpayPlanId: text("razorpay_plan_id").notNull(),
  status: text("status").notNull().default("created"), // 'created', 'active', 'halted', 'cancelled', 'completed', 'expired'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  nextBillingAt: timestamp("next_billing_at"),
  totalCount: integer("total_count"), // Total billing cycles
  paidCount: integer("paid_count").default(0), // Paid billing cycles
  remainingCount: integer("remaining_count"), // Remaining billing cycles
  shortUrl: text("short_url"), // Razorpay checkout short URL
  amount: integer("amount").notNull(), // Amount in paise (smallest currency unit)
  currency: text("currency").notNull().default("INR"),
  notes: jsonb("notes"), // Additional metadata
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Payment transactions table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  razorpayPaymentId: text("razorpay_payment_id").unique(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: integer("amount").notNull(), // Amount in paise
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"), // 'created', 'authorized', 'captured', 'refunded', 'failed'
  method: text("method"), // Payment method used (card, netbanking, wallet, etc.)
  description: text("description"),
  notes: jsonb("notes"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// User subscription status tracking (current active subscriptions)
export const userSubscriptionStatus = pgTable("user_subscription_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  isPremium: boolean("is_premium").default(false),
  isSuperUser: boolean("is_super_user").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  superUserExpiresAt: timestamp("super_user_expires_at"),
  currentPremiumSubscriptionId: varchar("current_premium_subscription_id").references(() => subscriptions.id),
  currentSuperUserSubscriptionId: varchar("current_super_user_subscription_id").references(() => subscriptions.id),
  totalSpent: integer("total_spent").default(0), // Total amount spent in paise
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Relations for payments
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const userSubscriptionStatusRelations = relations(userSubscriptionStatus, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptionStatus.userId],
    references: [users.id],
  }),
  premiumSubscription: one(subscriptions, {
    fields: [userSubscriptionStatus.currentPremiumSubscriptionId],
    references: [subscriptions.id],
  }),
  superUserSubscription: one(subscriptions, {
    fields: [userSubscriptionStatus.currentSuperUserSubscriptionId],
    references: [subscriptions.id],
  }),
}));

// Insert schemas for payments
export const insertSubscriptionSchema = createInsertSchema(subscriptions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertPaymentSchema = createInsertSchema(payments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserSubscriptionStatusSchema = createInsertSchema(userSubscriptionStatus)
  .omit({ id: true, updatedAt: true });

// Insert schemas for system configs
export const insertSystemConfigSchema = createInsertSchema(systemConfigs)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Types for payments
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertUserSubscriptionStatus = z.infer<typeof insertUserSubscriptionStatusSchema>;
export type UserSubscriptionStatus = typeof userSubscriptionStatus.$inferSelect;

// Types for system configs
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfigs.$inferSelect;
