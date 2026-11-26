# Authentication setup

The website uses Supabase Auth and runs the small server-side username endpoint on Vercel.

## Supabase project

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
3. Set **Site URL** to `https://tcpioneer.org`.
4. Add these redirect URLs:
   - `https://tcpioneer.org/login/`
   - `http://localhost:3000/login/` for local development, if used.
5. Enable the email provider and require email confirmation.
6. In **Authentication > URL Configuration**, keep leaked-password protection and appropriate rate limits enabled.

## Google and GitHub

Enable each provider in Supabase Authentication and add the provider Client ID and Client Secret from Google Cloud and GitHub.

Use the Supabase callback URL shown in the provider settings as the OAuth callback:

`https://YOUR_PROJECT.supabase.co/auth/v1/callback`

## Email OTP from Resend

The `tcpioneer.org` domain is already verified in Resend for this deployment. Create or rotate a Resend sending-only API key scoped to `tcpioneer.org`, then configure Supabase custom SMTP:

- Sender email: `no-reply@tcpioneer.org`
- Sender name: `TC Pioneer`
- SMTP host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend API key

The Supabase Magic link / OTP template for this project includes `{{ .Token }}`, so the six-digit code is sent in the email. Keep the Resend API key only in Supabase's encrypted SMTP settings; do not commit it.

## Vercel environment variables

Add these variables to Production, Preview, and Development as appropriate:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The anon key is used in the browser through `/api/config`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and never expose it in client code.

Deploy the repository from Vercel. The `/api/config` and `/api/auth/password` endpoints require Vercel serverless functions.

## Resource protection note

The Resources pages show content only after a valid Supabase session exists. Because this repository is still a static website, its public HTML and client-side resource links are not confidential storage. Put sensitive files or data behind an authenticated Vercel/Supabase endpoint instead.
