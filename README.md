# 0Password

<img width="2400" height="1260" alt="og-image" src="https://github.com/user-attachments/assets/cc2d8253-c506-43b4-b72e-b9fff27e8ee6" />

A zero-knowledge, client-side encry
pted password manager built with Next.js.

## How it works

Your passwords are encrypted in the browser using AES-256-GCM before they ever reach the server. The master password never leaves your device — not even Anthropic we can read your vault.

- **PBKDF2** derives a strong encryption key from your master password (100,000 iterations)
- **AES-256-GCM** encrypts each password client-side before saving
- **IV** is randomly generated per entry and stored alongside the ciphertext
- **Zero-knowledge** — the server only ever sees encrypted data

## Tech Stack

- **Frontend** — Next.js 15, React 19, Tailwind CSS v4, shadcn/ui
- **Auth** — Clerk
- **Database** — Supabase (PostgreSQL)
- **Encryption** — Web Crypto API (native browser)

## Getting Started
```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
```

## Features

- Master password vault unlock with client-side key derivation
- Add, view, and search encrypted credentials
- Cryptographically secure password generator
- Favicon-based service icons
- Collapsible sidebar with search
