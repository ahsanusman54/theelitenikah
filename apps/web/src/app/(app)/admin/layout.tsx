import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "🧑‍🤝‍🧑" },
  { href: "/admin/reports", label: "Reports", icon: "🚩" },
  { href: "/admin/verifications", label: "Verifications", icon: "🛡️" },
  { href: "/admin/settings", label: "Features & Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user!.id).single();
  const role = profile?.role ?? "user";
  if (!["admin", "super_admin", "moderator"].includes(role)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-col gap-1">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-foreground/40">Admin Panel</p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-white hover:text-brand-purple"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <p className="mt-4 px-3 text-xs text-foreground/40">Signed in as {role.replace("_", " ")}</p>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
