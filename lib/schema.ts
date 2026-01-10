import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

// ========================================
// BetterAuth Tables (DO NOT MODIFY)
// These tables are managed by BetterAuth
// ========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  isAdmin: boolean("is_admin").default(false), // Custom field for admin access
  // User approval system - new users need admin approval before login
  approvalStatus: text("approval_status").default("approved"), // pending | approved | rejected
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by"), // Admin user ID who approved
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// ========================================
// VaultMail Custom Tables
// ========================================

/**
 * User Email Addresses
 * Stores generated email addresses with recovery tokens for each user
 */
export const userAddresses = pgTable(
  "user_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    recoveryToken: text("recovery_token"),
    retentionSeconds: integer("retention_seconds").default(86400),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("user_address_unique").on(table.userId, table.email)]
);

/**
 * User Mailbox Sessions
 * Stores authenticated sessions for accessing mailboxes
 * These are the sensitive session tokens that were in localStorage
 */
export const userMailboxSessions = pgTable("user_mailbox_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * User Email History
 * Stores email address history for quick access to previously used addresses
 */
export const userEmailHistory = pgTable(
  "user_email_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("user_history_unique").on(table.userId, table.email)]
);

/**
 * User Custom Domains
 * Stores user's custom domains (migrated from Redis)
 */
export const userDomains = pgTable(
  "user_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    domain: text("domain").notNull(),
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("user_domain_unique").on(table.userId, table.domain)]
);

/**
 * User Preferences
 * Stores user preferences like default retention settings
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  defaultRetention: integer("default_retention").default(-1), // -1 = permanent for logged-in users
  currentAddress: text("current_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Global Domains
 * System-wide domains available for all users (managed by admin)
 */
export const globalDomains = pgTable("global_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull().unique(),
  active: boolean("active").default(true),
  isDefault: boolean("is_default").default(false), // Only one domain can be default
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Admin Sessions
 * Stores verified admin sessions (after master key verification)
 */
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for use in API routes
export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;
export type UserMailboxSession = typeof userMailboxSessions.$inferSelect;
export type NewUserMailboxSession = typeof userMailboxSessions.$inferInsert;
export type UserEmailHistory = typeof userEmailHistory.$inferSelect;
export type NewUserEmailHistory = typeof userEmailHistory.$inferInsert;
export type UserDomain = typeof userDomains.$inferSelect;
export type NewUserDomain = typeof userDomains.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type GlobalDomain = typeof globalDomains.$inferSelect;
export type NewGlobalDomain = typeof globalDomains.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
