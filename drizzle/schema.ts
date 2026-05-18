import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { CODE_LANGUAGES } from "../shared/languages";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const cloudFiles = mysqlTable(
  "cloudFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    relativePath: varchar("relativePath", { length: 512 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    language: mysqlEnum("language", CODE_LANGUAGES).notNull(),
    content: text("content").notNull(),
    revision: int("revision").default(1).notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    ownerPathUnique: uniqueIndex("cloudFiles_owner_path_unique").on(
      table.ownerId,
      table.relativePath,
    ),
  }),
);

export const cloudFileCollaborators = mysqlTable(
  "cloudFileCollaborators",
  {
    id: int("id").autoincrement().primaryKey(),
    fileId: int("fileId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["viewer", "editor"]).default("editor").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    fileUserUnique: uniqueIndex("cloudFileCollaborators_file_user_unique").on(
      table.fileId,
      table.userId,
    ),
  }),
);

export type CloudFile = typeof cloudFiles.$inferSelect;
export type InsertCloudFile = typeof cloudFiles.$inferInsert;
export type CloudFileCollaborator = typeof cloudFileCollaborators.$inferSelect;
