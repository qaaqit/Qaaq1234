import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
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
  rank: text("rank"), // e.g., 'Captain', 'Chief Engineer', 'Officer', 'Crew'
  shipName: text("ship_name"), // Current ship name
  imoNumber: text("imo_number"), // International Maritime Organization number
  port: text("port"), // Current or next port
  visitWindow: text("visit_window"), // Planned visit time window (e.g., "28 to 30 Jul25")
  city: text("city"),
  country: text("country"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  deviceLatitude: real("device_latitude"), // Current device GPS location
  deviceLongitude: real("device_longitude"), // Current device GPS location
  locationSource: text("location_source").default("city"), // 'device', 'ship', 'city'
  locationUpdatedAt: timestamp("location_updated_at"),
  questionCount: integer("question_count").default(0), // Total questions asked on QAAQ
  answerCount: integer("answer_count").default(0), // Total answers given on QAAQ
  isVerified: boolean("is_verified").default(false),
  loginCount: integer("login_count").default(0),
  lastLogin: timestamp("last_login"),
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



// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  verificationCodes: many(verificationCodes),
  sentConnections: many(chatConnections, { relationName: 'sentConnections' }),
  receivedConnections: many(chatConnections, { relationName: 'receivedConnections' }),
  sentMessages: many(chatMessages, { relationName: 'sentMessages' }),

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



// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type ChatConnection = typeof chatConnections.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertChatConnection = z.infer<typeof insertChatConnectionSchema>;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
