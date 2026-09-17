import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MembershipsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("user_id", user!.id)
    .single();

  const isPremium = profile?.is_premium ?? false;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Memberships</h1>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground/60">Current plan</p>
            <p className="font-display text-xl font-bold text-foreground">
              {isPremium ? "Premium" : "Free"}
            </p>
          </div>
          {isPremium && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-600">★ Premium</span>
          )}
        </div>

        {!isPremium && (
          <div className="mt-6 rounded-xl bg-brand-purple/10 p-4 text-sm text-foreground/70">
            <p className="font-semibold text-foreground">Premium isn&apos;t available to purchase yet.</p>
            <p className="mt-1">
              This project doesn&apos;t have a live payment provider connected (Stripe or Razorpay), so upgrades
              can&apos;t be processed yet. Once that&apos;s set up, this page will show real plans and pricing here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
