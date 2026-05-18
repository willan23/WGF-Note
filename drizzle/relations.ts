import { relations } from "drizzle-orm";
import { cloudFileCollaborators, cloudFiles, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  cloudFiles: many(cloudFiles),
  collaborations: many(cloudFileCollaborators),
}));

export const cloudFilesRelations = relations(cloudFiles, ({ one, many }) => ({
  owner: one(users, {
    fields: [cloudFiles.ownerId],
    references: [users.id],
  }),
  collaborators: many(cloudFileCollaborators),
}));

export const cloudFileCollaboratorsRelations = relations(
  cloudFileCollaborators,
  ({ one }) => ({
    file: one(cloudFiles, {
      fields: [cloudFileCollaborators.fileId],
      references: [cloudFiles.id],
    }),
    user: one(users, {
      fields: [cloudFileCollaborators.userId],
      references: [users.id],
    }),
  }),
);
