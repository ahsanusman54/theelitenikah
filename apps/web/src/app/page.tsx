import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "80px auto",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <h1>theelitenikah</h1>
      {user ? (
        <>
          <p>Signed in as {user.email}</p>
          <p>
            <a href="/profile">My Profile</a> · <a href="/discover">Discover</a>
          </p>
        </>
      ) : (
        <p>
          <a href="/login">Log in</a> or <a href="/signup">Sign up</a>
        </p>
      )}
    </main>
  );
}
