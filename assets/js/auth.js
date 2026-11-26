const AUTH_CONFIG_URL = "/api/config";
let authClientPromise;

function setAuthMessage(message, type = "error") {
    document.querySelectorAll("[data-auth-message]").forEach(element => {
        element.textContent = message;
        element.className = `auth-message auth-message--${type}`;
        element.hidden = !message;
    });
}

function safeRedirect(value) {
    return typeof value === "string" &&
        value.startsWith("/") &&
        !value.startsWith("//") &&
        !value.includes("\\")
        ? value
        : "/";
}

async function getAuthClient() {
    if (!authClientPromise) {
        authClientPromise = (async () => {
            const response = await fetch(AUTH_CONFIG_URL);
            const contentType = response.headers.get("content-type") || "";
            let config;

            if (contentType.includes("application/json")) {
                config = await response.json();
            } else {
                throw new Error(
                    "Authentication is unavailable on this static preview. Deploy to Vercel and configure Supabase."
                );
            }

            if (!response.ok) {
                throw new Error(config.error || "Authentication is unavailable.");
            }

            if (!window.supabase) {
                throw new Error("The authentication library could not be loaded.");
            }

            return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        })();
    }

    return authClientPromise;
}

async function showAuthenticatedNavigation(client) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;

    document.querySelectorAll(".join-btn").forEach(link => {
        link.textContent = "My Account";
        link.href = "/login/";
    });

    document.querySelectorAll(".mobile-nav-login a").forEach(link => {
        link.textContent = "My Account";
    });
}

function lockResourcePage(message = "") {
    const main = document.querySelector("main[data-auth-required]");
    if (!main) return;

    document.body.classList.add("resource-locked");
    main.setAttribute("inert", "");

    let lock = document.querySelector(".resource-auth-lock");
    if (!lock) {
        lock = document.createElement("div");
        lock.className = "resource-auth-lock";
        document.body.appendChild(lock);
    }

    lock.innerHTML = `
        <div class="resource-auth-card">
            <div class="text-violet-400 text-3xl mb-4" aria-hidden="true"><i class="fa-solid fa-lock"></i></div>
            <p class="text-violet-400 tracking-[0.25em] uppercase text-xs mb-3">Members only</p>
            <h1 class="text-2xl text-white mb-3">Login to view this content</h1>
            <p class="text-gray-400 mb-6">
                ${message || "Create a free account or sign in to access TC Pioneer resources."}
            </p>
            <a href="/login/?redirect=${encodeURIComponent(window.location.pathname)}"
                class="inline-block px-7 py-3 rounded-lg bg-violet-500 text-black font-semibold hover:bg-violet-400 transition">
                Login
            </a>
        </div>
    `;
}

async function protectResourcePage() {
    const main = document.querySelector("main[data-auth-required]");
    if (!main) return;

    lockResourcePage();
    const client = await getAuthClient();
    const { data: { session } } = await client.auth.getSession();

    const existingLock = document.querySelector(".resource-auth-lock");

    if (session) {
        if (existingLock) existingLock.remove();
        document.body.classList.remove("resource-locked");
        main.removeAttribute("inert");
        await showAuthenticatedNavigation(client);
    }
}

function bindLoginPage(client) {
    const loginPage = document.querySelector("[data-login-page]");
    if (!loginPage) return;

    const redirectTarget = safeRedirect(new URLSearchParams(window.location.search).get("redirect"));

    loginPage.querySelector("#password-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Signing in...", "info");
        const identifier = event.currentTarget.elements.identifier.value.trim();
        const password = event.currentTarget.elements.password.value;

        const response = await fetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });
        const result = await response.json();

        if (!response.ok) {
            setAuthMessage(result.error || "Unable to sign in.");
            return;
        }

        const { error } = await client.auth.setSession({
            access_token: result.access_token,
            refresh_token: result.refresh_token
        });

        if (error) {
            setAuthMessage(error.message);
            return;
        }

        window.location.assign(redirectTarget);
    });

    loginPage.querySelector("#signup-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Creating your account...", "info");
        const form = event.currentTarget;

        const { error } = await client.auth.signUp({
            email: form.elements.email.value.trim(),
            password: form.elements.password.value,
            options: {
                data: { username: form.elements.username.value.trim().toLowerCase() },
                emailRedirectTo: `${window.location.origin}/login/?redirect=${encodeURIComponent(redirectTarget)}`
            }
        });

        setAuthMessage(
            error ? error.message : "Account created. Check your email to confirm your address.",
            error ? "error" : "success"
        );
    });

    loginPage.querySelector("#otp-request-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Sending your email code...", "info");
        const email = event.currentTarget.elements.email.value.trim();
        loginPage.querySelector("#otp-email").value = email;

        const { error } = await client.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${window.location.origin}/login/?redirect=${encodeURIComponent(redirectTarget)}`
            }
        });

        if (error) {
            setAuthMessage(error.message);
            return;
        }

        loginPage.querySelector("[data-otp-verify]").hidden = false;
        setAuthMessage("Enter the 6-digit code sent to your email.", "success");
    });

    loginPage.querySelector("#otp-verify-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Verifying code...", "info");
        const form = event.currentTarget;
        const { error } = await client.auth.verifyOtp({
            email: form.elements.email.value.trim(),
            token: form.elements.token.value.trim(),
            type: "email"
        });

        if (error) {
            setAuthMessage(error.message);
            return;
        }

        window.location.assign(redirectTarget);
    });

    loginPage.querySelectorAll("[data-oauth-provider]").forEach(button => {
        button.addEventListener("click", async () => {
            setAuthMessage(`Opening ${button.dataset.oauthProvider}...`, "info");
            const { error } = await client.auth.signInWithOAuth({
                provider: button.dataset.oauthProvider,
                options: {
                    redirectTo: `${window.location.origin}/login/?redirect=${encodeURIComponent(redirectTarget)}`
                }
            });
            if (error) setAuthMessage(error.message);
        });
    });

    client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
            if (requestedRedirect) {
                window.location.assign(safeRedirect(requestedRedirect));
                return;
            }

            loginPage.querySelector("[data-signed-in]").hidden = false;
            loginPage.querySelector("[data-auth-forms]").hidden = true;
            loginPage.querySelector("[data-account-email]").textContent = session.user.email || "member";
        }
    });

    loginPage.querySelector("#sign-out").addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) {
            setAuthMessage(error.message);
            return;
        }
        window.location.reload();
    });
}

function bindLoginTabs() {
    const loginPage = document.querySelector("[data-login-page]");
    if (!loginPage) return;

    const tabs = [...loginPage.querySelectorAll("[data-auth-tab]")];
    const panels = [...loginPage.querySelectorAll("[data-auth-panel]")];

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => item.setAttribute("aria-selected", String(item === tab)));
            panels.forEach(panel => {
                panel.hidden = panel.dataset.authPanel !== tab.dataset.authTab;
            });
            setAuthMessage("");
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("[data-login-page], main[data-auth-required]")) return;

    bindLoginTabs();

    try {
        const client = await getAuthClient();
        bindLoginPage(client);
        await protectResourcePage();
        await showAuthenticatedNavigation(client);

        client.auth.onAuthStateChange(() => {
            protectResourcePage().catch(error => setAuthMessage(error.message));
            showAuthenticatedNavigation(client).catch(error => setAuthMessage(error.message));
        });
    } catch (error) {
        setAuthMessage(error.message);
        lockResourcePage(error.message);

        const loginButton = document.querySelector("[data-auth-forms]");
        if (loginButton) loginButton.classList.add("auth-disabled");
    }
});
