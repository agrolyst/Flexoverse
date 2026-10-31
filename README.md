# Flexoverse

Flexoverse is a multi-page static social app. Home, Friends, Reels, Chats, Notifications, Settings, and Profile each have a separate HTML page. Shared navigation and behavior live in `assets/app.js`; shared responsive styling lives in `assets/site.css`.

## Pages

- `/` — Home feed and post composer
- `/create/` — dedicated page for writing and sharing a post
- `/login/` — standalone sign-in page
- `/signup/` — standalone account creation page
- `/friends/` — requests, suggestions, and friends
- `/reels/` — public reel feed with an immersive video viewer
- `/reels/create/` — short-video upload and caption page
- `/chats/` — inbox and conversation layout
- `/notifications/` — activity list
- `/settings/` — account, privacy, and membership settings
- `/profile/?username=name` — public profile viewer
- `/username` — public profile route (the host must serve `profile/index.html` for unmatched username paths)

The pages are plain HTML and can be served as static files. The shared app script imports the Supabase browser client from a CDN and connects to the Flexoverse Supabase project. It uses the project's publishable key; no service-role key is included.

## Supabase status

The base database schema and row-level security policies are in `supabase/setup.sql`; `supabase/reels.sql` adds the private video bucket and reel table. Both are applied to project `gkgjfbusdyiohiztwuec`. The Reels feed reads public reels from Supabase, stores video files in a private Storage bucket, and uses time-limited signed links for playback. Members can upload MP4, WebM, or MOV videos up to 50 MB. The profile viewer shows posts, photos, and account information. Post creation, likes, comments, friend requests, public profile reads, and profile settings also use Supabase. Notifications remain a visual preview, and the chat screen still needs its live message queries and Realtime subscription connected.

Usernames are lowercase letters and numbers, 3–30 characters. Numbers are optional and only needed when the preferred username is already taken.
