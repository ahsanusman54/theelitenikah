import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (the browser).
 * Create a new instance where needed rather than sharing a module-level
 * singleton across requests, per Supabase's SSR guidance.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
