# Flexoverse

Flexoverse is a multi-page static social app. Home, Friends, Reels, Chats, Notifications, Settings, and Profile each have a separate HTML page. Shared navigation and behavior live in `assets/app.js`; shared responsive styling lives in `assets/site.css`.

## Pages

- `/` — Home feed and post composer
- `/create/` — dedicated page for writing and sharing a post
- `/friends/` — requests, suggestions, and friends
- `/reels/` — full-height short-video preview
- `/chats/` — inbox and conversation layout
- `/notifications/` — activity list
- `/settings/` — account, privacy, and membership settings
- `/username` — public profile route (the host must serve `profile/index.html` for unmatched username paths)

The pages are plain HTML and can be served as static files. The shared app script imports the Supabase browser client from a CDN and connects to the Flexoverse Supabase project. It uses the project's publishable key; no service-role key is included.

## Supabase status

The database schema and row-level security policies are in `supabase/setup.sql` and have been applied to project `gkgjfbusdyiohiztwuec`. Sign-in, username availability, public profile reads, post creation, likes, friend requests, and profile settings use Supabase. Reels and notifications are visual previews, and the chat screen still needs its live message queries and Realtime subscription connected.

Usernames are lowercase letters and numbers, 3–30 characters. Numbers are optional and only needed when the preferred username is already taken.
