import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { financeRouter } from "./routers/finances";
import { importRouter } from "./routers/imports";
import { inviteRouter } from "./routers/invites";
import { playerRouter, userManagementRouter } from "./routers/players";
import { announcementRouter } from "./routers/collaboration";
import { sportRouter } from "./routers/sports";
import { localAuthRouter, localUserRouter } from "./routers/localAuth";
import { resourceRouter } from "./routers/resources";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  localAuth: localAuthRouter,
  localUsers: localUserRouter,
  resources: resourceRouter,
  players: playerRouter,
  finance: financeRouter,
  userManagement: userManagementRouter,
  sports: sportRouter,
  announcements: announcementRouter,
  imports: importRouter,
  invites: inviteRouter,
});

export type AppRouter = typeof appRouter;
