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

export const maritimeEvents = pgTable("maritime_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: varchar("organizer_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(), // 'meetup', 'tour', 'dining', 'cultural'
  location: text("location").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  status: text("status").notNull().default("upcoming"), // 'upcoming', 'ongoing', 'completed', 'cancelled'
  isPublic: boolean("is_public").default(true),
  contactInfo: text("contact_info"),
  requirements: text("requirements"), // Any special requirements
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull().default("registered"), // 'registered', 'attended', 'no_show'
  registeredAt: timestamp("registered_at").default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  verificationCodes: many(verificationCodes),
  sentConnections: many(chatConnections, { relationName: 'sentConnections' }),
  receivedConnections: many(chatConnections, { relationName: 'receivedConnections' }),
  sentMessages: many(chatMessages, { relationName: 'sentMessages' }),
  organizedEvents: many(maritimeEvents),
  eventAttendees: many(eventAttendees),
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

export const maritimeEventsRelations = relations(maritimeEvents, ({ one, many }) => ({
  organizer: one(users, {
    fields: [maritimeEvents.organizerId],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(maritimeEvents, {
    fields: [eventAttendees.eventId],
    references: [maritimeEvents.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
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

export const insertChatConnectionSchema = createInsertSchema(chatConnections).pick({
  receiverId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  connectionId: true,
  message: true,
});

export const insertMaritimeEventSchema = createInsertSchema(maritimeEvents).pick({
  title: true,
  description: true,
  eventType: true,
  location: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  startTime: true,
  endTime: true,
  maxAttendees: true,
  contactInfo: true,
  requirements: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).pick({
  eventId: true,
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
export type MaritimeEvent = typeof maritimeEvents.$inferSelect;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertChatConnection = z.infer<typeof insertChatConnectionSchema>;
export type InsertMaritimeEvent = z.infer<typeof insertMaritimeEventSchema>;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
