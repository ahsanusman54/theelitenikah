"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MENU_ITEMS = [
  { href: "/profile", label: "My Profile", icon: "👤" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/memberships", label: "Memberships", icon: "👑" },
  { href: "/credits", label: "My Credits", icon: "🪙" },
];

export default function UserMenu({ displayName, isAdmin }: { displayName: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const items = isAdmin
    ? [...MENU_ITEMS, { href: "/admin/verifications", label: "Verification Requests", icon: "🛡️" }]
    : MENU_ITEMS;

  async function handleLogOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{displayName}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-2 text-foreground shadow-lg">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogOut}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
            >
              <span>🚪</span>
              Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
