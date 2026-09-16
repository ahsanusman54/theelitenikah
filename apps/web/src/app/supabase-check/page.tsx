import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupabaseCheckPage() {
  const supabase = await createSupabaseServerClient();

  let status: "connected" | "error" = "connected";
  let detail = "";

  try {
    // A harmless call that reaches Supabase Auth without needing any
    // tables to exist yet — confirms the URL/key actually work.
    const { error } = await supabase.auth.getSession();
    if (error) {
      status = "error";
      detail = error.message;
    } else {
      detail = "Supabase client reached the project successfully.";
    }
  } catch (err) {
    status = "error";
    detail = err instanceof Error ? err.message : String(err);
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Supabase Connection Check</h1>
      <p>
        Status:{" "}
        <strong style={{ color: status === "connected" ? "green" : "red" }}>
          {status}
        </strong>
      </p>
      <p>{detail}</p>
      <p style={{ color: "#666", fontSize: 14 }}>
        Project URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
      </p>
    </main>
  );
}
