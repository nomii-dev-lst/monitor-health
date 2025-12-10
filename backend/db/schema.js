import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users table - authentication and user management
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      usernameIdx: index('username_idx').on(table.username),
      emailIdx: index('email_idx').on(table.email),
    };
  },
);

/**
 * Collections table - organize monitors into collections
 */
export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#3B82F6'), // hex color code
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      userIdIdx: index('collection_user_id_idx').on(table.userId),
    };
  },
);

/**
 * Monitors table - main monitoring endpoints
 */
export const monitors = pgTable(
  'monitors',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    collectionId: integer('collection_id').references(() => collections.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    url: text('url').notNull(),
    authType: varchar('auth_type', { length: 50 }).notNull().default('none'),
    // Store authentication configuration as JSONB
    // For 'basic': { username, password }
    // For 'token': { tokenUrl, username, password, tokenField, headerName }
    // For 'login': { loginUrl, username, password, tokenField, cookieName }
    authConfig: jsonb('auth_config').notNull().default({}),
    // Validation rules for response
    // Example: { statusCode: 200, requiredKeys: ['data', 'status'], customCheck: 'data.users.length > 0' }
    validationRules: jsonb('validation_rules')
      .notNull()
      .default({ statusCode: 200 }),
    checkInterval: integer('check_interval').notNull().default(30), // minutes
    alertEmails: jsonb('alert_emails').notNull().default([]), // Array of email strings
    enabled: boolean('enabled').notNull().default(true),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, up, down, unknown
    lastCheckTime: timestamp('last_check_time'),
    nextCheckTime: timestamp('next_check_time'),
    lastLatency: integer('last_latency'), // milliseconds
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    totalChecks: integer('total_checks').notNull().default(0),
    successfulChecks: integer('successful_checks').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      userIdIdx: index('user_id_idx').on(table.userId),
      collectionIdIdx: index('collection_id_idx').on(table.collectionId),
      enabledNextCheckIdx: index('enabled_next_check_idx').on(
        table.enabled,
        table.nextCheckTime,
      ),
      statusIdx: index('status_idx').on(table.status),
    };
  },
);

/**
 * Check results table - individual health check results
 */
export const checkResults = pgTable(
  'check_results',
  {
    id: serial('id').primaryKey(),
    monitorId: integer('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(), // success, failure
    httpStatus: integer('http_status'),
    latency: integer('latency').notNull(), // milliseconds
    errorMessage: text('error_message'),
    // Store validation failures as JSON array
    validationErrors: jsonb('validation_errors').notNull().default([]),
    // Response data for debugging (truncated to 2000 chars)
    responseData: text('response_data'),
    // Additional metadata about the response
    responseMetadata: jsonb('response_metadata'),
    checkedAt: timestamp('checked_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      monitorIdIdx: index('monitor_id_idx').on(table.monitorId),
      monitorIdCheckedAtIdx: index('monitor_id_checked_at_idx').on(
        table.monitorId,
        table.checkedAt,
      ),
      statusCheckedAtIdx: index('status_checked_at_idx').on(
        table.status,
        table.checkedAt,
      ),
      checkedAtIdx: index('checked_at_idx').on(table.checkedAt),
    };
  },
);

/**
 * Alerts table - alert notifications for status changes
 */
export const alerts = pgTable(
  'alerts',
  {
    id: serial('id').primaryKey(),
    monitorId: integer('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    alertType: varchar('alert_type', { length: 50 }).notNull(), // failure, recovery
    message: text('message').notNull(),
    recipients: jsonb('recipients').notNull(), // Array of email strings
    emailSent: boolean('email_sent').notNull().default(false),
    emailError: text('email_error'),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      monitorIdIdx: index('alert_monitor_id_idx').on(table.monitorId),
      monitorIdSentAtIdx: index('monitor_id_sent_at_idx').on(
        table.monitorId,
        table.sentAt,
      ),
      alertTypeIdx: index('alert_type_idx').on(table.alertType),
    };
  },
);

/**
 * Settings table - key-value application settings
 */
export const settings = pgTable(
  'settings',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    value: jsonb('value').notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      keyIdx: index('settings_key_idx').on(table.key),
    };
  },
);

/**
 * Define relations between tables
 */
export const usersRelations = relations(users, ({ many }) => ({
  monitors: many(monitors),
  collections: many(collections),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  monitors: many(monitors),
}));

export const monitorsRelations = relations(monitors, ({ one, many }) => ({
  user: one(users, {
    fields: [monitors.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [monitors.collectionId],
    references: [collections.id],
  }),
  checkResults: many(checkResults),
  alerts: many(alerts),
}));

export const checkResultsRelations = relations(checkResults, ({ one }) => ({
  monitor: one(monitors, {
    fields: [checkResults.monitorId],
    references: [monitors.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  monitor: one(monitors, {
    fields: [alerts.monitorId],
    references: [monitors.id],
  }),
}));
