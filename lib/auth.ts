import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "./db";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Allow both the production base URL and local dev ports without env juggling.
// In dev, Next picks the next available port (3000, 3001, ...) so we whitelist
// the common range to avoid Origin-Forbidden 403s during sign-in/sign-up.
const DEV_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3100",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];
const TRUSTED_ORIGINS = Array.from(new Set([APP_URL, ...DEV_LOCAL_ORIGINS]));

export const auth = betterAuth({
  database: getPool(),
  baseURL: APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      company: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: TRUSTED_ORIGINS,
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
