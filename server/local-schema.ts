import { pgTable, text, timestamp, boolean, serial, uuid, varchar, decimal, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Local Users table - Robust design following Google OAuth standards
export const localUsers = pgTable('local_users', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Basic profile information
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  displayName: varchar('display_name', { length: 255 }),
  profilePictureUrl: text('profile_picture_url'),
  
  // Authentication providers
  authProvider: varchar('auth_provider', { length: 50 }).notNull().default('qaaq'), // 'qaaq', 'google', 'whatsapp'
  
  // Google OAuth fields (following Google standards)
  googleId: varchar('google_id', { length: 255 }).unique(),
  googleEmail: varchar('google_email', { length: 255 }),
  googleProfilePictureUrl: text('google_profile_picture_url'),
  googleDisplayName: varchar('google_display_name', { length: 255 }),
  googleGivenName: varchar('google_given_name', { length: 100 }),
  googleFamilyName: varchar('google_family_name', { length: 100 }),
  googleLocale: varchar('google_locale', { length: 10 }),
  googleVerifiedEmail: boolean('google_verified_email').default(false),
  
  // WhatsApp fields
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  whatsappProfilePictureUrl: text('whatsapp_profile_picture_url'),
  whatsappDisplayName: varchar('whatsapp_display_name', { length: 255 }),
  
  // QAAQ legacy fields for backward compatibility
  qaaqUserId: varchar('qaaq_user_id', { length: 50 }).unique(), // Maps to original QAAQ user ID
  
  // Password and security
  passwordHash: text('password_hash'),
  hasSetCustomPassword: boolean('has_set_custom_password').default(false),
  passwordCreatedAt: timestamp('password_created_at'),
  passwordRenewalDue: timestamp('password_renewal_due'),
  mustCreatePassword: boolean('must_create_password').default(false),
  
  // Account status
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  isBlocked: boolean('is_blocked').default(false),
  
  // Admin and permissions
  isAdmin: boolean('is_admin').default(false),
  isPlatformAdmin: boolean('is_platform_admin').default(false),
  
  // User type and classification
  userType: varchar('user_type', { length: 50 }).default('sailor'), // 'sailor', 'local', 'admin', 'company'
  
  // Maritime specific fields (basic profile data)
  maritimeRank: varchar('maritime_rank', { length: 100 }),
  currentShipName: varchar('current_ship_name', { length: 255 }),
  currentShipIMO: varchar('current_ship_imo', { length: 20 }),
  currentCity: varchar('current_city', { length: 100 }),
  currentCountry: varchar('current_country', { length: 100 }),
  nationality: varchar('nationality', { length: 100 }),
  
  // Location data (device/GPS)
  deviceLatitude: decimal('device_latitude', { precision: 10, scale: 8 }),
  deviceLongitude: decimal('device_longitude', { precision: 11, scale: 8 }),
  locationSource: varchar('location_source', { length: 20 }).default('city'), // 'device', 'ship', 'city'
  locationUpdatedAt: timestamp('location_updated_at'),
  
  // Activity tracking
  loginCount: integer('login_count').default(0),
  liberalLoginCount: integer('liberal_login_count').default(0),
  lastLogin: timestamp('last_login'),
  hasCompletedOnboarding: boolean('has_completed_onboarding').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Subscription and premium status
  isPremium: boolean('is_premium').default(false),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  
  // Question and answer counts (cached from parent DB)
  questionCount: integer('question_count').default(0),
  answerCount: integer('answer_count').default(0),
});

// User mapping table to sync with QAAQ parent database
export const userMapping = pgTable('user_mapping', {
  id: serial('id').primaryKey(),
  localUserId: uuid('local_user_id').references(() => localUsers.id).notNull(),
  qaaqUserId: varchar('qaaq_user_id', { length: 50 }).notNull().unique(),
  lastSyncAt: timestamp('last_sync_at').defaultNow(),
  syncStatus: varchar('sync_status', { length: 20 }).default('active'), // 'active', 'pending', 'failed'
});

// Verification codes table (local)
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => localUsers.id).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Types for TypeScript
export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;
export type UserMapping = typeof userMapping.$inferSelect;
export type InsertUserMapping = typeof userMapping.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

// Zod schemas for validation
export const insertLocalUserSchema = createInsertSchema(localUsers);
export const insertUserMappingSchema = createInsertSchema(userMapping);
export const insertVerificationCodeSchema = createInsertSchema(verificationCodes);

// Google OAuth user creation schema
export const createGoogleUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string(),
  googleId: z.string(),
  googleEmail: z.string().email(),
  googleProfilePictureUrl: z.string().url().optional(),
  googleDisplayName: z.string(),
  googleGivenName: z.string().optional(),
  googleFamilyName: z.string().optional(),
  googleLocale: z.string().optional(),
  googleVerifiedEmail: z.boolean().default(true),
  userType: z.enum(['sailor', 'local', 'admin', 'company']).default('sailor'),
});

export type CreateGoogleUser = z.infer<typeof createGoogleUserSchema>;