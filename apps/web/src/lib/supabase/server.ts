import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for use in Server Components, Route Handlers, and
 * Server Actions. Must be created fresh per request (never module-level).
 *
 * `cookies()` is async as of Next.js 15+, so this function is async too.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where cookies can't be set.
            // Safe to ignore as long as middleware.ts is refreshing sessions.
          }
        },
      },
    }
  );
}
