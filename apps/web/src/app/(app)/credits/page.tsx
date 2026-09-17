import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CreditsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">My Credits</h1>

      <div className="mt-6 rounded-2xl bg-brand-purple p-8 text-center text-white shadow-sm">
        <p className="text-sm opacity-80">Your balance</p>
        <p className="mt-2 font-display text-4xl font-bold">{credits?.balance ?? 0} credits</p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-foreground/70 shadow-sm">
        <p className="font-semibold text-foreground">Buying more credits isn&apos;t live yet.</p>
        <p className="mt-1">
          This balance is real, pulled directly from your account, but purchasing more requires a
          connected payment provider (Stripe or Razorpay), which isn&apos;t set up for this project yet.
          Credits are used for things like boosting your profile in Discover.
        </p>
      </div>
    </main>
  );
}
