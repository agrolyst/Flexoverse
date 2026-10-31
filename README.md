# Flexoverse

Flexoverse is a responsive social app starter. It uses one `src/app.js` entry point for shared navigation and the Home, Friends, Reels, Chats, Notifications, Settings, and profile screens. Desktop, tablet, and mobile each have their own layout.

## Run locally

1. Install Node.js (LTS).
2. In this folder, run `npm install` and `npm run dev`.
3. `.env.local` is configured for the Flexoverse Supabase project on this machine. For another environment, copy `.env.example` to `.env.local` and set the project URL and publishable key.
4. Use a deployment host with SPA rewrites enabled for clean profile links such as `/theirusername`. Vercel and Netlify rewrite configuration is included.

## Deploy on Render

Create the site from this repository using the `render.yaml` Blueprint, or set the Static Site Build Command to `npm install && npm run build` and Publish Directory to `dist`. The Blueprint also includes Supabase's public publishable key and the rewrite needed for `/username` pages.

The public publishable key is safe for frontend use when paired with row-level security. Never put a Supabase service-role or secret key in browser code or a public repository.

## Supabase

The `supabase/setup.sql` file documents the starter schema. It has already been applied to the connected Flexoverse project (`gkgjfbusdyiohiztwuec`). It creates profiles with unique lowercase usernames, public posts, likes, comments, friend requests, user blocks, conversations, and messages. Public tables have explicit Data API grants and row-level security policies. Message records are stored in Postgres, and Realtime is enabled for the messages table when available.

Usernames contain 3–30 letters or numbers. Numbers are optional; the database enforces uniqueness so a number is only needed when a preferred username is taken.

## Current scope

The Home feed, sign-in/sign-up form, username validation, and post creation connect to Supabase. Friends, Reels, Chat, Notifications, settings, and profile pages are currently interface previews; their persistence and production media upload are the next build steps. Chat messages are represented in the Supabase schema but the preview does not send or fetch them yet.

Subscription billing, business plans, verification review, public-profile Google indexing controls, and admin moderation still need their own implementation before launch.

