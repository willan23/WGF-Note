import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { executePythonOnServer } from "./python-execution";
import { CODE_LANGUAGES } from "../shared/languages";

const codeLanguageSchema = z.enum(CODE_LANGUAGES);

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  python: router({
    execute: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1).max(100_000),
          timeoutMs: z.number().int().min(250).max(15_000).optional(),
          args: z.array(z.string().max(200)).max(16).optional(),
        }),
      )
      .mutation(({ input }) => executePythonOnServer(input)),
  }),
  cloud: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.listAccessibleCloudFiles(ctx.user.id),
    ),
    syncWorkspace: protectedProcedure
      .input(
        z.object({
          files: z
            .array(
              z.object({
                relativePath: z.string().min(1).max(512),
                name: z.string().min(1).max(255),
                language: codeLanguageSchema,
                content: z.string(),
                lastModified: z.number().int().min(0),
              }),
            )
            .max(500),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.syncOwnedWorkspace(ctx.user.id, input.files);
        return {
          ...result,
          files: await db.listAccessibleCloudFiles(ctx.user.id),
        };
      }),
    update: protectedProcedure
      .input(
        z.object({
          fileId: z.number().int().positive(),
          content: z.string(),
          language: codeLanguageSchema,
          expectedRevision: z.number().int().positive(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.updateAccessibleCloudFile(ctx.user.id, input.fileId, input),
      ),
    share: protectedProcedure
      .input(
        z.object({
          fileId: z.number().int().positive(),
          email: z.string().email(),
          role: z.enum(["viewer", "editor"]),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.shareOwnedCloudFile(ctx.user.id, input.fileId, input.email, input.role),
      ),
    collaborators: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        db.listCloudFileCollaborators(ctx.user.id, input.fileId),
      ),
  }),
});

export type AppRouter = typeof appRouter;
