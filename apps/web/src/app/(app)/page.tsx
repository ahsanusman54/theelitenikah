import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground">Welcome back</h1>
      <p className="mt-2 text-foreground/70">{user?.email}</p>
      <div className="mt-8 flex justify-center gap-4">
        <a
          href="/discover"
          className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark"
        >
          Discover
        </a>
        <a
          href="/profile"
          className="rounded-full border border-brand-purple px-6 py-2.5 font-semibold text-brand-purple hover:bg-brand-purple hover:text-white"
        >
          My Profile
        </a>
      </div>
    </main>
  );
}
