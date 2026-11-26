export default function handler(request, response) {
    if (request.method !== "GET") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        response.status(503).json({
            error: "Authentication is not configured yet. Add the Supabase public environment variables in Vercel."
        });
        return;
    }

    response.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    response.status(200).json({ supabaseUrl, supabaseAnonKey });
}
