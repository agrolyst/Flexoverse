Flexoverse is a responsive social app starter built with Vite and Supabase.

It includes responsive Home, Friends, Reels, Chats, Notifications, Settings, and public profile screens, with one shared `src/app.js` app entry point. Usernames are unique, lowercase, 3–30 letters or numbers; numbers are optional unless a name is taken. Profile links use clean paths such as `/theirusername`.

The starter Supabase schema and setup steps are in `supabase/setup.sql` and `README.md`. Home feed auth and post creation connect to Supabase; Friends, Reels, Chats, Notifications, and settings are currently UI previews.

Install Node.js, then run `npm install` and `npm run dev`. Copy `.env.example` to `.env.local` and set your Supabase URL and publishable key. Never place a service-role or secret key in frontend code.