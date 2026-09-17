import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS already restricts this to visible, active profiles other than
  // rows the policy excludes; we also exclude the viewer's own profile here.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, name, bio, photos")
    .neq("user_id", user.id)
    .limit(20);

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Discover</h1>
      <p>
        <a href="/profile">My Profile</a>
      </p>

      {error && <p style={{ color: "red" }}>Error loading profiles: {error.message}</p>}

      {profiles && profiles.length === 0 && (
        <p>No other profiles yet. Once more people sign up, they&apos;ll show up here.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {profiles?.map((p) => (
          <div key={p.user_id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            {p.photos?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.photos[0]}
                alt={p.name ?? ""}
                width={176}
                height={176}
                style={{ objectFit: "cover", width: "100%", borderRadius: 6 }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 176,
                  background: "#eee",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                No photo
              </div>
            )}
            <h3 style={{ margin: "8px 0 4px" }}>{p.name || "Unnamed"}</h3>
            <p style={{ fontSize: 14, color: "#555" }}>{p.bio || "No bio yet."}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
