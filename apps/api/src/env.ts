/** Shared Worker environment + Hono context types. */

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  FRONTEND_ORIGIN: string;
  /** Optional — when unset, password-reset emails are logged, not sent. */
  RESEND_API_KEY?: string;
}

/** The authenticated user attached to the request context by `requireUser`. */
export interface AuthUser {
  id: string;
  email: string;
  /** SQLite boolean (0/1). */
  email_verified: number;
  display_name: string | null;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { user: AuthUser };
};
