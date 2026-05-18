import { and, desc, eq, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  cloudFileCollaborators,
  cloudFiles,
  InsertCloudFile,
  InsertUser,
  users,
} from "../drizzle/schema";
import type { CodeLanguage } from "../shared/languages";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export type CloudSyncInputFile = {
  relativePath: string;
  name: string;
  language: CodeLanguage;
  content: string;
  lastModified: number;
};

export type CloudSyncConflict = {
  relativePath: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  remoteRevision: number;
};

export async function listAccessibleCloudFiles(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: cloudFiles.id,
      ownerId: cloudFiles.ownerId,
      relativePath: cloudFiles.relativePath,
      name: cloudFiles.name,
      language: cloudFiles.language,
      content: cloudFiles.content,
      revision: cloudFiles.revision,
      updatedAt: cloudFiles.updatedAt,
      deletedAt: cloudFiles.deletedAt,
      collaboratorRole: cloudFileCollaborators.role,
    })
    .from(cloudFiles)
    .leftJoin(
      cloudFileCollaborators,
      and(
        eq(cloudFileCollaborators.fileId, cloudFiles.id),
        eq(cloudFileCollaborators.userId, userId),
      ),
    )
    .where(
      and(
        isNull(cloudFiles.deletedAt),
        or(eq(cloudFiles.ownerId, userId), eq(cloudFileCollaborators.userId, userId)),
      ),
    )
    .orderBy(desc(cloudFiles.updatedAt));

  return rows;
}

export async function syncOwnedWorkspace(
  userId: number,
  files: CloudSyncInputFile[],
): Promise<{ conflicts: CloudSyncConflict[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conflicts: CloudSyncConflict[] = [];
  const existingFiles = await db
    .select()
    .from(cloudFiles)
    .where(eq(cloudFiles.ownerId, userId));
  const filesByPath = new Map(existingFiles.map((file) => [file.relativePath, file]));

  for (const file of files) {
    const current = filesByPath.get(file.relativePath);

    if (!current) {
      const values: InsertCloudFile = {
        ownerId: userId,
        relativePath: file.relativePath,
        name: file.name,
        language: file.language,
        content: file.content,
      };
      await db.insert(cloudFiles).values(values);
      continue;
    }

    if (current.content === file.content) {
      continue;
    }

    const remoteUpdatedAt = current.updatedAt.getTime();
    if (file.lastModified < remoteUpdatedAt) {
      conflicts.push({
        relativePath: file.relativePath,
        localUpdatedAt: file.lastModified,
        remoteUpdatedAt,
        remoteRevision: current.revision,
      });
      continue;
    }

    await db
      .update(cloudFiles)
      .set({
        name: file.name,
        language: file.language,
        content: file.content,
        revision: current.revision + 1,
        deletedAt: null,
      })
      .where(eq(cloudFiles.id, current.id));

    filesByPath.set(file.relativePath, {
      ...current,
      name: file.name,
      language: file.language,
      content: file.content,
      revision: current.revision + 1,
      deletedAt: null,
      updatedAt: new Date(),
    });
  }

  return { conflicts };
}

export async function updateAccessibleCloudFile(
  userId: number,
  fileId: number,
  input: {
    content: string;
    language: CodeLanguage;
    expectedRevision: number;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      file: cloudFiles,
      collaboratorRole: cloudFileCollaborators.role,
    })
    .from(cloudFiles)
    .leftJoin(
      cloudFileCollaborators,
      and(
        eq(cloudFileCollaborators.fileId, cloudFiles.id),
        eq(cloudFileCollaborators.userId, userId),
      ),
    )
    .where(eq(cloudFiles.id, fileId))
    .limit(1);
  const row = rows[0];
  if (!row || row.file.deletedAt) return { kind: "missing" as const };

  const canEdit =
    row.file.ownerId === userId || row.collaboratorRole === "editor";
  if (!canEdit) return { kind: "forbidden" as const };

  if (row.file.revision !== input.expectedRevision) {
    return { kind: "conflict" as const, file: row.file };
  }

  await db
    .update(cloudFiles)
    .set({
      content: input.content,
      language: input.language,
      revision: row.file.revision + 1,
    })
    .where(eq(cloudFiles.id, fileId));

  return { kind: "updated" as const };
}

export async function shareOwnedCloudFile(
  ownerId: number,
  fileId: number,
  email: string,
  role: "viewer" | "editor",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const file = await db
    .select()
    .from(cloudFiles)
    .where(and(eq(cloudFiles.id, fileId), eq(cloudFiles.ownerId, ownerId)))
    .limit(1);
  if (!file[0]) return { kind: "missing" as const };

  const collaborator = await getUserByEmail(email);
  if (!collaborator) return { kind: "user-not-found" as const };
  if (collaborator.id === ownerId) return { kind: "self" as const };

  await db
    .insert(cloudFileCollaborators)
    .values({
      fileId,
      userId: collaborator.id,
      role,
    })
    .onDuplicateKeyUpdate({
      set: { role },
    });

  return { kind: "shared" as const };
}

export async function listCloudFileCollaborators(ownerId: number, fileId: number) {
  const db = await getDb();
  if (!db) return [];

  const owned = await db
    .select()
    .from(cloudFiles)
    .where(and(eq(cloudFiles.id, fileId), eq(cloudFiles.ownerId, ownerId)))
    .limit(1);
  if (!owned[0]) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: cloudFileCollaborators.role,
    })
    .from(cloudFileCollaborators)
    .innerJoin(users, eq(users.id, cloudFileCollaborators.userId))
    .where(eq(cloudFileCollaborators.fileId, fileId));
}
