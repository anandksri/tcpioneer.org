function allowBrowserPreview(response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(request, response) {
    allowBrowserPreview(response);

    if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
    }

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
    let email = normalizedIdentifier.includes("@") ? normalizedIdentifier : "";

    if (!normalizedIdentifier.includes("@")) {
        const authHeaders = {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`
        };
        const lookupUrl = new URL("/rest/v1/profiles", supabaseUrl);
        lookupUrl.searchParams.set("select", "email");
        lookupUrl.searchParams.set("username", `eq.${normalizedIdentifier}`);
        lookupUrl.searchParams.set("limit", "1");

        const lookupResponse = await fetch(lookupUrl, {
            headers: authHeaders
        });

        if (lookupResponse.ok) {
            const profiles = await lookupResponse.json();
            email = profiles[0]?.email;
        }

        if (!email) {
            const adminLookup = await fetch(
                `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
                { headers: authHeaders }
            );

            if (adminLookup.ok) {
                const { users = [] } = await adminLookup.json();
                const matchedUser = users.find(
                    user => String(user.user_metadata?.username || "").toLowerCase() === normalizedIdentifier
                );
                email = matchedUser?.email;
            } else {
                console.error("Supabase username fallback failed", adminLookup.status);
            }
        }

        if (!email && !lookupResponse.ok) {
            console.error("Supabase profile lookup failed", lookupResponse.status);
            response.status(502).json({ error: "Unable to sign in right now. Please try again." });
            return;
        }
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

    if (!loginResponse.ok) {
        response.status(401).json({ error: "Incorrect username/email or password." });
        return;
    }

    const otpResponse = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: "POST",
        headers: {
            apikey: anonKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            create_user: false
        })
    });

    if (!otpResponse.ok) {
        console.error("Supabase OTP request failed", otpResponse.status);
        response.status(502).json({ error: "Your password is correct, but the verification code could not be sent. Try again." });
        return;
    }

    const [localPart, domain] = email.split("@");
    const maskedLocal = `${localPart.slice(0, 2)}${"*".repeat(Math.max(2, localPart.length - 2))}`;

    response.status(200).json({
        email,
        maskedEmail: `${maskedLocal}@${domain}`
    });
}
