# 0Password

<img width="2400" height="1260" alt="0Password preview" src="https://github.com/user-attachments/assets/cc2d8253-c506-43b4-b72e-b9fff27e8ee6" />

A personal password manager built with Next.js. Save your credentials in a vault, with passwords encrypted in your browser before they reach the server.

## Features

- Add, edit, delete, and search saved credentials
- Generate strong passwords and copy them to your clipboard
- Lock and unlock your vault with a master password
- Automatically lock after 15 minutes of inactivity
- Reset your vault if you forget your master password
- Light and dark themes

## Built with

Next.js · React · TypeScript · Tailwind CSS · shadcn/ui · Clerk · Supabase · Web Crypto API

## Run locally

### 1. Install dependencies

```sh
bun install
```

### 2. Set up environment variables

Create a `.env.local` file:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
```

Keep this file private. Configure your Clerk webhook to send user events to `/api/webhooks/clerk`.

### 3. Set up the database

Run [`supabase/migrations/202610200001_vault_metadata.sql`](supabase/migrations/202610200001_vault_metadata.sql) once in the **Supabase SQL Editor**.

This migration requires the existing `users` and `vault_items` tables—it is not a complete fresh-database setup. When upgrading an existing app, back up the database and stop the old app before applying it.

### 4. Start the app

```sh
bun dev
```

Open [localhost:3000](http://localhost:3000), sign in, and create your vault with a master password of at least 12 characters.

## A note on security

Passwords are encrypted using AES-256-GCM. Your master password and encryption key stay in your browser, but **service names, usernames, and website URLs are not encrypted**.

If you forget your master password, you can reset the vault and start again. **Resetting permanently deletes all saved credentials—it does not recover them.**

This is a personal project, not an independently audited password manager.

## Checks

```sh
bun run lint
bun run typecheck
bun run test
bun run build
```

The test scripts currently require Node.js 24+.

Optional database tests: `bun run test:database` (requires local PostgreSQL tools; uses a temporary test database, not Supabase).
