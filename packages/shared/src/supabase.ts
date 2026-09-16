import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Framework-agnostic Supabase client factory.
 *
 * This intentionally takes the URL/key as arguments rather than reading
 * environment variables itself, because the web app (Next.js, using
 * NEXT_PUBLIC_* vars) and the future mobile app (React Native/Expo, using
 * EXPO_PUBLIC_* vars) read their env vars differently. Each app's own
 * lib/supabase wrapper should call this with its own env values, so this
 * function itself stays reusable by both.
 */
export function createSharedSupabaseClient(
  supabaseUrl: string,
  supabasePublishableKey: string
): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "createSharedSupabaseClient: supabaseUrl and supabasePublishableKey are required"
    );
  }
  return createClient(supabaseUrl, supabasePublishableKey);
}
