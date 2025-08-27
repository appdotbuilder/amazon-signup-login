import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerUserInputSchema, 
  googleSignInInputSchema, 
  verifyEmailInputSchema,
  checkEmailInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { googleSignIn } from './handlers/google_sign_in';
import { checkEmailAvailability } from './handlers/check_email_availability';
import { verifyEmail } from './handlers/verify_email';
import { sendVerificationCode } from './handlers/send_verification_code';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User registration endpoint
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  // Google sign-in endpoint
  googleSignIn: publicProcedure
    .input(googleSignInInputSchema)
    .mutation(({ input }) => googleSignIn(input)),

  // Check if email is available for registration
  checkEmailAvailability: publicProcedure
    .input(checkEmailInputSchema)
    .query(({ input }) => checkEmailAvailability(input)),

  // Verify email address with code
  verifyEmail: publicProcedure
    .input(verifyEmailInputSchema)
    .mutation(({ input }) => verifyEmail(input)),

  // Send verification code to email
  sendVerificationCode: publicProcedure
    .input(checkEmailInputSchema)
    .mutation(({ input }) => sendVerificationCode(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();