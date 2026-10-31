# Flexoverse

Flexoverse is a multi-page static social app. Home, Friends, Reels, Chats, Notifications, Settings, and Profile each have a separate HTML page. Shared navigation and behavior live in `assets/app.js`; shared responsive styling lives in `assets/site.css`.

## Pages

- `/` — Home feed and post composer
- `/create/` — dedicated page for writing and sharing a post
- `/login/` — standalone sign-in page
- `/signup/` — standalone account creation page
- `/complete-profile/` — optional profile setup after account creation; users can skip and complete it later
- `/friends/` — requests, suggestions, and friends
- `/reels/` — public reel feed with an immersive video viewer
- `/reels/create/` — short-video upload and caption page
- `/chats/` — direct-message inbox with live conversation updates
- `/notifications/` — friend-request and post-activity inbox
- `/settings/` — settings hub
- `/settings/profile/`, `/settings/privacy/`, `/settings/content/`, `/settings/notifications/`, `/settings/blocked/`, `/settings/security/`, `/settings/membership/`, `/settings/verification/`, `/settings/business/`, `/settings/appearance/`, `/settings/accessibility/`, `/settings/account/` — individual settings pages
- `/privacy/` — Privacy Policy draft
- `/terms/` — Terms & Policies draft
- `/how-it-works/` — product overview
- `/help/` and `/help/guides/<topic>/` — Help Center and individual how-to guides
- `/profile/?username=name` — public profile viewer
- `/username` — public profile route (the host must serve `profile/index.html` for unmatched username paths)

The pages are plain HTML and can be served as static files. The shared app script imports the Supabase browser client from a CDN and connects to the Flexoverse Supabase project. It uses the project's publishable key; no service-role key is included.

## Supabase status

The base database schema and row-level security policies are in `supabase/setup.sql`. `supabase/reels.sql`, `supabase/chat_notifications.sql`, `supabase/chat_notifications_security.sql`, `supabase/settings_preferences.sql`, and `supabase/profile_private_details.sql` are additive migrations for an existing project. These changes are applied to project `gkgjfbusdyiohiztwuec`. Optional address details live in a separate table with row-level security that limits reads and edits to the owning account. The Reels feed reads public reels from Supabase, stores videos in a private Storage bucket, and uses signed playback URLs. Members can upload MP4, WebM, or MOV videos up to 50 MB. Chats use private conversation rows, message read receipts, and Supabase Realtime. Notifications are recorded for friend requests, accepted requests, post likes, and comments, with recipient-only row policies. Notification preferences currently filter what appears in a member’s inbox; activity records may still be stored.

Profile visibility controls profile details. Posts have a separate public visibility flag, so a post marked public can remain viewable when its author’s profile is private. Subscription payments, storage upgrades, verification applications, and search engine indexing are not active yet. Privacy and Terms pages are drafts; the privacy/support contact email and final legal review are still needed before launch.

Usernames are lowercase letters and numbers, 3–30 characters. Numbers are optional and only needed when the preferred username is already taken.
