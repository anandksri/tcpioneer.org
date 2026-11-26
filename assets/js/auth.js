const API_ORIGIN = "https://tcpioneerorg.vercel.app";
const AUTH_CONFIG_URL = `${API_ORIGIN}/api/config`;
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
                throw new Error("Authentication is temporarily unavailable. Please try again.");
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
    const accountPath = "/login/";

    document.querySelectorAll(".join-btn").forEach(link => {
        link.textContent = session ? "My Account" : "Login";
        link.href = accountPath;
        if (session) {
            link.setAttribute("aria-label", "My Account");
        } else {
            link.removeAttribute("aria-label");
        }
    });

    document.querySelectorAll(".mobile-nav-login a").forEach(link => {
        link.textContent = session ? "My Account" : "Login";
        link.href = accountPath;
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

function bindLoginPage() {
    const loginPage = document.querySelector("[data-login-page]");
    if (!loginPage) return;

    const redirectTarget = safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
    const credentialsStep = loginPage.querySelector('[data-login-step="credentials"]');
    const verificationStep = loginPage.querySelector('[data-login-step="verification"]');
    const signupStep = loginPage.querySelector("[data-signup-step]");

    function showLoginStep(step) {
        credentialsStep.hidden = step !== "credentials";
        verificationStep.hidden = step !== "verification";
        signupStep.hidden = step !== "signup";
        setAuthMessage("");
    }

    loginPage.querySelector("#password-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Checking your account details...", "info");
        const submitButton = event.submitter;
        submitButton.disabled = true;
        const identifier = event.currentTarget.elements.identifier.value.trim();
        const password = event.currentTarget.elements.password.value;

        try {
            const response = await fetch(`${API_ORIGIN}/api/auth/password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password })
            });
            const result = await response.json();

            if (!response.ok) {
                setAuthMessage(result.error || "Unable to sign in.");
                return;
            }

            loginPage.querySelector("#otp-email").value = result.email;
            loginPage.querySelector("[data-otp-destination]").textContent = result.maskedEmail;
            showLoginStep("verification");
            setAuthMessage("A verification code was sent to your email.", "success");
            loginPage.querySelector("#otp-token").focus();
        } catch {
            setAuthMessage("Unable to contact the login service. Please try again.");
        } finally {
            submitButton.disabled = false;
        }
    });

    loginPage.querySelector("#signup-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Creating your account...", "info");
        const form = event.currentTarget;
        const client = await getAuthClient();

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

    loginPage.querySelector("#otp-verify-form").addEventListener("submit", async event => {
        event.preventDefault();
        setAuthMessage("Verifying code...", "info");
        const form = event.currentTarget;
        const client = await getAuthClient();
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
            const client = await getAuthClient();
            const { error } = await client.auth.signInWithOAuth({
                provider: button.dataset.oauthProvider,
                options: {
                    redirectTo: `${window.location.origin}/login/?redirect=${encodeURIComponent(redirectTarget)}`
                }
            });

            if (error) setAuthMessage(error.message);
        });
    });

    loginPage.querySelector("[data-show-signup]").addEventListener("click", () => {
        showLoginStep("signup");
        loginPage.querySelector("#signup-username").focus();
    });

    loginPage.querySelectorAll("[data-back-to-login]").forEach(button => {
        button.addEventListener("click", () => showLoginStep("credentials"));
    });

    loginPage.querySelector("#sign-out").addEventListener("click", async () => {
        const client = await getAuthClient();
        const { error } = await client.auth.signOut();
        if (error) {
            setAuthMessage(error.message);
            return;
        }
        window.location.reload();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("[data-login-page], main[data-auth-required]")) {
        try {
            const client = await getAuthClient();
            await showAuthenticatedNavigation(client);
            client.auth.onAuthStateChange(() => {
                showAuthenticatedNavigation(client).catch(() => {});
            });
        } catch (error) {
            // Authentication remains optional outside gated/member pages.
            console.warn("Unable to update account navigation:", error);
        }
        return;
    }

    bindLoginPage();

    try {
        const client = await getAuthClient();
        await protectResourcePage();
        await showAuthenticatedNavigation(client);

        const loginPage = document.querySelector("[data-login-page]");
        const { data: { session } } = await client.auth.getSession();
        if (loginPage && session) {
            const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
            if (requestedRedirect) {
                window.location.assign(safeRedirect(requestedRedirect));
                return;
            }

            loginPage.querySelector("[data-signed-in]").hidden = false;
            loginPage.querySelector("[data-auth-forms]").hidden = true;
            loginPage.querySelector("[data-account-email]").textContent = session.user.email || "member";
        }

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
