"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Package = {
  id: string;
  name: string;
  type: "membership" | "credits";
  price_cents: number;
  currency: string;
  duration_days: number | null;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

export default function MembershipsClient({
  initialIsPremium,
  packages,
}: {
  initialIsPremium: boolean;
  packages: Package[];
}) {
  const [isPremium, setIsPremium] = useState(initialIsPremium);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleBuy(pkg: Package) {
    setBuyingId(pkg.id);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("simulate_purchase", { p_package_id: pkg.id });
    setBuyingId(null);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setIsPremium(true);
      setMessage(`${pkg.name} activated (test purchase, no real payment was taken).`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Memberships</h1>

      <div className="mt-4 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Test mode.</strong> No payment provider is connected yet, so purchases here are
        simulated — clicking a plan activates it for real in the app, but no money is charged.
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-foreground/60">Current plan</p>
        <p className="font-display text-xl font-bold text-foreground">{isPremium ? "Premium" : "Free"}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div key={pkg.id} className="flex flex-col rounded-2xl bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-lg font-bold text-foreground">{pkg.name}</h2>
            <p className="mt-2 text-2xl font-bold text-brand-pink">
              {formatPrice(pkg.price_cents, pkg.currency)}
            </p>
            <p className="text-xs text-foreground/50">{pkg.duration_days} days</p>
            <button
              onClick={() => handleBuy(pkg)}
              disabled={buyingId === pkg.id || isPremium}
              className="mt-4 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50"
            >
              {isPremium ? "Active" : buyingId === pkg.id ? "Processing..." : "Choose plan"}
            </button>
          </div>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-foreground/70">{message}</p>}
    </main>
  );
}
