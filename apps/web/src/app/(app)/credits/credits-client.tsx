"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Package = {
  id: string;
  name: string;
  type: "membership" | "credits";
  price_cents: number;
  currency: string;
  credits_included: number | null;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100
  );
}

export default function CreditsClient({
  initialBalance,
  packages,
}: {
  initialBalance: number;
  packages: Package[];
}) {
  const [balance, setBalance] = useState(initialBalance);
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
      return;
    }

    const { data } = await supabase.from("credits").select("balance").single();
    if (data) setBalance(data.balance);
    setMessage(`${pkg.name} added (test purchase, no real payment was taken).`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">My Credits</h1>

      <div className="mt-4 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Test mode.</strong> No payment provider is connected yet, so purchases here are
        simulated — clicking a pack adds real credits to your account, but no money is charged.
      </div>

      <div className="mt-6 rounded-2xl bg-brand-purple p-8 text-center text-white shadow-sm">
        <p className="text-sm opacity-80">Your balance</p>
        <p className="mt-2 font-display text-4xl font-bold">{balance} credits</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {packages.map((pkg) => (
          <div key={pkg.id} className="flex flex-col rounded-2xl bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-lg font-bold text-foreground">{pkg.credits_included} credits</h2>
            <p className="mt-2 text-2xl font-bold text-brand-pink">
              {formatPrice(pkg.price_cents, pkg.currency)}
            </p>
            <button
              onClick={() => handleBuy(pkg)}
              disabled={buyingId === pkg.id}
              className="mt-4 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50"
            >
              {buyingId === pkg.id ? "Processing..." : "Buy"}
            </button>
          </div>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-foreground/70">{message}</p>}
    </main>
  );
}
