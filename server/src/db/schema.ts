import { serial, text, pgTable, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  password_hash: text('password_hash'), // Nullable for Google users
  google_id: varchar('google_id', { length: 255 }), // Nullable for regular users
  phone_number: varchar('phone_number', { length: 20 }), // Nullable
  is_email_verified: boolean('is_email_verified').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Table for storing email verification codes
export const emailVerificationTable = pgTable('email_verification', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  verification_code: varchar('verification_code', { length: 6 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Table for tracking user sessions/tokens (optional for JWT implementation)
export const userSessionsTable = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  user_id: serial('user_id').references(() => usersTable.id).notNull(),
  session_token: text('session_token').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type EmailVerification = typeof emailVerificationTable.$inferSelect;
export type NewEmailVerification = typeof emailVerificationTable.$inferInsert;

export type UserSession = typeof userSessionsTable.$inferSelect;
export type NewUserSession = typeof userSessionsTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  emailVerification: emailVerificationTable,
  userSessions: userSessionsTable 
};