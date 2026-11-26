export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { identifier, password } = request.body || {};

    if (
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        identifier.length > 254 ||
        password.length < 8 ||
        password.length > 128
    ) {
        response.status(400).json({ error: "Enter a valid username or email and your password." });
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        response.status(503).json({ error: "Authentication is not configured yet." });
        return;
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();
    let email = normalizedIdentifier;

    if (!normalizedIdentifier.includes("@")) {
        const lookupUrl = new URL("/rest/v1/profiles", supabaseUrl);
        lookupUrl.searchParams.set("select", "email");
        lookupUrl.searchParams.set("username", `eq.${normalizedIdentifier}`);
        lookupUrl.searchParams.set("limit", "1");

        const lookupResponse = await fetch(lookupUrl, {
            headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`
            }
        });

        if (!lookupResponse.ok) {
            console.error("Supabase profile lookup failed", lookupResponse.status);
            response.status(502).json({ error: "Unable to sign in right now. Please try again." });
            return;
        }

        const profiles = await lookupResponse.json();
        email = profiles[0]?.email;
    }

    if (!email) {
        response.status(401).json({ error: "Incorrect username/email or password." });
        return;
    }

    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
            apikey: anonKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const loginResult = await loginResponse.json();

    if (!loginResponse.ok) {
        response.status(401).json({ error: "Incorrect username/email or password." });
        return;
    }

    response.status(200).json({
        access_token: loginResult.access_token,
        refresh_token: loginResult.refresh_token
    });
}
